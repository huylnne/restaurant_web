const REVIEW_PROMPT_PREFIX = "review_prompted_";

export function hasReviewPromptBeenShown(orderId) {
  if (!orderId) return false;
  return sessionStorage.getItem(`${REVIEW_PROMPT_PREFIX}${orderId}`) === "1";
}

export function markReviewPromptShown(orderId) {
  if (!orderId) return;
  sessionStorage.setItem(`${REVIEW_PROMPT_PREFIX}${orderId}`, "1");
}

export function isOrderPaidOrCompleted(bill) {
  const order = bill?.order;
  if (!order) return false;
  const status = String(order.status || "").toLowerCase();
  const paymentStatus = String(order.payment_status || "").toLowerCase();
  return status === "completed" || paymentStatus === "succeeded";
}
