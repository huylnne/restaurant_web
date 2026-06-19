/**
 * Trạng thái phiên bàn — giờ lưu trên orders.status (alias giữ tên cũ cho tương thích import).
 */

const { ORDER_STATUS } = require("./orderStatus");

const RESERVATION_STATUS = ORDER_STATUS;

const ACTIVE_RESERVATION_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PRE_ORDERED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.WAITING_PAYMENT,
];

const CHECK_IN_RESERVATION_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PENDING,
];

const ACTIVE_SESSION_STATUSES = [
  ORDER_STATUS.PRE_ORDERED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.WAITING_PAYMENT,
];

const CANCELABLE_RESERVATION_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
];

function activeReservationStatusWhere() {
  const { Op } = require("sequelize");
  return { [Op.in]: ACTIVE_RESERVATION_STATUSES };
}

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
  activeReservationStatusWhere,
  activeSessionStatusWhere,
};
