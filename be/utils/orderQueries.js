const { Op } = require("sequelize");
const { OrderItem, MenuItem, Order, Table, Reservation } = require("../models");
const {
  activeOrderStatusWhere,
  notTerminalOrderStatusWhere,
  ORDER_STATUS,
  normalizeOrderStatus,
} = require("./orderStatus");
const { ORDER_ITEM_STATUS } = require("./orderItemStatus");
const { KITCHEN_QUEUE_STATUSES } = require("./orderItemStatus");

/** Chi nhánh của đơn: reservation → bàn (trực tiếp / qua reservation) → fallback menu */
function resolveOrderBranchId(plain) {
  return (
    plain.Order?.Reservation?.branch_id ??
    plain.Order?.Table?.branch_id ??
    plain.Order?.Reservation?.Table?.branch_id ??
    plain.MenuItem?.branch_id ??
    null
  );
}

/** Include chuẩn: order → bàn (trực tiếp hoặc qua reservation) */
function orderTableInclude() {
  return [
    {
      model: Order,
      attributes: ["order_id", "table_id", "reservation_id", "status"],
      required: true,
      where: { status: notTerminalOrderStatusWhere() },
      include: [
        {
          model: Table,
          attributes: ["table_id", "table_number", "branch_id"],
          required: false,
        },
        {
          model: Reservation,
          attributes: ["reservation_id", "table_id", "branch_id"],
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
  const directTable = plain.Order?.Table;
  const reservationTable = plain.Order?.Reservation?.Table;
  const resolvedTable = directTable || reservationTable || null;

  return {
    ...plain,
    table_id:
      resolvedTable?.table_id ??
      plain.Order?.table_id ??
      plain.Order?.Reservation?.table_id ??
      null,
    table_number: resolvedTable?.table_number ?? null,
  };
}

/**
 * Đơn đang hoạt động theo bàn (waiter / admin tables).
 */
function buildActiveOrdersByTableWhere(table_id, reservationIds = []) {
  const where = { status: activeOrderStatusWhere() };
  if (reservationIds.length > 0) {
    where[Op.or] = [{ table_id }, { reservation_id: { [Op.in]: reservationIds } }];
  } else {
    where.table_id = table_id;
  }
  return where;
}

/** Khi bếp bắt đầu làm món → đơn chuyển open → in_progress */
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
  if (hasProcessing && normalized === ORDER_STATUS.OPEN) {
    next = ORDER_STATUS.IN_PROGRESS;
  } else if (
    allTerminal &&
    (normalized === ORDER_STATUS.OPEN || normalized === ORDER_STATUS.IN_PROGRESS)
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
