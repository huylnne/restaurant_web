/**
 * SERVICE KHÁCH HÀNG — hồ sơ, lịch sử đặt bàn, bàn hiện tại, đánh giá.
 * Ctrl+F: hồ sơ, profile, dashboard, bàn của tôi, lịch sử đặt bàn
 * Luồng demo: Phần 1 (hồ sơ), Phần 2 (dashboard), Phần 4 (my-table)
 */
const db = require("../models/db");
const User = db.User;
const { Order, OrderItem, MenuItem, Table, Payment, Review, Branch, OrderTable } = require("../models");
const { activeOrderStatusWhere } = require("../utils/orderStatus");
const { splitRestaurantAndBranch } = require("../utils/branchDisplay");
const { computeItemsTotal } = require("./bill.service");
const DEFAULT_AVATAR_URL =
  "https://tse3.mm.bing.net/th/id/OIP.aCwqDO1MIaS3qzA7DyFPdAHaHa?pid=Api&P=0&h=180";

/** [HỒ SƠ] Lấy thông tin cá nhân khách — trang /profile. Ctrl+F: getProfile */
exports.getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ["full_name", "avatar_url", "phone"],
  });
  if (!user) throw new Error("User không tồn tại");
  return {
    name: user.full_name,
    avatar: user.avatar_url || DEFAULT_AVATAR_URL,
    phone: user.phone,
  };
};

/** [HỒ SƠ] Cập nhật tên, SĐT, avatar. Ctrl+F: updateProfile */
exports.updateProfile = async (userId, data) => {
  const { full_name, phone, avatar_url } = data;
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User không tồn tại");

  user.full_name = full_name ?? user.full_name;
  user.phone = phone ?? user.phone;
  user.avatar_url = avatar_url !== undefined ? avatar_url : user.avatar_url;

  await user.save();
  return user;
};

/** [HỒ SƠ] Đổi mật khẩu (xác minh mật khẩu cũ). Ctrl+F: changePassword */
exports.changePassword = async (userId, currentPassword, newPassword) => {
  const bcrypt = require("bcrypt");
  const user = await User.findByPk(userId);
  if (!user) throw new Error("Người dùng không tồn tại");

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    throw new Error("Mật khẩu hiện tại không đúng");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password_hash = hashedPassword;
  await user.save();
  return true;
};

/** [LỊCH SỬ] Map order DB → DTO hiển thị dashboard (bill, bàn ghép). Ctrl+F: mapOrderForHistory */
function mapOrderForHistory(row, billTotals = null) {
  const json = row.toJSON ? row.toJSON() : row;
  const { restaurant_name, branch_display_name } = splitRestaurantAndBranch(json.Branch?.name);
  const linkedTables = (json.OrderTables || [])
    .map((link) => link.Table)
    .filter(Boolean)
    .map((t) => ({
      table_id: t.table_id,
      table_number: t.table_number,
      capacity: t.capacity,
      status: t.status,
    }));
  return {
    ...json,
    reservation_id: json.order_id,
    reservation_time: json.arrival_time,
    OrderItems: json.OrderItems || [],
    tables: linkedTables.length ? linkedTables : undefined,
    multiTable: linkedTables.length > 1,
    restaurant_name,
    branch_display_name,
    subtotal_before_discount: billTotals?.subtotalBeforeDiscount ?? 0,
    discount_total: billTotals?.discountTotal ?? 0,
    bill_total: billTotals?.totalAmount ?? 0,
    total_amount: billTotals?.totalAmount ?? 0,
    items: billTotals?.items ?? [],
  };
}

const reservationHistoryInclude = [
  {
    model: OrderItem,
    required: false,
    attributes: ["order_item_id", "item_id", "quantity", "price"],
    include: [{ model: MenuItem, attributes: ["name", "price", "sale_price"] }],
  },
  {
    model: Table,
    attributes: ["table_number", "capacity", "status"],
  },
  {
    model: OrderTable,
    required: false,
    include: [
      {
        model: Table,
        attributes: ["table_id", "table_number", "capacity", "status"],
      },
    ],
  },
  {
    model: Branch,
    attributes: ["branch_id", "name", "address"],
  },
  {
    model: Review,
    attributes: ["review_id", "rating", "comment", "created_at"],
    required: false,
  },
  {
    model: Payment,
    attributes: ["payment_id", "status", "method", "paid_at"],
    required: false,
  },
];

async function loadReservationOrdersForBill(userId, orderId) {
  const sessionOrderId = Number(orderId);
  if (!Number.isInteger(sessionOrderId) || sessionOrderId <= 0) {
    throw new Error("ORDER_ID_INVALID");
  }

  const order = await Order.findOne({
    where: {
      order_id: sessionOrderId,
      user_id: userId,
      order_type: "reservation",
    },
    include: reservationHistoryInclude,
  });
  if (!order) return null;

  const groupId = order.booking_group_id;
  if (!groupId) return [order];

  const groupOrders = await Order.findAll({
    where: {
      booking_group_id: groupId,
      user_id: userId,
      order_type: "reservation",
    },
    include: reservationHistoryInclude,
    order: [["order_id", "ASC"]],
  });

  return groupOrders.length ? groupOrders : [order];
}

