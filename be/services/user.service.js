const db = require("../models/db");
const User = db.User;
const { Order, OrderItem, MenuItem, Table, Payment, Review, Branch, OrderTable } = require("../models");
const { activeOrderStatusWhere } = require("../utils/orderStatus");
const { splitRestaurantAndBranch } = require("../utils/branchDisplay");
const { computeItemsTotal } = require("./bill.service");
const DEFAULT_AVATAR_URL =
  "https://tse3.mm.bing.net/th/id/OIP.aCwqDO1MIaS3qzA7DyFPdAHaHa?pid=Api&P=0&h=180";

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
  };
}

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
      include: [
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
      ],
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

exports.createReservationReview = async (userId, { order_id, reservation_id, rating, comment }) => {
  const sessionOrderId = Number(order_id || reservation_id);
  const normalizedRating = Number(rating);
  const normalizedComment = String(comment || "").trim();

  if (!Number.isInteger(sessionOrderId) || sessionOrderId <= 0) {
    throw new Error("ORDER_ID_INVALID");
  }
  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw new Error("RATING_INVALID");
  }
  if (!normalizedComment || normalizedComment.length < 5) {
    throw new Error("COMMENT_TOO_SHORT");
  }
  if (normalizedComment.length > 1000) {
    throw new Error("COMMENT_TOO_LONG");
  }

  const order = await Order.findOne({
    where: { order_id: sessionOrderId, user_id: userId },
    attributes: ["order_id", "user_id", "status", "payment_status"],
  });
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const existing = await Review.findOne({
    where: { order_id: sessionOrderId },
    attributes: ["review_id"],
  });
  if (existing) {
    throw new Error("REVIEW_ALREADY_EXISTS");
  }

  const isCompleted = String(order.status || "").toLowerCase() === "completed";
  const payment = await Payment.findOne({
    where: { order_id: sessionOrderId, status: "succeeded" },
    attributes: ["payment_id"],
  });
  const isPaid = order.payment_status === "succeeded" || !!payment;

  if (!isCompleted && !isPaid) {
    throw new Error("REVIEW_NOT_ALLOWED");
  }

  try {
    const review = await Review.create({
      order_id: sessionOrderId,
      user_id: userId,
      rating: normalizedRating,
      comment: normalizedComment,
      created_at: new Date(),
    });

    return review;
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      throw new Error("REVIEW_ALREADY_EXISTS");
    }
    throw error;
  }
};

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
