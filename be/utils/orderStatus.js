const shared = require("../../shared/orderStatus");
const { Op } = require("sequelize");

function sqlLiteralIn(values) {
  const uniq = [...new Set(values)];
  return uniq.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(", ");
}

function completedOrderStatusSqlIn() {
  return sqlLiteralIn(shared.COMPLETED_ORDER_STATUS_DB_VALUES);
}

function activeOrderStatusSqlIn() {
  return sqlLiteralIn(shared.ACTIVE_ORDER_STATUS_DB_VALUES);
}

function inProgressOrderStatusSqlIn() {
  return sqlLiteralIn(shared.IN_PROGRESS_ORDER_STATUS_DB_VALUES);
}

function terminalOrderStatusSqlNotIn() {
  return sqlLiteralIn(shared.TERMINAL_ORDER_STATUS_DB_VALUES);
}

function completedOrderStatusWhere() {
  return { [Op.in]: shared.COMPLETED_ORDER_STATUS_DB_VALUES };
}

function activeOrderStatusWhere() {
  return { [Op.in]: shared.ACTIVE_ORDER_STATUS_DB_VALUES };
}

function terminalOrderStatusWhere() {
  return { [Op.in]: shared.TERMINAL_ORDER_STATUS_DB_VALUES };
}

function notTerminalOrderStatusWhere() {
  return { [Op.notIn]: shared.TERMINAL_ORDER_STATUS_DB_VALUES };
}

module.exports = {
  ...shared,
  completedOrderStatusWhere,
  activeOrderStatusWhere,
  terminalOrderStatusWhere,
  notTerminalOrderStatusWhere,
  completedOrderStatusSqlIn,
  activeOrderStatusSqlIn,
  inProgressOrderStatusSqlIn,
  terminalOrderStatusSqlNotIn,
  sqlLiteralIn,
};