/** [LỊCH SỬ] Load order + nhóm booking để xem chi tiết hóa đơn 1 lượt đặt. Ctrl+F: getReservationBill */
exports.getReservationBill = async (userId, orderId) => {
  const orders = await loadReservationOrdersForBill(userId, orderId);
  if (!orders?.length) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const primary = orders[0];
  const allItems = orders.flatMap((o) => o.OrderItems || []);
  const billTotals = await computeItemsTotal(allItems);
  const mapped = mapOrderForHistory(primary, billTotals);

  const groupTables = orders.flatMap((o) => {
    const json = o.toJSON ? o.toJSON() : o;
    const linked = (json.OrderTables || []).map((link) => link.Table).filter(Boolean);
    if (linked.length) return linked;
    return json.Table ? [json.Table] : [];
  });

  const uniqueTables = [...new Map(groupTables.map((t) => [t.table_id, t])).values()].sort(
    (a, b) => a.table_number - b.table_number
  );

  return {
    ...mapped,
    OrderItems: allItems,
    tables: uniqueTables.length ? uniqueTables : mapped.tables,
    groupTables: uniqueTables.length > 1 ? uniqueTables : undefined,
    groupOrderIds: orders.map((o) => o.order_id),
    multiTable: uniqueTables.length > 1 || orders.length > 1,
  };
};

/**
 * [DASHBOARD] Lịch sử tất cả lượt đặt bàn + món + thanh toán — /dashboard.
 * Luồng demo: Phần 2 — Bước 2.3, Phần 4 — Bước 4.5. Ctrl+F: getReservationsWithOrders
 */
exports.getReservationsWithOrders = async (userId) => {
  try {
    const orders = await Order.findAll({
      where: { user_id: userId, order_type: "reservation" },
      attributes: [
        "order_id",
        "arrival_time",
        "number_of_guests",
        "status",
        "table_id",
        "branch_id",
        "booking_group_id",
        "note",
        "order_type",
        "payment_status",
        "total_amount",
        "created_at",
      ],
      include: reservationHistoryInclude,
      order: [["arrival_time", "DESC"]],
    });

    const mapped = [];
    for (const order of orders) {
      const billTotals = await computeItemsTotal(order.OrderItems || []);
      mapped.push(mapOrderForHistory(order, billTotals));
    }
    return mapped;
  } catch (error) {
    console.error("Lỗi getReservationsWithOrders:", error);
    throw new Error("Không thể lấy lịch sử đặt bàn");
  }
};

const reviewService = require("./review.service");

/** [ĐÁNH GIÁ] Khách gửi đánh giá từ dashboard (đã đăng nhập). Ctrl+F: createReservationReview */
exports.createReservationReview = async (userId, body) => {
  return reviewService.createOrderReview({
    orderId: body.order_id || body.reservation_id,
    userId,
    rating: body.rating,
    comment: body.comment,
  });
};

/** [ĐÁNH GIÁ] Popup nhắc đánh giá sau khi ăn xong. Ctrl+F: getPendingReview */
exports.getPendingReview = async (userId) => reviewService.getPendingReviewForUser(userId);

/**
 * [BÀN CỦA TÔI] Phiên đang phục vụ của khách — trang /my-table (món, tiến độ bếp).
 * Luồng demo: Phần 4 — Bước 4.1. Ctrl+F: getCurrentTableSession, my-table
 */
exports.getCurrentTableSession = async (userId) => {
  try {
    const order = await Order.findOne({
      where: {
        user_id: userId,
        status: activeOrderStatusWhere(),
      },
      attributes: [
        "order_id",
        "arrival_time",
        "number_of_guests",
        "status",
        "table_id",
        "branch_id",
        "order_type",
        "payment_status",
        "total_amount",
        "created_at",
      ],
      include: [
        {
          model: Table,
          attributes: ["table_number", "capacity", "status"],
        },
        {
          model: OrderItem,
          required: false,
          include: [{ model: MenuItem, attributes: ["name", "price"] }],
        },
      ],
      order: [["arrival_time", "DESC"]],
    });

    if (!order) return null;

    if (order.Table && order.Table.status === "available") {
      const arrival = new Date(order.arrival_time);
      const isFuture = arrival > new Date();
      if (!isFuture) return null;
    }

    const json = order.toJSON();
    return {
      ...json,
      reservation_id: json.order_id,
      reservation_time: json.arrival_time,
      Orders: [{ ...json, OrderItems: json.OrderItems || [] }],
      order: json,
    };
  } catch (error) {
    console.error("Lỗi getCurrentTableSession:", error);
    throw new Error("Không thể lấy thông tin bàn hiện tại");
  }
};
