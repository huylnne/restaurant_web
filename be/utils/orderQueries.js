const { Op } = require("sequelize");
const { OrderItem, MenuItem, Order, Table } = require("../models");
const {
  activeOrderStatusWhere,
  notTerminalOrderStatusWhere,
  ORDER_STATUS,
  normalizeOrderStatus,
} = require("./orderStatus");
const { ORDER_ITEM_STATUS } = require("./orderItemStatus");
const { KITCHEN_QUEUE_STATUSES } = require("./orderItemStatus");
const { resolveKitchenServeContext } = require("./kitchenQueue");

/** Chi nhánh của đơn: bàn trực tiếp → fallback menu */
function resolveOrderBranchId(plain) {
  return (
    plain.Order?.branch_id ??
    plain.Order?.Table?.branch_id ??
    plain.MenuItem?.branch_id ??
    null
  );
}

/** Include chuẩn: order → bàn */
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
      ],
    },
  ];
}

/**
 * Hàng đợi bếp: món pending/processing + đơn chưa đóng + đúng chi nhánh.
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

function mapKitchenItemRow(item) {
  const plain = item.toJSON();
  const order = plain.Order ?? null;
  const resolvedTable = order?.Table ?? null;
  const serve_context = resolveKitchenServeContext(order);

  return {
    ...plain,
    order_id: order?.order_id ?? plain.order_id,
    order_created_at: order?.created_at ?? null,
    table_id: resolvedTable?.table_id ?? order?.table_id ?? null,
    table_number: resolvedTable?.table_number ?? null,
    serve_context,
  };
}

/** Đơn phiên đang hoạt động theo bàn */
function buildActiveOrdersByTableWhere(table_id) {
  return {
    table_id,
    status: activeOrderStatusWhere(),
  };
}

/** Khi bếp bắt đầu làm món → đơn chuyển pre-ordered/confirmed → in_progress */
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
