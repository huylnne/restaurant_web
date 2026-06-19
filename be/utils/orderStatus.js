/**
 * Trạng thái phiên / đơn (orders.status)
 * pending | confirmed | pre-ordered | in_progress | waiting_payment | completed | cancelled
 */

const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PRE_ORDERED: "pre-ordered",
  IN_PROGRESS: "in_progress",
  WAITING_PAYMENT: "waiting_payment",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

function normalizeOrderStatus(status) {
  if (status == null || status === "") return status;
  const s = String(status).trim();
  const lower = s.toLowerCase();
  if (ORDER_STATUS_VALUES.includes(lower)) return lower;
  if (s === "PENDING") return ORDER_STATUS.PENDING;
  if (s === "IN_PROGRESS") return ORDER_STATUS.IN_PROGRESS;
  if (s === "COMPLETED") return ORDER_STATUS.COMPLETED;
  if (s === "CANCELLED") return ORDER_STATUS.CANCELLED;
  if (lower === "open" || lower === "preorder") return ORDER_STATUS.PRE_ORDERED;
  return lower;
}

/** Phiên / đơn đang hoạt động (mọi biến thể legacy) */
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
  "COMPLETED",
  "CANCELLED",
];

const COMPLETED_ORDER_STATUS_DB_VALUES = [ORDER_STATUS.COMPLETED, "COMPLETED"];

const IN_PROGRESS_ORDER_STATUS_DB_VALUES = [
  ORDER_STATUS.IN_PROGRESS,
  "IN_PROGRESS",
];

function sqlLiteralIn(values) {
  const uniq = [...new Set(values)];
  return uniq.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(", ");
}

function completedOrderStatusSqlIn() {
  return sqlLiteralIn(COMPLETED_ORDER_STATUS_DB_VALUES);
}

function activeOrderStatusSqlIn() {
  return sqlLiteralIn(ACTIVE_ORDER_STATUS_DB_VALUES);
}

function inProgressOrderStatusSqlIn() {
  return sqlLiteralIn(IN_PROGRESS_ORDER_STATUS_DB_VALUES);
}

function terminalOrderStatusSqlNotIn() {
  return sqlLiteralIn(TERMINAL_ORDER_STATUS_DB_VALUES);
}

function completedOrderStatusWhere() {
  const { Op } = require("sequelize");
  return { [Op.in]: COMPLETED_ORDER_STATUS_DB_VALUES };
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
