/**
 * SERVICE TÍNH BILL — hóa đơn tạm tính, tổng tiền món đã gọi (có giảm giá sale_price).
 * Ctrl+F: bill, hóa đơn, tạm tính, total_amount, buildBill
 * Luồng demo: Phần 4 — QR /t/{token}, Bàn của tôi, dialog thanh toán
 */
const { Order, OrderItem, MenuItem, Table } = require("../models");
const { Op } = require("sequelize");
const { activeOrderStatusWhere } = require("../utils/orderStatus");
const { resolveMenuItemUnitPrice } = require("../utils/menuItemPrice");
const {
  findActiveOrderByTableId,
  getTablesForOrder,
  orderHasMultipleTables,
} = require("../utils/orderTableLinks");

const orderItemInclude = {
  model: OrderItem,
  required: false,
  include: [{ model: MenuItem, attributes: ["item_id", "name", "price", "sale_price"] }],
};

/** [BILL] Order chính để tính tiền khi ghép nhóm booking_group. Ctrl+F: resolvePrimaryBillingOrder */
async function resolvePrimaryBillingOrder(orderOrId) {
  // Nhận vào object order sẵn, hoặc chỉ là id → tự load từ DB.
  const order =
    typeof orderOrId === "object" && orderOrId?.order_id
      ? orderOrId
      : await Order.findByPk(orderOrId, {
          attributes: ["order_id", "table_id", "booking_group_id"],
        });
  if (!order) return null;
  // Không thuộc nhóm đặt → chính nó là order tính tiền.
  if (!order.booking_group_id) return order;

  // Thuộc nhóm → lấy order đầu nhóm làm order đại diện tính tiền.
  const groupOrders = await findGroupSessionOrders(order);
  return groupOrders[0] || order;
}

async function findGroupSessionOrders(sessionOrder) {
  const groupId = sessionOrder?.booking_group_id;
  if (!groupId) return [sessionOrder];

  const groupOrders = await Order.findAll({
    where: {
      booking_group_id: groupId,
      status: activeOrderStatusWhere(),
    },
    include: [orderItemInclude],
    order: [["order_id", "ASC"]],
  });

  return groupOrders.length ? groupOrders : [sessionOrder];
}

function collectOrderItems(orders) {
  return (orders || []).flatMap((o) => o.OrderItems || []);
}

/**
 * [BÀN CỦA TÔI] Tìm phiên đang phục vụ của khách đăng nhập — trang /my-table.
 * Ctrl+F: findActiveOrderByUser, getCurrentTableSession, bàn của tôi
 */
async function findActiveOrderByUser(userId) {
  const orders = await Order.findAll({
    where: {
      user_id: userId,
      status: activeOrderStatusWhere(),
    },
    include: [
      {
        model: Table,
        required: false,
        attributes: ["table_id", "status", "table_number", "capacity"],
      },
      orderItemInclude,
    ],
    order: [["arrival_time", "DESC"]],
  });

  if (!orders.length) return null;

  // Ưu tiên order mà bàn đang thực sự phục vụ (bàn khác "available").
  const serving = orders.find((o) => o.Table && o.Table.status && o.Table.status !== "available");
  if (serving) return serving;

  // Không có bàn nào đang phục vụ → lấy order theo giờ đến mới nhất.
  return orders[0];
}

/** [BILL] Tìm order active trên 1 bàn (theo table_id). Ctrl+F: findActiveOrderByTable */
async function findActiveOrderByTable(tableId) {
  return findActiveOrderByTableId(tableId, { itemInclude: orderItemInclude });
}

