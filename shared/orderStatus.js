/**
 * Trạng thái phiên / đơn (orders.status) — single source of truth.
 * pending | confirmed | pre-ordered | in_progress | waiting_payment | completed | cancelled | no_show
 */

const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PRE_ORDERED: "pre-ordered",
  IN_PROGRESS: "in_progress",
  WAITING_PAYMENT: "waiting_payment",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
};

const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

const ACTIVE_ORDER_STATUS_DB_VALUES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PRE_ORDERED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.WAITING_PAYMENT,
  "open",
  "PENDING",
  "pending",
  "pre-ordered",
  "preorder",
  "IN_PROGRESS",
];

const TERMINAL_ORDER_STATUS_DB_VALUES = [
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.NO_SHOW,
  "COMPLETED",
  "CANCELLED",
];

const COMPLETED_ORDER_STATUS_DB_VALUES = [ORDER_STATUS.COMPLETED, "COMPLETED"];

const IN_PROGRESS_ORDER_STATUS_DB_VALUES = [ORDER_STATUS.IN_PROGRESS, "IN_PROGRESS"];

function normalizeOrderStatus(status) {
  if (status == null || status === "") return status;
  const s = String(status).trim();
  const lower = s.toLowerCase();
  if (ORDER_STATUS_VALUES.includes(lower)) return lower;
  if (s === "PENDING") return ORDER_STATUS.PENDING;
  if (s === "IN_PROGRESS") return ORDER_STATUS.IN_PROGRESS;
  if (s === "COMPLETED") return ORDER_STATUS.COMPLETED;
  if (s === "CANCELLED") return ORDER_STATUS.CANCELLED;
  if (s === "NO_SHOW") return ORDER_STATUS.NO_SHOW;
  if (lower === "open" || lower === "preorder") return ORDER_STATUS.PRE_ORDERED;
  return lower;
}

function isActiveOrderStatus(status) {
  const n = normalizeOrderStatus(status);
  return [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PRE_ORDERED,
    ORDER_STATUS.IN_PROGRESS,
    ORDER_STATUS.WAITING_PAYMENT,
  ].includes(n);
}

function isLegacyPreorderOrderStatus(status) {
  const raw = String(status ?? "").trim();
  return raw === "pre-ordered" || raw === "preorder";
}

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_VALUES,
  ACTIVE_ORDER_STATUS_DB_VALUES,
  TERMINAL_ORDER_STATUS_DB_VALUES,
  COMPLETED_ORDER_STATUS_DB_VALUES,
  IN_PROGRESS_ORDER_STATUS_DB_VALUES,
  normalizeOrderStatus,
  isActiveOrderStatus,
  isLegacyPreorderOrderStatus,
};
