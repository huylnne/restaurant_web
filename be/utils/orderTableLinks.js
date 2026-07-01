const { Order, OrderTable, Table } = require("../models");
const { Op, Sequelize } = require("sequelize");
const { activeOrderStatusWhere } = require("./orderStatus");

const BOOKING_ORDER_TYPES = ["reservation", "walk_in"];
const ACTIVE_CONFLICT_STATUSES = { [Op.notIn]: ["cancelled", "completed", "no_show"] };

function buildBookingConflictWhere(branch_id, windowStart, windowEnd) {
  const requestStart = new Date(windowStart);
  const requestEnd = new Date(windowEnd);
  return {
    branch_id,
    order_type: { [Op.in]: BOOKING_ORDER_TYPES },
    status: ACTIVE_CONFLICT_STATUSES,
    [Op.and]: [
      { arrival_time: { [Op.lt]: requestEnd } },
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

async function linkTablesToOrder(orderId, tables, { transaction } = {}) {
  if (!tables?.length) return;
  const rows = tables.map((table, idx) => ({
    order_id: orderId,
    table_id: table.table_id ?? table,
    is_primary: idx === 0,
  }));
  await OrderTable.bulkCreate(rows, { transaction, ignoreDuplicates: true });
}

async function getTableIdsForOrder(orderId, { transaction } = {}) {
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

  const order = await Order.findByPk(orderId, { attributes: ["table_id"], transaction });
  return order?.table_id ? [order.table_id] : [];
}

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

async function getConflictTableIds(branch_id, windowStart, windowEnd, { transaction } = {}) {
  const where = buildBookingConflictWhere(branch_id, windowStart, windowEnd);
  const orders = await Order.findAll({
    where,
    attributes: ["order_id", "table_id"],
    transaction,
  });
  const orderIds = orders.map((o) => o.order_id);
  const ids = new Set(orders.map((o) => o.table_id).filter(Boolean));

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

  return [...ids];
}

async function hasOverlappingBooking(
  table_id,
  branch_id,
  windowStart,
  windowEnd,
  { transaction } = {}
) {
  const where = buildBookingConflictWhere(branch_id, windowStart, windowEnd);

  const direct = await Order.findOne({ where: { ...where, table_id }, transaction });
  if (direct) return true;

  const viaLink = await OrderTable.findOne({
    where: { table_id },
    include: [{ model: Order, where, required: true }],
    transaction,
  });
  return Boolean(viaLink);
}

async function findActiveOrderByTableId(tableId, { itemInclude, transaction } = {}) {
  const statusWhere = activeOrderStatusWhere();
  const include = itemInclude ? [itemInclude] : [];

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
    if (!itemInclude || (order.OrderItems || []).length > 0) return order;
  }

  const orders = await Order.findAll({
    where: { table_id: tableId, status: statusWhere },
    include,
    order: [["created_at", "DESC"]],
    transaction,
  });
  if (!orders.length) return link?.Order || null;

  const orderWithItems = itemInclude
    ? orders.find((order) => (order.OrderItems || []).length > 0)
    : null;
  return orderWithItems || orders[0] || link?.Order || null;
}

async function orderHasMultipleTables(orderId, { transaction } = {}) {
  const count = await OrderTable.count({ where: { order_id: orderId }, transaction });
  return count > 1;
}

/** Số bàn hiển thị từ order (ưu tiên order_tables, fallback bàn chính). */
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

  const linkedTables = (order.OrderTables || [])
    .map((link) => link.Table)
    .filter((t) => t && t.table_number != null);

  let tables = linkedTables.length > 0 ? linkedTables : [];
  if (!tables.length && order.Table) {
    tables = [order.Table];
  }

  tables = [...tables].sort((a, b) => (a.table_number ?? 0) - (b.table_number ?? 0));
  const table_numbers = tables.map((t) => t.table_number);
  const table_ids = tables.map((t) => t.table_id);
  const primary =
    tables.find((t) => t.table_id === order.table_id) || tables[0] || null;

  return {
    table_id: primary?.table_id ?? order.table_id ?? null,
    table_ids,
    table_number: primary?.table_number ?? null,
    table_numbers,
    table_label: table_numbers.length ? table_numbers.join(", ") : null,
  };
}

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