/** [BILL] Gộp order_items, tính subtotal/discount/total (sale_price). Ctrl+F: computeItemsTotal */
async function computeItemsTotal(orderItems) {
  const aggregated = {}; // gom món trùng (cùng id + cùng đơn giá) lại thành 1 dòng
  let totalAmount = 0; // tổng phải trả (sau giảm giá)
  let subtotalBeforeDiscount = 0; // tổng theo giá gốc (trước giảm)
  let discountTotal = 0; // tổng tiền được giảm

  (orderItems || []).forEach((oi) => {
    const menu = oi.MenuItem;
    if (!menu) return; // món không còn trong menu → bỏ qua

    const listPrice = Number(menu.price) || 0; // giá niêm yết hiện tại
    const saleUnitPrice = resolveMenuItemUnitPrice(menu); // giá sau khuyến mãi (nếu có)
    // Giá đã "chốt" lúc gọi món (nếu order_item lưu lại).
    const storedPrice =
      oi.price != null && oi.price !== "" ? Number(oi.price) : null;

    // Quyết định đơn giá thực tế của món:
    let unitPrice;
    if (storedPrice != null && storedPrice > 0) {
      // Có giá chốt: dùng giá chốt, TRỪ khi giá chốt là giá gốc mà hiện đang có sale rẻ hơn → dùng giá sale.
      unitPrice =
        listPrice > 0 && storedPrice >= listPrice && saleUnitPrice < listPrice
          ? saleUnitPrice
          : storedPrice;
    } else {
      // Không có giá chốt → dùng giá sale/hiện tại.
      unitPrice = saleUnitPrice;
    }

    const originalUnitPrice = listPrice || unitPrice; // giá gốc để tính phần được giảm
    // Key gom nhóm theo (món + đơn giá) — cùng món nhưng giá khác nhau vẫn tách dòng.
    const key = `${menu.item_id}:${unitPrice}`;

    if (!aggregated[key]) {
      aggregated[key] = {
        item_id: menu.item_id,
        name: menu.name,
        unit_price: unitPrice,
        original_unit_price: originalUnitPrice,
        quantity: 0,
      };
    }
    // Cộng dồn số lượng cho dòng này.
    aggregated[key].quantity += oi.quantity || 0;
  });

  // Tính thành tiền từng dòng và cộng vào các tổng.
  const items = Object.values(aggregated).map((it) => {
    const quantity = it.quantity;
    const lineTotal = it.unit_price * quantity; // thành tiền (sau giảm)
    const lineOriginalTotal = it.original_unit_price * quantity; // thành tiền (giá gốc)
    // Tiền giảm của dòng = chênh lệch giá gốc và giá bán (chỉ khi có giảm).
    const lineDiscount =
      it.original_unit_price > it.unit_price ? lineOriginalTotal - lineTotal : 0;

    totalAmount += lineTotal;
    subtotalBeforeDiscount += lineOriginalTotal;
    discountTotal += lineDiscount;

    return {
      item_id: it.item_id,
      name: it.name,
      unit_price: it.unit_price,
      original_unit_price: it.original_unit_price,
      quantity,
      line_total: lineTotal,
      line_discount: lineDiscount,
      has_discount: lineDiscount > 0,
    };
  });

  return {
    items,
    totalAmount,
    subtotalBeforeDiscount,
    discountTotal,
  };
}

/**
 * [BILL] Dựng object bill đầy đủ: bàn, món, tổng tiền — dùng QR, phục vụ, khách.
 * Ctrl+F: buildBill, bill tạm tính
 */
