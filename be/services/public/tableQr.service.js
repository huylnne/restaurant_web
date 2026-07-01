const { Table, Order, OrderItem, sequelize } = require("../../models");
const billService = require("../bill.service");
const { TABLE_STATUS, isTableOrderableViaQr, isBookableTableStatus } = require("../../utils/tableStatus");
const { ACTIVE_SESSION_STATUSES, RESERVATION_STATUS } = require("../../utils/reservationStatus");
const { ORDER_STATUS } = require("../../utils/orderStatus");
const { Op } = require("sequelize");
const { buildOrderItemPayloads } = require("../../utils/orderItemFactory");
const { findActiveOrderByTableId } = require("../../utils/orderTableLinks");
const realtimeHub = require("../../realtimeHub");
const sharedReviewService = require("../review.service");
const {
  signTableOrderAccessToken,
  verifyTableOrderAccessToken,
} = require("../../utils/tableQrAccess");

async function getTableByToken(token) {
  if (!token) return null;
  const table = await Table.findOne({
    where: { qr_token: token },
    attributes: ["table_id", "table_number", "capacity", "status", "branch_id", "qr_token"],
  });
  if (!table) return null;

  const activeOrder = await findActiveOrderByTableId(table.table_id);
  const canOrder = Boolean(activeOrder && isTableOrderableViaQr(table.status));

  return {
    ...table.toJSON(),
    can_order: canOrder,
    order_access_token: canOrder
      ? signTableOrderAccessToken({
          table_id: table.table_id,
          order_id: activeOrder.order_id,
        })
      : null,
  };
}

async function resolveOrderAccessForTable({ accessToken, tableId, transaction }) {
  if (!accessToken) throw new Error("ORDER_ACCESS_REQUIRED");

  let payload;
  try {
    payload = verifyTableOrderAccessToken(accessToken);
  } catch {
    throw new Error("ORDER_ACCESS_INVALID");
  }

  if (payload.table_id !== Number(tableId)) throw new Error("ORDER_ACCESS_INVALID");

  const order = await Order.findOne({
    where: {
      order_id: payload.order_id,
      table_id: tableId,
      status: { [Op.in]: ACTIVE_SESSION_STATUSES },
    },
    transaction,
  });
  if (!order) throw new Error("NO_ACTIVE_SESSION");

  return order;
}

async function getBillByToken(token) {
  const table = await Table.findOne({ where: { qr_token: token }, attributes: ["table_id"] });
  if (!table) return null;
  return billService.getBillByTable(table.table_id);
}

/**
 * Tạo phiên bàn (Order) khi khách check-in qua QR.
 */
async function checkinByToken({ token, userId, numberOfGuests }) {
  const table = await Table.findOne({
    where: { qr_token: token },
    attributes: ["table_id", "status", "branch_id"],
  });
  if (!table) throw new Error("TABLE_NOT_FOUND");

  const guests = Number(numberOfGuests ?? 1);
  if (!Number.isFinite(guests) || guests < 1) throw new Error("INVALID_GUESTS");

  const existing = await findActiveOrderByTableId(table.table_id);

  if (existing) {
    return {
      order: existing.toJSON(),
      reservation: existing.toJSON(),
      order_id: existing.order_id,
      reservation_id: existing.order_id,
      reused: true,
    };
  }

  const order = await Order.create({
    user_id: userId,
    branch_id: table.branch_id,
    table_id: table.table_id,
    arrival_time: new Date(),
    number_of_guests: guests,
    status: RESERVATION_STATUS.PRE_ORDERED,
    order_type: "dine_in",
    payment_status: "unpaid",
    checked_in_at: new Date(),
    created_at: new Date(),
  });

  if (isBookableTableStatus(table.status)) {
    await table.update({ status: TABLE_STATUS.OCCUPIED });
  } else if (table.status === TABLE_STATUS.CLEANING) {
    const err = new Error("Bàn đang chờ dọn, chưa sẵn sàng phục vụ");
    err.code = "TABLE_CLEANING";
    throw err;
  }

  return {
    order: order.toJSON(),
    reservation: order.toJSON(),
    order_id: order.order_id,
    reservation_id: order.order_id,
    reused: false,
  };
}

async function addOrderItemsByToken({ token, accessToken, items = [], note = null }) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("INVALID_ITEMS");

  const orderNote =
    note != null && String(note).trim() ? String(note).trim().slice(0, 200) : null;

  const result = await sequelize.transaction(async (transaction) => {
    const table = await Table.findOne({
      where: { qr_token: token },
      attributes: ["table_id", "status", "branch_id"],
      transaction,
    });
    if (!table) throw new Error("TABLE_NOT_FOUND");
    if (table.status === TABLE_STATUS.CLEANING) throw new Error("TABLE_CLEANING");
    if (!isTableOrderableViaQr(table.status)) throw new Error("TABLE_NOT_ACTIVE");

    const order = await resolveOrderAccessForTable({
      accessToken,
      tableId: table.table_id,
      transaction,
    });

    const orderItemsPayload = await buildOrderItemPayloads(items, transaction);

    if (orderNote && !order.note) {
      await order.update({ note: orderNote }, { transaction });
    }

    await Promise.all(
      orderItemsPayload.map((payload) =>
        OrderItem.create(
          {
            order_id: order.order_id,
            ...payload,
          },
          { transaction }
        )
      )
    );

    if ([ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PRE_ORDERED].includes(order.status)) {
      await order.update({ status: ORDER_STATUS.IN_PROGRESS }, { transaction });
    }

    return {
      order_id: order.order_id,
      table_id: table.table_id,
      branch_id: table.branch_id,
      item_count: orderItemsPayload.length,
    };
  });

  try {
    realtimeHub.notifyBranch(result.branch_id, {
      type: "order_flow",
      reason: "table_qr_order",
      order_id: Number(result.order_id),
      table_id: Number(result.table_id),
    });
  } catch (_) {}

  return {
    ...result,
    bill: await billService.getBillByTable(result.table_id),
  };
}

async function getReviewEligibilityByToken(token, orderId = null) {
  const table = await Table.findOne({
    where: { qr_token: token },
    attributes: ["table_id"],
  });
  if (!table) return null;

  let order = null;
  if (orderId) {
    const belongs = await sharedReviewService.orderBelongsToTable(orderId, table.table_id);
    if (!belongs) return { can_review: false, order_id: null, already_reviewed: false, review: null };
    order = await Order.findByPk(orderId, {
      attributes: ["order_id", "status", "payment_status"],
    });
    if (!order || !(await sharedReviewService.isOrderReviewable(order))) {
      return { can_review: false, order_id: Number(orderId), already_reviewed: false, review: null };
    }
    return sharedReviewService.getReviewStatusForOrder(order.order_id);
  }

  order = await sharedReviewService.findRecentReviewableOrderForTable(table.table_id);
  if (!order) {
    return { can_review: false, order_id: null, already_reviewed: false, review: null };
  }
  return sharedReviewService.getReviewStatusForOrder(order.order_id);
}

async function createReviewByToken({ token, order_id, rating, comment }) {
  const table = await Table.findOne({
    where: { qr_token: token },
    attributes: ["table_id"],
  });
  if (!table) throw new Error("TABLE_NOT_FOUND");

  return sharedReviewService.createOrderReview({
    orderId: order_id,
    tableId: table.table_id,
    rating,
    comment,
  });
}

module.exports = {
  getTableByToken,
  getBillByToken,
  checkinByToken,
  addOrderItemsByToken,
  getReviewEligibilityByToken,
  createReviewByToken,
};
