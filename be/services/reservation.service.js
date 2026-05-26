const db = require("../models");
const { Reservation, Table } = db;
const sequelize = db.sequelize;
const { Op } = require("sequelize");

const CONFLICT_WINDOW_MS = 60 * 60 * 1000;
const ACTIVE_CONFLICT_STATUSES = { [Op.notIn]: ["cancelled", "completed"] };

function getTimeWindow(reservationTime) {
  const resTime = new Date(reservationTime);
  return {
    windowStart: new Date(resTime.getTime() - CONFLICT_WINDOW_MS),
    windowEnd: new Date(resTime.getTime() + CONFLICT_WINDOW_MS),
  };
}

/** Bàn đã có đặt chỗ trong khung ±1 giờ quanh giờ khách chọn */
async function getConflictTableIds(branch_id, reservationTime, { transaction } = {}) {
  const { windowStart, windowEnd } = getTimeWindow(reservationTime);
  const rows = await Reservation.findAll({
    where: {
      branch_id,
      reservation_time: { [Op.between]: [windowStart, windowEnd] },
      status: ACTIVE_CONFLICT_STATUSES,
    },
    attributes: ["table_id"],
    transaction,
  });
  return rows.map((r) => r.table_id).filter(Boolean);
}

async function hasOverlappingReservation(table_id, branch_id, reservationTime, { transaction } = {}) {
  const { windowStart, windowEnd } = getTimeWindow(reservationTime);
  const row = await Reservation.findOne({
    where: {
      table_id,
      branch_id,
      reservation_time: { [Op.between]: [windowStart, windowEnd] },
      status: ACTIVE_CONFLICT_STATUSES,
    },
    transaction,
  });
  return Boolean(row);
}

async function resolveNoTableMessage(branch_id, guests, reservationTime, conflictIds, { transaction } = {}) {
  const hasCapacity = await Table.findOne({
    where: { branch_id, capacity: { [Op.gte]: guests } },
    transaction,
  });
  if (!hasCapacity) {
    return {
      message: `Chi nhánh không có bàn đủ chỗ cho ${guests} khách. Vui lòng giảm số khách hoặc chọn chi nhánh khác.`,
    };
  }

  const bookedInSlot = await Table.findOne({
    where: {
      branch_id,
      capacity: { [Op.gte]: guests },
      status: "available",
      ...(conflictIds.length > 0 ? { table_id: { [Op.in]: conflictIds } } : { table_id: -1 }),
    },
    transaction,
  });
  if (bookedInSlot) {
    return {
      message: "Đã kín bàn trong khung giờ này. Vui lòng chọn ngày hoặc giờ khác.",
    };
  }

  return {
    message: "Hiện không còn bàn trống. Vui lòng thử thời gian khác hoặc liên hệ nhà hàng.",
  };
}

/**
 * Chọn bàn (đọc thường) — dùng GET /available, không khóa hàng.
 */
async function pickAvailableTable(branch_id, number_of_guests, reservationTime) {
  const guests = Number(number_of_guests);
  const conflictIds = await getConflictTableIds(branch_id, reservationTime);

  const table = await Table.findOne({
    where: {
      branch_id,
      capacity: { [Op.gte]: guests },
      status: "available",
      ...(conflictIds.length > 0 ? { table_id: { [Op.notIn]: conflictIds } } : {}),
    },
    order: [["capacity", "ASC"]],
  });
  if (table) return { table };

  const fallback = await resolveNoTableMessage(branch_id, guests, reservationTime, conflictIds);
  return { message: fallback.message };
}

/**
 * Trong transaction: khóa từng bàn ứng viên (FOR UPDATE), kiểm tra lại overlap rồi trả bàn đầu tiên hợp lệ.
 */
async function pickAvailableTableWithLock(branch_id, number_of_guests, reservationTime, transaction) {
  const guests = Number(number_of_guests);
  const conflictIds = await getConflictTableIds(branch_id, reservationTime, { transaction });
  const triedTableIds = new Set(conflictIds);

  while (true) {
    const exclude = [...triedTableIds];
    const table = await Table.findOne({
      where: {
        branch_id,
        capacity: { [Op.gte]: guests },
        status: "available",
        ...(exclude.length > 0 ? { table_id: { [Op.notIn]: exclude } } : {}),
      },
      order: [["capacity", "ASC"]],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!table) {
      const fallback = await resolveNoTableMessage(branch_id, guests, reservationTime, [
        ...triedTableIds,
      ], { transaction });
      return { message: fallback.message };
    }

    const overlap = await hasOverlappingReservation(table.table_id, branch_id, reservationTime, {
      transaction,
    });
    if (!overlap) {
      return { table };
    }

    triedTableIds.add(table.table_id);
  }
}

/**
 * Tạo đặt bàn trong transaction — tránh hai khách cùng nhận một bàn (race TOCTOU).
 */
async function createReservation({ user_id, branch_id, reservation_time, number_of_guests, note }) {
  const guests = Number(number_of_guests);

  return sequelize.transaction(async (transaction) => {
    const picked = await pickAvailableTableWithLock(
      branch_id,
      guests,
      reservation_time,
      transaction
    );

    if (!picked.table) {
      const err = new Error(picked.message);
      err.code = "NO_TABLE";
      throw err;
    }

    const reservation = await Reservation.create(
      {
        user_id,
        branch_id,
        table_id: picked.table.table_id,
        reservation_time,
        number_of_guests: guests,
        note: note || null,
        status: "confirmed",
        created_at: new Date(),
      },
      { transaction }
    );

    return { reservation, table: picked.table };
  });
}

module.exports = {
  CONFLICT_WINDOW_MS,
  getTimeWindow,
  getConflictTableIds,
  pickAvailableTable,
  createReservation,
};
