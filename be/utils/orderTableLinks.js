/**
 * UTIL ORDER TABLE LINKS — xử lý bàn chính + nhiều bàn ghép qua bảng order_tables.
 * Ctrl+F: order table links, ghép bàn, OrderTable, findActiveOrderByTableId
 * Dùng bởi: đặt bàn ghép, check-in, bill, QR, realtime payload.
 */
const { Order, OrderTable, Table } = require("../models");
const { Op, Sequelize } = require("sequelize");
const { activeOrderStatusWhere } = require("./orderStatus");

/** [ĐẶT BÀN] Các loại order có thể chiếm lịch bàn và gây conflict. Ctrl+F: BOOKING_ORDER_TYPES */
const BOOKING_ORDER_TYPES = ["reservation", "walk_in"];
const ACTIVE_CONFLICT_STATUSES = { [Op.notIn]: ["cancelled", "completed", "no_show"] };

/**
 * [TRÙNG LỊCH BÀN] Where query tìm order trùng khung giờ: arrival_time < requestEnd và expected_end > requestStart.
 * Ctrl+F: buildBookingConflictWhere, conflict, expected_end_time
 */
function buildBookingConflictWhere(branch_id, windowStart, windowEnd) {
  // Khung giờ khách muốn đặt: [requestStart, requestEnd).
  const requestStart = new Date(windowStart);
  const requestEnd = new Date(windowEnd);
  return {
    branch_id, // chỉ xét trong cùng chi nhánh
    order_type: { [Op.in]: BOOKING_ORDER_TYPES }, // chỉ đơn đặt bàn / walk-in mới chiếm lịch
    status: ACTIVE_CONFLICT_STATUSES, // bỏ qua đơn đã hủy/hoàn tất/no-show
    // Điều kiện overlap 2 khoảng thời gian: (A_start < B_end) VÀ (A_end > B_start).
    [Op.and]: [
      // Giờ đến của đơn cũ < giờ kết thúc mong muốn của đơn mới.
      { arrival_time: { [Op.lt]: requestEnd } },
      // Giờ kết thúc của đơn cũ > giờ bắt đầu của đơn mới.
      // Nếu expected_end_time null thì COALESCE lấy arrival_time + 2 giờ (buffer giữ bàn mặc định).
      Sequelize.where(
        Sequelize.fn(
          "COALESCE",
          Sequelize.col("expected_end_time"),
          Sequelize.literal(`"Order"."arrival_time" + interval '2 hour'`)
        ),
        Op.gt,
        requestStart
      ),
    ],
  };
}

/** [GHÉP BÀN] Link một order với nhiều bàn; bàn đầu là primary. Ctrl+F: linkTablesToOrder */
async function linkTablesToOrder(orderId, tables, { transaction } = {}) {
  // Không có bàn nào thì không cần tạo liên kết.
  if (!tables?.length) return;
  // Tạo mỗi dòng order_tables: bàn đầu tiên (idx===0) là bàn CHÍNH (is_primary).
  // table.table_id ?? table: cho phép truyền vào object Table hoặc thẳng id.
  const rows = tables.map((table, idx) => ({
    order_id: orderId,
    table_id: table.table_id ?? table,
    is_primary: idx === 0,
  }));
  // bulkCreate 1 lần cho nhanh; ignoreDuplicates để chạy lại không bị lỗi khóa trùng.
  await OrderTable.bulkCreate(rows, { transaction, ignoreDuplicates: true });
}

/** [GHÉP BÀN] Lấy table_id của order, ưu tiên order_tables, fallback orders.table_id. Ctrl+F: getTableIdsForOrder */
async function getTableIdsForOrder(orderId, { transaction } = {}) {
  // Ưu tiên lấy từ bảng ghép order_tables; sắp is_primary DESC để bàn chính đứng đầu.
  const links = await OrderTable.findAll({
    where: { order_id: orderId },
    attributes: ["table_id"],
    order: [
      ["is_primary", "DESC"],
      ["table_id", "ASC"],
    ],
    transaction,
  });
  if (links.length) return links.map((l) => l.table_id);

  // Fallback: đơn cũ chưa có bản ghi ghép bàn → lấy table_id trực tiếp trên orders.
  const order = await Order.findByPk(orderId, { attributes: ["table_id"], transaction });
  return order?.table_id ? [order.table_id] : [];
}

