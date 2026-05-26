/**
 * Trạng thái đơn hàng (orders.status) — tách khỏi bàn / reservation.
 * Giá trị chuẩn: lowercase. Vẫn đọc được legacy PENDING, pre-ordered, IN_PROGRESS...
 */

const ORDER_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

function normalizeOrderStatus(status) {
  if (status == null || status === "") return status;
  const s = String(status).trim();
  const lower = s.toLowerCase();
  if (ORDER_STATUS_VALUES.includes(lower)) return lower;
  if (s === "PENDING") return ORDER_STATUS.OPEN;
  if (s === "IN_PROGRESS") return ORDER_STATUS.IN_PROGRESS;
  if (s === "COMPLETED") return ORDER_STATUS.COMPLETED;
  if (s === "CANCELLED") return ORDER_STATUS.CANCELLED;
  if (lower === "pre-ordered" || lower === "preorder" || lower === "pending") {
    return ORDER_STATUS.OPEN;
  }
  return lower;
}

/** Mọi giá trị có thể còn trong DB cho đơn đang hoạt động */
const ACTIVE_ORDER_STATUS_DB_VALUES = [
  ORDER_STATUS.OPEN,
  ORDER_STATUS.IN_PROGRESS,
  "pre-ordered",
  "PENDING",
  "pending",
  "IN_PROGRESS",
];

/** Đơn đã kết thúc (mọi biến thể) */
const TERMINAL_ORDER_STATUS_DB_VALUES = [
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
  "COMPLETED",
  "CANCELLED",
];

/** Đơn hoàn tất (legacy + chuẩn) — dùng cho báo cáo / doanh thu */
const COMPLETED_ORDER_STATUS_DB_VALUES = [ORDER_STATUS.COMPLETED, "COMPLETED"];

const IN_PROGRESS_ORDER_STATUS_DB_VALUES = [
  ORDER_STATUS.IN_PROGRESS,
  "IN_PROGRESS",
];

function sqlLiteralIn(values) {
  const uniq = [...new Set(values)];
  return uniq.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(", ");
}

/** SQL fragment: o.status IN ('completed','COMPLETED') */
function completedOrderStatusSqlIn() {
  return sqlLiteralIn(COMPLETED_ORDER_STATUS_DB_VALUES);
}

/** SQL fragment: o.status IN (...active...) */
function activeOrderStatusSqlIn() {
  return sqlLiteralIn(ACTIVE_ORDER_STATUS_DB_VALUES);
}

/** SQL fragment: o.status IN (...in_progress...) */
function inProgressOrderStatusSqlIn() {
  return sqlLiteralIn(IN_PROGRESS_ORDER_STATUS_DB_VALUES);
}

/** SQL fragment: o.status NOT IN (...terminal...) */
function terminalOrderStatusSqlNotIn() {
  return sqlLiteralIn(TERMINAL_ORDER_STATUS_DB_VALUES);
}

function completedOrderStatusWhere() {
  const { Op } = require("sequelize");
  return { [Op.in]: COMPLETED_ORDER_STATUS_DB_VALUES };
}

function isActiveOrderStatus(status) {
  const n = normalizeOrderStatus(status);
  return n === ORDER_STATUS.OPEN || n === ORDER_STATUS.IN_PROGRESS;
}

function isLegacyPreorderOrderStatus(status) {
  const raw = String(status ?? "").trim();
  return raw === "pre-ordered" || raw === "preorder";
}

function activeOrderStatusWhere() {
  const { Op } = require("sequelize");
  return { [Op.in]: ACTIVE_ORDER_STATUS_DB_VALUES };
}

function terminalOrderStatusWhere() {
  const { Op } = require("sequelize");
  return { [Op.in]: TERMINAL_ORDER_STATUS_DB_VALUES };
}

function notTerminalOrderStatusWhere() {
  const { Op } = require("sequelize");
  return { [Op.notIn]: TERMINAL_ORDER_STATUS_DB_VALUES };
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
  activeOrderStatusWhere,
  terminalOrderStatusWhere,
  notTerminalOrderStatusWhere,
  completedOrderStatusWhere,
  completedOrderStatusSqlIn,
  activeOrderStatusSqlIn,
  inProgressOrderStatusSqlIn,
  terminalOrderStatusSqlNotIn,
  sqlLiteralIn,
};
