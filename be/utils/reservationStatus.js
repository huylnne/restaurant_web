/**
 * UTIL RESERVATION STATUS — alias nghiệp vụ đặt bàn trên orders.status.
 * Ctrl+F: reservation status, ACTIVE_SESSION_STATUSES, CANCELABLE_RESERVATION_STATUSES, checked_in
 * Dùng bởi: đặt bàn, tiếp nhận/check-in, yêu cầu thanh toán, QR.
 */

const { ORDER_STATUS } = require("./orderStatus");

/** [TƯƠNG THÍCH TÊN CŨ] Reservation thực chất lưu trong bảng orders. Ctrl+F: RESERVATION_STATUS */
const RESERVATION_STATUS = ORDER_STATUS;

/** [YÊU CẦU THANH TOÁN] Các status còn được xem là đặt bàn/phiên active của khách. Ctrl+F: ACTIVE_RESERVATION_STATUSES */
const ACTIVE_RESERVATION_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PRE_ORDERED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.WAITING_PAYMENT,
];

/** [CHECK-IN] Chỉ pending/confirmed mới là đặt bàn chưa tiếp nhận. Ctrl+F: CHECK_IN_RESERVATION_STATUSES */
const CHECK_IN_RESERVATION_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PENDING,
];

/** [PHIÊN BÀN] Bàn đang phục vụ hoặc chờ thanh toán, dùng tìm active order theo bàn. Ctrl+F: ACTIVE_SESSION_STATUSES */
const ACTIVE_SESSION_STATUSES = [
  ORDER_STATUS.PRE_ORDERED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.WAITING_PAYMENT,
];

/** [HỦY ĐẶT BÀN] Khách chỉ hủy khi chưa check-in và còn pending/confirmed. Ctrl+F: CANCELABLE_RESERVATION_STATUSES */
const CANCELABLE_RESERVATION_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
];

/** [KẾT THÚC] Order đã completed/cancelled/no_show không thể check-in/gọi món nữa. Ctrl+F: TERMINAL_RESERVATION_STATUSES */
const TERMINAL_RESERVATION_STATUSES = [
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.NO_SHOW,
];

/** [TIẾP NHẬN] Đặt bàn còn hiển thị ở màn tiếp nhận (chưa hủy / hoàn tất). Ctrl+F: RECEPTION_LIST_STATUSES */
const RECEPTION_LIST_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PRE_ORDERED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.WAITING_PAYMENT,
];

/** [CHECK-IN] Kiểm tra order đã có checked_in_at chưa. Ctrl+F: isOrderCheckedIn */
function isOrderCheckedIn(order) {
  return !!(order?.checked_in_at ?? order?.checkedInAt);
}

/** [SEQUELIZE] Where status đặt bàn/phiên active của khách. Ctrl+F: activeReservationStatusWhere */
function activeReservationStatusWhere() {
  const { Op } = require("sequelize");
  return { [Op.in]: ACTIVE_RESERVATION_STATUSES };
}

/** [SEQUELIZE] Where status phiên bàn active theo table_id. Ctrl+F: activeSessionStatusWhere */
function activeSessionStatusWhere() {
  const { Op } = require("sequelize");
  return { [Op.in]: ACTIVE_SESSION_STATUSES };
}

module.exports = {
  RESERVATION_STATUS,
  ACTIVE_RESERVATION_STATUSES,
  CHECK_IN_RESERVATION_STATUSES,
  ACTIVE_SESSION_STATUSES,
  CANCELABLE_RESERVATION_STATUSES,
  TERMINAL_RESERVATION_STATUSES,
  RECEPTION_LIST_STATUSES,
  isOrderCheckedIn,
  activeReservationStatusWhere,
  activeSessionStatusWhere,
};