/** [GHÉP BÀN] Lấy object Table đầy đủ cho order ghép bàn. Ctrl+F: getTablesForOrder */
async function getTablesForOrder(orderId, { transaction } = {}) {
  const tableIds = await getTableIdsForOrder(orderId, { transaction });
  if (!tableIds.length) return [];
  return Table.findAll({
    where: { table_id: { [Op.in]: tableIds } },
    attributes: ["table_id", "table_number", "capacity", "status", "branch_id"],
    order: [["table_number", "ASC"]],
    transaction,
  });
}

/** [ĐẶT BÀN] Lấy tất cả bàn bị conflict trong slot, gồm bàn chính và bàn link. Ctrl+F: getConflictTableIds */
async function getConflictTableIds(branch_id, windowStart, windowEnd, { transaction } = {}) {
  // Tìm mọi order bị trùng khung giờ trong chi nhánh.
  const where = buildBookingConflictWhere(branch_id, windowStart, windowEnd);
  const orders = await Order.findAll({
    where,
    attributes: ["order_id", "table_id"],
    transaction,
  });
  const orderIds = orders.map((o) => o.order_id);
  // Set để tự khử trùng lặp table_id; bỏ giá trị falsy (null).
  const ids = new Set(orders.map((o) => o.table_id).filter(Boolean));

  // Gom thêm các bàn GHÉP của những order trùng đó (bàn không nằm ở orders.table_id).
  if (orderIds.length) {
    const links = await OrderTable.findAll({
      where: { order_id: { [Op.in]: orderIds } },
      attributes: ["table_id"],
      transaction,
    });
    for (const link of links) {
      if (link.table_id) ids.add(link.table_id);
    }
  }

  // Trả về mảng id các bàn đang bận trong khung giờ đó.
  return [...ids];
}

/** [ĐẶT BÀN] Kiểm tra một bàn có order overlap trực tiếp hoặc qua order_tables. Ctrl+F: hasOverlappingBooking */
async function hasOverlappingBooking(
  table_id,
  branch_id,
  windowStart,
  windowEnd,
  { transaction } = {}
) {
  const where = buildBookingConflictWhere(branch_id, windowStart, windowEnd);

  // Cách 1: bàn là bàn CHÍNH của một order trùng giờ (orders.table_id === table_id).
  const direct = await Order.findOne({ where: { ...where, table_id }, transaction });
  if (direct) return true;

  // Cách 2: bàn là bàn GHÉP của một order trùng giờ (qua bảng order_tables).
  // required:true để chỉ tính khi order liên kết cũng thỏa điều kiện trùng giờ.
  const viaLink = await OrderTable.findOne({
    where: { table_id },
    include: [{ model: Order, where, required: true }],
    transaction,
  });
  return Boolean(viaLink);
}

/**
 * [PHIÊN BÀN] Tìm order active theo table_id, hỗ trợ cả order ghép bàn trong order_tables.
 * Ctrl+F: findActiveOrderByTableId, active order by table
 */
