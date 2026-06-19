const { Table, Order } = require("../../models");
const billService = require("../bill.service");
const { TABLE_STATUS, isBookableTableStatus } = require("../../utils/tableStatus");
const { ACTIVE_SESSION_STATUSES, RESERVATION_STATUS } = require("../../utils/reservationStatus");
const { Op } = require("sequelize");

async function getTableByToken(token) {
  if (!token) return null;
  const table = await Table.findOne({
    where: { qr_token: token },
    attributes: ["table_id", "table_number", "capacity", "status", "branch_id", "qr_token"],
  });
  return table ? table.toJSON() : null;
}

async function getBillByToken(token) {
  const table = await Table.findOne({ where: { qr_token: token }, attributes: ["table_id"] });
  if (!table) return null;
  return billService.getBillByTable(table.table_id);
}

/**
 * Tạo phiên bàn (Order) khi khách check-in qua QR.
 */
async function checkinByToken({ token, userId, numberOfGuests }) {
  const table = await Table.findOne({
    where: { qr_token: token },
    attributes: ["table_id", "status", "branch_id"],
  });
  if (!table) throw new Error("TABLE_NOT_FOUND");

  const guests = Number(numberOfGuests ?? 1);
  if (!Number.isFinite(guests) || guests < 1) throw new Error("INVALID_GUESTS");

  const existing = await Order.findOne({
    where: {
      table_id: table.table_id,
      status: { [Op.in]: ACTIVE_SESSION_STATUSES },
    },
    order: [["created_at", "DESC"]],
  });

  if (existing) {
    return {
      order: existing.toJSON(),
      reservation: existing.toJSON(),
      order_id: existing.order_id,
      reservation_id: existing.order_id,
      reused: true,
    };
  }

  const order = await Order.create({
    user_id: userId,
    branch_id: table.branch_id,
    table_id: table.table_id,
    arrival_time: new Date(),
    number_of_guests: guests,
    status: RESERVATION_STATUS.PRE_ORDERED,
    order_type: "dine_in",
    payment_status: "unpaid",
    created_at: new Date(),
  });

  if (isBookableTableStatus(table.status)) {
    await table.update({ status: TABLE_STATUS.OCCUPIED });
  } else if (table.status === TABLE_STATUS.CLEANING) {
    const err = new Error("Bàn đang chờ dọn, chưa sẵn sàng phục vụ");
    err.code = "TABLE_CLEANING";
    throw err;
  }

  return {
    order: order.toJSON(),
    reservation: order.toJSON(),
    order_id: order.order_id,
    reservation_id: order.order_id,
    reused: false,
  };
}

module.exports = {
  getTableByToken,
  getBillByToken,
  checkinByToken,
};
