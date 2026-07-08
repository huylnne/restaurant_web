/**
 * SERVICE ĐÁNH GIÁ — khách đánh giá sau thanh toán, cửa sổ 4 giờ, 1 lần/order.
 * Ctrl+F: đánh giá, review, rating, sao
 * Luồng demo: Phần 4 — Bước 4.6, Phần 5 — quản lý đánh giá admin
 */
const { Op } = require("sequelize");
const { Order, Payment, Review, OrderTable } = require("../models");
const { ORDER_STATUS } = require("../utils/orderStatus");
const { getTableIdsForOrder } = require("../utils/orderTableLinks");

const REVIEW_WINDOW_MS = 4 * 60 * 60 * 1000;

/** [ĐÁNH GIÁ] Validate order_id, rating 1-5, comment 5-1000 ký tự. Ctrl+F: normalizeReviewInput */
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

/** [ĐÁNH GIÁ] Order đủ điều kiện khi completed hoặc payment succeeded. Ctrl+F: isOrderReviewable */
async function isOrderReviewable(order) {
  if (!order) return false;
  // Điều kiện 1: order đã hoàn tất (completed) → cho đánh giá ngay.
  const isCompleted = String(order.status || "").toLowerCase() === ORDER_STATUS.COMPLETED;
  if (isCompleted) return true;

  // Điều kiện 2: đã có thanh toán thành công (dù order chưa kịp chuyển completed).
  const payment = await Payment.findOne({
    where: { order_id: order.order_id, status: "succeeded" },
    attributes: ["payment_id"],
  });
  return order.payment_status === "succeeded" || !!payment;
}

/** [ĐÁNH GIÁ QR] Tìm order vừa thanh toán trên bàn (trong 4h) để hiện form đánh giá. Ctrl+F: findRecentReviewableOrderForTable */
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

/** [ĐÁNH GIÁ] Kiểm tra order thuộc bàn (kể cả ghép bàn). Ctrl+F: orderBelongsToTable */
async function orderBelongsToTable(orderId, tableId) {
  const tableIds = await getTableIdsForOrder(orderId);
  return tableIds.includes(Number(tableId));
}

/** [ĐÁNH GIÁ] Trạng thái: can_review / already_reviewed cho 1 order. Ctrl+F: getReviewStatusForOrder */
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

/**
 * [ĐÁNH GIÁ] Tạo review — từ khách đăng nhập hoặc QR (không cần userId).
 * Luồng demo: Phần 4 — Bước 4.6. Ctrl+F: createOrderReview, gửi đánh giá
 */
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

  // Nếu là khách đăng nhập: order phải thuộc chính họ (chống đánh giá hộ đơn người khác).
  if (userId != null) {
    if (order.user_id == null || Number(order.user_id) !== Number(userId)) {
      throw new Error("ORDER_NOT_FOUND");
    }
  }

  // Nếu đánh giá qua QR bàn: order phải thuộc đúng bàn đó (kể cả bàn ghép).
  if (tableId != null) {
    const belongs = await orderBelongsToTable(sessionOrderId, tableId);
    if (!belongs) throw new Error("ORDER_NOT_FOUND");
  }

  // Mỗi order chỉ được đánh giá 1 lần → có review rồi thì chặn.
  const existing = await Review.findOne({
    where: { order_id: sessionOrderId },
    attributes: ["review_id"],
  });
  if (existing) throw new Error("REVIEW_ALREADY_EXISTS");

  // Chỉ cho đánh giá khi order đã completed/đã thanh toán.
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
    // Chốt chặn cuối: 2 request cùng lúc lọt qua kiểm tra ở trên → DB có unique(order_id) sẽ báo trùng.
    if (error?.name === "SequelizeUniqueConstraintError") {
      throw new Error("REVIEW_ALREADY_EXISTS");
    }
    throw error;
  }
}

/** [ĐÁNH GIÁ] Popup nhắc khách đánh giá sau bữa ăn (dashboard). Ctrl+F: getPendingReviewForUser, pending review */
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
