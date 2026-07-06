/**
 * UTIL ORDER QUERIES — query dùng chung cho bếp/phục vụ để lấy món, bàn, chi nhánh, sync status order.
 * Ctrl+F: order queries, findKitchenOrderItems, syncOrderStatusFromItems, orderTableInclude
 * Luồng demo: Phần 3 — bếp realtime và phục vụ đánh dấu món.
 */
const { Op } = require("sequelize");
const { OrderItem, MenuItem, Order, Table, OrderTable } = require("../models");
const { resolveOrderTableNumbersFromPlain } = require("./orderTableLinks");
const {
  activeOrderStatusWhere,
  notTerminalOrderStatusWhere,
  ORDER_STATUS,
  normalizeOrderStatus,
} = require("./orderStatus");
const { ORDER_ITEM_STATUS } = require("./orderItemStatus");
const { KITCHEN_QUEUE_STATUSES } = require("./orderItemStatus");
const { resolveKitchenServeContext } = require("./kitchenQueue");

/** [CHI NHÁNH] Resolve branch của món/order: order.branch_id → table.branch_id → menu.branch_id. Ctrl+F: resolveOrderBranchId */
function resolveOrderBranchId(plain) {
  return (
    plain.Order?.branch_id ??
    plain.Order?.Table?.branch_id ??
    plain.MenuItem?.branch_id ??
    null
  );
}

/** [QUERY BẾP] Include chuẩn: OrderItem → Order → Table/OrderTable để biết món thuộc bàn nào. Ctrl+F: orderTableInclude */
function orderTableInclude() {
  return [
    {
      model: Order,
      attributes: [
        "order_id",
        "table_id",
        "branch_id",
        "status",
        "arrival_time",
        "number_of_guests",
        "order_type",
        "booking_group_id",
        "created_at",
      ],
      required: true,
      where: { status: notTerminalOrderStatusWhere() },
      include: [
        {
          model: Table,
          attributes: ["table_id", "table_number", "branch_id"],
          required: false,
        },
        {
          model: OrderTable,
          attributes: ["table_id", "is_primary"],
          required: false,
          include: [
            {
              model: Table,
              attributes: ["table_id", "table_number", "branch_id"],
              required: false,
            },
          ],
        },
      ],
    },
  ];
}

/**
 * [BẾP] Hàng đợi bếp: món pending/processing + đơn chưa đóng + đúng chi nhánh.
 * Ctrl+F: findKitchenOrderItems, hàng đợi bếp
 */
async function findKitchenOrderItems({ itemStatus, branchId = 1 }) {
  const statuses = itemStatus
    ? [String(itemStatus).trim().toLowerCase()]
    : KITCHEN_QUEUE_STATUSES;
  const bid = Number(branchId);

  const items = await OrderItem.findAll({
    where: { status: { [Op.in]: statuses } },
    include: [
      {
        model: MenuItem,
        attributes: ["item_id", "name", "price", "category", "branch_id"],
        required: true,
      },
      ...orderTableInclude(),
    ],
    order: [["order_item_id", "ASC"]],
  });

  return items
    .filter((item) => Number(resolveOrderBranchId(item.toJSON())) === bid)
    .map(mapKitchenItemRow);
}

/** [BẾP] Map OrderItem DB thành row có table_label, serve_context để UI bếp render. Ctrl+F: mapKitchenItemRow */
function mapKitchenItemRow(item) {
  const plain = item.toJSON();
  const order = plain.Order ?? null;
  const tableInfo = resolveOrderTableNumbersFromPlain(order);
  const serve_context = resolveKitchenServeContext(order);
  const ordered_at = plain.ordered_at ?? order?.created_at ?? null;

  return {
    ...plain,
    ordered_at,
    order_id: order?.order_id ?? plain.order_id,
    order_created_at: ordered_at,
    table_id: tableInfo.table_id,
    table_number: tableInfo.table_number,
    table_numbers: tableInfo.table_numbers,
    table_label: tableInfo.table_label,
    serve_context,
  };
}

/** [PHIÊN BÀN] Where order active theo bàn, dùng ở sơ đồ bàn/phục vụ. Ctrl+F: buildActiveOrdersByTableWhere */
function buildActiveOrdersByTableWhere(table_id) {
  return {
    table_id,
    status: activeOrderStatusWhere(),
  };
}

/**
 * [BẾP] Khi bếp bắt đầu làm món → đơn chuyển pre-ordered/confirmed/pending → in_progress.
 * Ctrl+F: syncOrderStatusFromItems, sync order status
 */
async function syncOrderStatusFromItems(orderId, { transaction } = {}) {
  if (!orderId) return;
  const order = await Order.findByPk(orderId, { transaction });
  if (!order) return;

  const normalized = normalizeOrderStatus(order.status);
  if (normalized === ORDER_STATUS.COMPLETED || normalized === ORDER_STATUS.CANCELLED) {
    return;
  }

  const items = await OrderItem.findAll({
    where: { order_id: orderId },
    attributes: ["status"],
    transaction,
  });
  if (!items.length) return;

  const hasProcessing = items.some(
    (i) => String(i.status).toLowerCase() === ORDER_ITEM_STATUS.PROCESSING
  );
  const allTerminal = items.every((i) =>
    ["done", "served"].includes(String(i.status).toLowerCase())
  );

  let next = order.status;
  if (
    hasProcessing &&
    [ORDER_STATUS.PRE_ORDERED, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PENDING].includes(normalized)
  ) {
    next = ORDER_STATUS.IN_PROGRESS;
  } else if (
    allTerminal &&
    [ORDER_STATUS.PRE_ORDERED, ORDER_STATUS.CONFIRMED, ORDER_STATUS.IN_PROGRESS].includes(
      normalized
    )
  ) {
    next = ORDER_STATUS.IN_PROGRESS;
  }

  if (next !== order.status) {
    await order.update({ status: next }, { transaction });
  }
}

module.exports = {
  orderTableInclude,
  resolveOrderBranchId,
  findKitchenOrderItems,
  mapKitchenItemRow,
  buildActiveOrdersByTableWhere,
  syncOrderStatusFromItems,
};
