const { Op } = require("sequelize");
const { Order, Payment, Review, OrderTable } = require("../models");
const { ORDER_STATUS } = require("../utils/orderStatus");
const { getTableIdsForOrder } = require("../utils/orderTableLinks");

const REVIEW_WINDOW_MS = 4 * 60 * 60 * 1000;

function normalizeReviewInput({ order_id, reservation_id, rating, comment }) {
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

  return { sessionOrderId, normalizedRating, normalizedComment };
}

async function isOrderReviewable(order) {
  if (!order) return false;
  const isCompleted = String(order.status || "").toLowerCase() === ORDER_STATUS.COMPLETED;
  if (isCompleted) return true;

  const payment = await Payment.findOne({
    where: { order_id: order.order_id, status: "succeeded" },
    attributes: ["payment_id"],
  });
  return order.payment_status === "succeeded" || !!payment;
}

async function findRecentReviewableOrderForTable(tableId) {
  const since = new Date(Date.now() - REVIEW_WINDOW_MS);
  const linkedRows = await OrderTable.findAll({
    where: { table_id: tableId },
    attributes: ["order_id"],
  });
  const linkedOrderIds = linkedRows.map((row) => row.order_id);

  const orders = await Order.findAll({
    where: {
      created_at: { [Op.gte]: since },
      [Op.or]: [{ status: ORDER_STATUS.COMPLETED }, { payment_status: "succeeded" }],
      [Op.and]: [
        {
          [Op.or]: [
            { table_id: tableId },
            ...(linkedOrderIds.length ? [{ order_id: { [Op.in]: linkedOrderIds } }] : []),
          ],
        },
      ],
    },
    attributes: ["order_id", "user_id", "status", "payment_status", "created_at", "updated_at"],
    order: [
      ["updated_at", "DESC"],
      ["created_at", "DESC"],
    ],
    limit: 5,
  });

  for (const order of orders) {
    if (await isOrderReviewable(order)) return order;
  }
  return null;
}

async function orderBelongsToTable(orderId, tableId) {
  const tableIds = await getTableIdsForOrder(orderId);
  return tableIds.includes(Number(tableId));
}

async function getReviewStatusForOrder(orderId) {
  const review = await Review.findOne({
    where: { order_id: orderId },
    attributes: ["review_id", "rating", "comment", "created_at"],
  });
  return {
    order_id: orderId,
    can_review: !review,
    already_reviewed: !!review,
    review: review ? review.toJSON() : null,
  };
}

async function createOrderReview({ orderId, userId = null, tableId = null, rating, comment }) {
  const { sessionOrderId, normalizedRating, normalizedComment } = normalizeReviewInput({
    order_id: orderId,
    rating,
    comment,
  });

  const order = await Order.findOne({
    where: { order_id: sessionOrderId },
    attributes: ["order_id", "user_id", "table_id", "status", "payment_status", "created_at"],
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");

  if (userId != null) {
    if (order.user_id == null || Number(order.user_id) !== Number(userId)) {
      throw new Error("ORDER_NOT_FOUND");
    }
  }

  if (tableId != null) {
    const belongs = await orderBelongsToTable(sessionOrderId, tableId);
    if (!belongs) throw new Error("ORDER_NOT_FOUND");
  }

  const existing = await Review.findOne({
    where: { order_id: sessionOrderId },
    attributes: ["review_id"],
  });
  if (existing) throw new Error("REVIEW_ALREADY_EXISTS");

  if (!(await isOrderReviewable(order))) {
    throw new Error("REVIEW_NOT_ALLOWED");
  }

  const reviewUserId = userId != null ? Number(userId) : order.user_id || null;

  try {
    const review = await Review.create({
      order_id: sessionOrderId,
      user_id: reviewUserId,
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
}

async function getPendingReviewForUser(userId) {
  const since = new Date(Date.now() - REVIEW_WINDOW_MS);
  const orders = await Order.findAll({
    where: {
      user_id: userId,
      created_at: { [Op.gte]: since },
      [Op.or]: [{ status: ORDER_STATUS.COMPLETED }, { payment_status: "succeeded" }],
    },
    attributes: ["order_id", "status", "payment_status", "updated_at", "created_at"],
    order: [
      ["updated_at", "DESC"],
      ["created_at", "DESC"],
    ],
    limit: 5,
  });

  for (const order of orders) {
    if (!(await isOrderReviewable(order))) continue;
    const status = await getReviewStatusForOrder(order.order_id);
    if (status.can_review) return status;
  }

  return { can_review: false, order_id: null, already_reviewed: false, review: null };
}

module.exports = {
  REVIEW_WINDOW_MS,
  normalizeReviewInput,
  isOrderReviewable,
  findRecentReviewableOrderForTable,
  orderBelongsToTable,
  getReviewStatusForOrder,
  createOrderReview,
  getPendingReviewForUser,
};
