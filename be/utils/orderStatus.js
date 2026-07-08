/**
 * UTIL ORDER STATUS (BACKEND) — bọc shared/orderStatus thành điều kiện Sequelize/SQL.
 * Ctrl+F: order status util, activeOrderStatusWhere, completedOrderStatusSqlIn
 * Dùng bởi: báo cáo doanh thu, bill, table summary, query order active.
 */
const shared = require("../shared/orderStatus");
const { Op } = require("sequelize");

/** [SQL RAW] Escape và nối danh sách status cho câu SQL thủ công. Ctrl+F: sqlLiteralIn */
function sqlLiteralIn(values) {
  // Bỏ giá trị trùng bằng Set để IN-list gọn hơn.
  const uniq = [...new Set(values)];
  // Với mỗi giá trị: bọc dấu nháy đơn '...' và escape nháy đơn bên trong (' → '')
  // để tránh lỗi cú pháp / SQL injection khi ghép chuỗi thủ công. Nối lại bằng ", ".
  return uniq.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(", ");
}

/** [BÁO CÁO SQL] IN-list status completed để tính doanh thu. Ctrl+F: completedOrderStatusSqlIn */
function completedOrderStatusSqlIn() {
  return sqlLiteralIn(shared.COMPLETED_ORDER_STATUS_DB_VALUES);
}

/** [SQL ACTIVE] IN-list order đang hoạt động. Ctrl+F: activeOrderStatusSqlIn */
function activeOrderStatusSqlIn() {
  return sqlLiteralIn(shared.ACTIVE_ORDER_STATUS_DB_VALUES);
}

/** [SQL BẾP] IN-list order đang chế biến/phục vụ. Ctrl+F: inProgressOrderStatusSqlIn */
function inProgressOrderStatusSqlIn() {
  return sqlLiteralIn(shared.IN_PROGRESS_ORDER_STATUS_DB_VALUES);
}

/** [SQL KẾT THÚC] IN-list status terminal để loại order đã xong/hủy/no-show. Ctrl+F: terminalOrderStatusSqlNotIn */
function terminalOrderStatusSqlNotIn() {
  return sqlLiteralIn(shared.TERMINAL_ORDER_STATUS_DB_VALUES);
}

/** [SEQUELIZE] Where status completed. Ctrl+F: completedOrderStatusWhere */
function completedOrderStatusWhere() {
  return { [Op.in]: shared.COMPLETED_ORDER_STATUS_DB_VALUES };
}

/** [SEQUELIZE] Where status còn active: đặt trước/đang phục vụ/chờ thanh toán. Ctrl+F: activeOrderStatusWhere */
function activeOrderStatusWhere() {
  return { [Op.in]: shared.ACTIVE_ORDER_STATUS_DB_VALUES };
}

/** [SEQUELIZE] Where status đã kết thúc. Ctrl+F: terminalOrderStatusWhere */
function terminalOrderStatusWhere() {
  return { [Op.in]: shared.TERMINAL_ORDER_STATUS_DB_VALUES };
}

/** [SEQUELIZE] Where status chưa kết thúc, dùng khi cập nhật phiên bàn. Ctrl+F: notTerminalOrderStatusWhere */
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
