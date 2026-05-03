const { Table, Reservation } = require("../../models");
const billService = require("../bill.service");

const ACTIVE_RESERVATION_STATUSES = ["confirmed", "pre-ordered", "waiting_payment"];

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
 * Tạo một "phiên bàn" bằng Reservation ngay tại thời điểm check-in.
 * Giữ tương thích với code hiện tại: `POST /api/orders` cần `reservation_id`.
 */
async function checkinByToken({ token, userId, numberOfGuests }) {
  const table = await Table.findOne({
    where: { qr_token: token },
    attributes: ["table_id", "status", "branch_id"],
  });
  if (!table) throw new Error("TABLE_NOT_FOUND");

  const guests = Number(numberOfGuests ?? 1);
  if (!Number.isFinite(guests) || guests < 1) throw new Error("INVALID_GUESTS");

  // Nếu bàn đang phục vụ -> không tạo reservation mới để tránh trùng phiên
  // Cho phép check-in lại nếu đã có reservation active (return lại reservation đó)
  const existing = await Reservation.findOne({
    where: {
      table_id: table.table_id,
      status: ACTIVE_RESERVATION_STATUSES,
    },
    order: [["created_at", "DESC"]],
  });

  if (existing) {
    return { reservation: existing.toJSON(), reused: true };
  }

  // Nếu bàn trống, tạo phiên mới
  const reservation = await Reservation.create({
    user_id: userId,
    branch_id: table.branch_id,
    table_id: table.table_id,
    reservation_time: new Date(),
    number_of_guests: guests,
    status: "pre-ordered",
    created_at: new Date(),
  });

  // Chuyển trạng thái bàn sang đang phục vụ
  if (table.status === "available") {
    await table.update({ status: "occupied" });
  }

  return { reservation: reservation.toJSON(), reused: false };
}

module.exports = {
  getTableByToken,
  getBillByToken,
  checkinByToken,
};