async function buildBill({ order, tableId }) {
  // Cần ít nhất order hoặc tableId để biết tính bill cho phiên nào.
  if (!order && !tableId) return null;

  // Nếu chỉ có tableId → tìm order đang active trên bàn đó.
  let sessionOrder = order;
  if (!sessionOrder && tableId) {
    sessionOrder = await findActiveOrderByTable(tableId);
  }
  if (!sessionOrder) return null;

  // Xác định bàn cần dựng bill.
  const table_id = tableId || sessionOrder.table_id;
  if (!table_id) return null;

  const table = await Table.findByPk(table_id);
  if (!table) return null;

  // Bàn trống mà không truyền order cụ thể → không có bill để hiển thị.
  if (table.status === "available" && !order) {
    return null;
  }

  // Đảm bảo order đã kèm danh sách món; chưa có thì nạp lại kèm OrderItems.
  if (!sessionOrder.OrderItems) {
    sessionOrder = await Order.findByPk(sessionOrder.order_id, {
      include: [orderItemInclude],
    });
  }

  // Lấy tất cả order trong cùng nhóm đặt (nếu có) → bill gộp cho bàn ghép.
  const groupOrders = await findGroupSessionOrders(sessionOrder);
  const primaryOrder = groupOrders[0] || sessionOrder; // order đại diện để tính tiền
  const linkedTables = await getTablesForOrder(primaryOrder.order_id);
  const groupTables =
    linkedTables.length > 1
      ? linkedTables
      : groupOrders.length > 1
        ? await Table.findAll({
            where: {
              table_id: {
                [Op.in]: [...new Set(groupOrders.map((o) => o.table_id).filter(Boolean))],
              },
            },
            attributes: ["table_id", "table_number", "capacity", "status"],
            order: [["table_number", "ASC"]],
          })
        : linkedTables.length
          ? linkedTables
          : [table];

  // Gom toàn bộ món: nhóm nhiều order thì nối món của tất cả, không thì lấy món của order hiện tại.
  const allItems =
    groupOrders.length > 1 ? collectOrderItems(groupOrders) : sessionOrder.OrderItems || [];
  // Tính tổng tiền/giảm giá từ danh sách món.
  const { items, totalAmount, subtotalBeforeDiscount, discountTotal } =
    await computeItemsTotal(allItems);

  // Đồng bộ total_amount xuống DB nếu lệch (để báo cáo/thanh toán dùng đúng số).
  const ordersToSync = groupOrders.length > 1 ? groupOrders : [sessionOrder];
  for (const groupOrder of ordersToSync) {
    if (Number(groupOrder.total_amount) !== totalAmount) {
      await groupOrder.update({ total_amount: totalAmount });
    }
  }

  const multiTable =
    groupOrders.length > 1 || (await orderHasMultipleTables(primaryOrder.order_id));

  return {
    table: {
      table_id: table.table_id,
      table_number: table.table_number,
      capacity: table.capacity,
      status: table.status,
    },
    tables: groupTables.map((t) => ({
      table_id: t.table_id,
      table_number: t.table_number,
      capacity: t.capacity,
      status: t.status,
    })),
    booking_group_id: primaryOrder.booking_group_id || null,
    multiTable,
    order: {
      order_id: primaryOrder.order_id,
      branch_id: primaryOrder.branch_id,
      arrival_time: primaryOrder.arrival_time,
      number_of_guests: primaryOrder.number_of_guests,
      status: primaryOrder.status,
      order_type: primaryOrder.order_type,
      payment_status: primaryOrder.payment_status,
    },
    reservation: {
      reservation_id: primaryOrder.order_id,
      reservation_time: primaryOrder.arrival_time,
      number_of_guests: primaryOrder.number_of_guests,
      status: primaryOrder.status,
    },
    items,
    subtotal_before_discount: subtotalBeforeDiscount,
    discount_total: discountTotal,
    total_amount: totalAmount,
  };
}

/** [BÀN CỦA TÔI] Bill cho khách đang ngồi bàn. Ctrl+F: getBillForUser */
async function getBillForUser(userId) {
  const order = await findActiveOrderByUser(userId);
  if (!order) return null;
  return buildBill({ order, tableId: null });
}

/** [QR BÀN] Bill theo table_id hoặc token QR. Ctrl+F: getBillByTable */
async function getBillByTable(tableId) {
  return buildBill({ order: null, tableId });
}

module.exports = {
  getBillForUser,
  getBillByTable,
  findActiveOrderByTable,
  findActiveOrderByUser,
  findGroupSessionOrders,
  resolvePrimaryBillingOrder,
  computeItemsTotal,
};
