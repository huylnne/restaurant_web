/**
 * Đồng bộ be/utils/orderStatus.js
 */

export const ORDER_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export function normalizeOrderStatus(status) {
  if (status == null || status === "") return status;
  const s = String(status).trim();
  const lower = s.toLowerCase();
  if (Object.values(ORDER_STATUS).includes(lower)) return lower;
  if (s === "PENDING") return ORDER_STATUS.OPEN;
  if (s === "IN_PROGRESS") return ORDER_STATUS.IN_PROGRESS;
  if (s === "COMPLETED") return ORDER_STATUS.COMPLETED;
  if (s === "CANCELLED") return ORDER_STATUS.CANCELLED;
  if (lower === "pre-ordered" || lower === "preorder" || lower === "pending") {
    return ORDER_STATUS.OPEN;
  }
  return lower;
}

/** Đơn cũ trong DB còn status pre-ordered (đặt món trước) */
export function isLegacyPreorderOrderStatus(status) {
  const raw = String(status ?? "").trim();
  return raw === "pre-ordered" || raw === "preorder";
}

export function isActiveOrderStatus(status) {
  const n = normalizeOrderStatus(status);
  return n === ORDER_STATUS.OPEN || n === ORDER_STATUS.IN_PROGRESS;
}

export function getOrderStatusLabel(status) {
  const n = normalizeOrderStatus(status);
  const map = {
    [ORDER_STATUS.OPEN]: "Đang mở",
    [ORDER_STATUS.IN_PROGRESS]: "Đang xử lý",
    [ORDER_STATUS.COMPLETED]: "Hoàn tất",
    [ORDER_STATUS.CANCELLED]: "Đã hủy",
  };
  if (isLegacyPreorderOrderStatus(status)) return "Đặt món trước";
  return map[n] ?? status ?? "-";
}
