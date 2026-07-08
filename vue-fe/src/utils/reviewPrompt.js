/**
 * REVIEW PROMPT (FE) — quản lý việc chỉ nhắc đánh giá 1 lần/đơn trong 1 phiên trình duyệt.
 * Dùng sessionStorage nên khi đóng tab sẽ nhắc lại (tránh làm phiền quá mức trong cùng phiên).
 */
const REVIEW_PROMPT_PREFIX = "review_prompted_";

/** Đã hiện popup nhắc đánh giá cho đơn này chưa? */
export function hasReviewPromptBeenShown(orderId) {
  if (!orderId) return false;
  return sessionStorage.getItem(`${REVIEW_PROMPT_PREFIX}${orderId}`) === "1";
}

/** Đánh dấu đã hiện popup nhắc đánh giá cho đơn này (để không hiện lại). */
export function markReviewPromptShown(orderId) {
  if (!orderId) return;
  sessionStorage.setItem(`${REVIEW_PROMPT_PREFIX}${orderId}`, "1");
}

/** Đơn đã đủ điều kiện đánh giá chưa: hoàn tất HOẶC đã thanh toán thành công. */
export function isOrderPaidOrCompleted(bill) {
  const order = bill?.order;
  if (!order) return false;
  const status = String(order.status || "").toLowerCase();
  const paymentStatus = String(order.payment_status || "").toLowerCase();
  return status === "completed" || paymentStatus === "succeeded";
}