async function findActiveOrderByTableId(tableId, { itemInclude, transaction } = {}) {
  // Điều kiện status "còn sống" (pending..waiting_payment).
  const statusWhere = activeOrderStatusWhere();
  // itemInclude (tùy chọn) cho phép nạp kèm danh sách món của order.
  const include = itemInclude ? [itemInclude] : [];

  // Bước 1: tìm order active qua bảng ghép order_tables (hỗ trợ bàn ghép), order_id mới nhất trước.
  const link = await OrderTable.findOne({
    where: { table_id: tableId },
    include: [
      {
        model: Order,
        where: { status: statusWhere },
        include,
        required: true,
      },
    ],
    order: [["order_id", "DESC"]],
    transaction,
  });
  if (link?.Order) {
    const order = link.Order;
    // Nếu không cần món, hoặc order đã có món → dùng luôn kết quả này.
    if (!itemInclude || (order.OrderItems || []).length > 0) return order;
  }

  // Bước 2: fallback tìm trực tiếp trên orders theo table_id (đơn cũ chưa có bản ghi ghép bàn).
  const orders = await Order.findAll({
    where: { table_id: tableId, status: statusWhere },
    include,
    order: [["created_at", "DESC"]],
    transaction,
  });
  // Không có order trực tiếp → dùng tạm kết quả từ bước 1 (nếu có).
  if (!orders.length) return link?.Order || null;

  // Nếu cần món: ưu tiên order nào ĐÃ có món; nếu không thì lấy order mới nhất.
  const orderWithItems = itemInclude
    ? orders.find((order) => (order.OrderItems || []).length > 0)
    : null;
  return orderWithItems || orders[0] || link?.Order || null;
}

/** [GHÉP BÀN] Kiểm tra order có nhiều hơn một bàn không. Ctrl+F: orderHasMultipleTables */
async function orderHasMultipleTables(orderId, { transaction } = {}) {
  const count = await OrderTable.count({ where: { order_id: orderId }, transaction });
  return count > 1;
}

/** [HIỂN THỊ BÀN] Số bàn hiển thị từ order (ưu tiên order_tables, fallback bàn chính). Ctrl+F: resolveOrderTableNumbersFromPlain */
function resolveOrderTableNumbersFromPlain(order) {
  if (!order) {
    return {
      table_id: null,
      table_ids: [],
      table_number: null,
      table_numbers: [],
      table_label: null,
    };
  }

  // Lấy các bàn từ quan hệ ghép (order.OrderTables), bỏ bản ghi thiếu số bàn.
  const linkedTables = (order.OrderTables || [])
    .map((link) => link.Table)
    .filter((t) => t && t.table_number != null);

  // Ưu tiên danh sách bàn ghép; nếu không có thì fallback về bàn chính order.Table.
  let tables = linkedTables.length > 0 ? linkedTables : [];
  if (!tables.length && order.Table) {
    tables = [order.Table];
  }

  // Sắp theo số bàn để hiển thị nhất quán.
  tables = [...tables].sort((a, b) => (a.table_number ?? 0) - (b.table_number ?? 0));
  const table_numbers = tables.map((t) => t.table_number);
  const table_ids = tables.map((t) => t.table_id);
  // Bàn "chính": khớp orders.table_id, không có thì lấy bàn đầu tiên.
  const primary =
    tables.find((t) => t.table_id === order.table_id) || tables[0] || null;

  return {
    table_id: primary?.table_id ?? order.table_id ?? null,
    table_ids,
    table_number: primary?.table_number ?? null,
    table_numbers,
    // Nhãn gộp dạng "1, 2, 3" cho UI; rỗng thì null.
    table_label: table_numbers.length ? table_numbers.join(", ") : null,
  };
}

/** [REALTIME] Payload bàn chuẩn cho WebSocket khi bếp/phục vụ cập nhật. Ctrl+F: buildRealtimeTablePayload */
function buildRealtimeTablePayload(order) {
  const plain = order?.toJSON ? order.toJSON() : order;
  const info = resolveOrderTableNumbersFromPlain(plain);
  return {
    table_id: info.table_id,
    table_ids: info.table_ids,
    table_number: info.table_number,
    table_numbers: info.table_numbers,
    table_label: info.table_label,
  };
}

module.exports = {
  BOOKING_ORDER_TYPES,
  linkTablesToOrder,
  getTableIdsForOrder,
  getTablesForOrder,
  getConflictTableIds,
  hasOverlappingBooking,
  findActiveOrderByTableId,
  orderHasMultipleTables,
  resolveOrderTableNumbersFromPlain,
  buildRealtimeTablePayload,
};
