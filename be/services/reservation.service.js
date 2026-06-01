const crypto = require("crypto");
const db = require("../models");
const { Reservation, Table } = db;
const sequelize = db.sequelize;
const { Op } = require("sequelize");
const {
  planTableAllocation,
  formatTableNumbers,
  maxAdjacentSeats,
} = require("../utils/tableAllocation");
const { CANCELABLE_RESERVATION_STATUSES } = require("../utils/reservationStatus");

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

async function getAvailableTablesForSlot(branch_id, reservationTime, excludeTableIds = [], { transaction } = {}) {
  const conflictIds = await getConflictTableIds(branch_id, reservationTime, { transaction });
  const exclude = new Set([...conflictIds, ...excludeTableIds]);

  const rows = await Table.findAll({
    where: {
      branch_id,
      status: "available",
      ...(exclude.size > 0 ? { table_id: { [Op.notIn]: [...exclude] } } : {}),
    },
    order: [["table_id", "ASC"]],
    transaction,
  });

  const free = [];
  for (const table of rows) {
    const overlap = await hasOverlappingReservation(table.table_id, branch_id, reservationTime, {
      transaction,
    });
    if (!overlap) free.push(table);
  }
  return free;
}

async function resolveNoTableMessage(branch_id, guests, reservationTime, conflictIds, { transaction } = {}) {
  const available = await getAvailableTablesForSlot(branch_id, reservationTime, conflictIds, {
    transaction,
  });
  const totalSeats = available.reduce((sum, t) => sum + t.capacity, 0);
  const adjacentSeats = maxAdjacentSeats(available.map((t) => t.toJSON()));

  const hasAnyCapacity = await Table.findOne({
    where: { branch_id, capacity: { [Op.gte]: 1 } },
    transaction,
  });
  if (!hasAnyCapacity) {
    return {
      message: `Chi nhánh không có bàn đủ chỗ cho ${guests} khách. Vui lòng giảm số khách hoặc chọn chi nhánh khác.`,
    };
  }

  if (totalSeats < guests) {
    const maxSingle = await Table.max("capacity", { where: { branch_id }, transaction });
    if (maxSingle && maxSingle < guests) {
      return {
        message: `Không đủ bàn trống cho ${guests} khách (tối đa ghép được ~${totalSeats} chỗ trong khung giờ này). Vui lòng giảm số khách, chọn giờ khác hoặc liên hệ nhà hàng.`,
      };
    }
  }

  if (totalSeats >= guests && adjacentSeats < guests) {
    return {
      message: `Có đủ chỗ rải rác nhưng không có dãy bàn liền kề cho ${guests} khách (khu liền kề tối đa ~${adjacentSeats} chỗ). Vui lòng chọn giờ khác hoặc liên hệ nhà hàng.`,
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
 * Chọn bàn (đọc thường) — một bàn hoặc ghép nhiều bàn.
 */
async function pickAvailableTable(branch_id, number_of_guests, reservationTime) {
  const guests = Number(number_of_guests);
  const available = await getAvailableTablesForSlot(branch_id, reservationTime);
  const plan = planTableAllocation(
    guests,
    available.map((t) => t.toJSON ? t.toJSON() : t)
  );

  if (plan) {
    const tables = plan.tables.map((row) => available.find((t) => t.table_id === row.table_id) || row);
    return { tables, table: tables[0], multi: plan.multi };
  }

  const conflictIds = await getConflictTableIds(branch_id, reservationTime);
  const fallback = await resolveNoTableMessage(branch_id, guests, reservationTime, conflictIds);
  return { message: fallback.message };
}

/**
 * Trong transaction: khóa bàn, ghép nhiều bàn khi một bàn không đủ chỗ.
 */
async function pickAvailableTableWithLock(branch_id, number_of_guests, reservationTime, transaction) {
  const guests = Number(number_of_guests);
  const triedTableIds = new Set();

  while (true) {
    const exclude = [...triedTableIds];
    const candidates = await Table.findAll({
      where: {
        branch_id,
        status: "available",
        ...(exclude.length > 0 ? { table_id: { [Op.notIn]: exclude } } : {}),
      },
      order: [["table_id", "ASC"]],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    const free = [];
    for (const table of candidates) {
      const overlap = await hasOverlappingReservation(table.table_id, branch_id, reservationTime, {
        transaction,
      });
      if (overlap) {
        triedTableIds.add(table.table_id);
      } else {
        free.push(table);
      }
    }

    const plan = planTableAllocation(
      guests,
      free.map((t) => t.toJSON())
    );

    if (!plan) {
      const fallback = await resolveNoTableMessage(branch_id, guests, reservationTime, [
        ...triedTableIds,
      ], { transaction });
      return { message: fallback.message };
    }

    const picked = plan.tables
      .map((row) => free.find((t) => t.table_id === row.table_id))
      .filter(Boolean);

    if (picked.length !== plan.tables.length) {
      for (const row of plan.tables) triedTableIds.add(row.table_id);
      continue;
    }

    let raceDetected = false;
    for (const table of picked) {
      const overlap = await hasOverlappingReservation(
        table.table_id,
        branch_id,
        reservationTime,
        { transaction }
      );
      if (overlap) {
        triedTableIds.add(table.table_id);
        raceDetected = true;
        break;
      }
    }

    if (raceDetected) continue;

    return {
      tables: picked,
      table: picked[0],
      multi: plan.multi,
    };
  }
}

/**
 * Tạo đặt bàn — một hoặc nhiều reservation (cùng booking_group_id khi ghép bàn).
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

    if (!picked.tables?.length) {
      const err = new Error(picked.message);
      err.code = "NO_TABLE";
      throw err;
    }

    const multi = picked.tables.length > 1;
    const bookingGroupId = multi ? crypto.randomUUID() : null;
    const tableLabel = formatTableNumbers(picked.tables.map((t) => t.toJSON()));
    const groupNote = multi
      ? [note, `(Nhóm ${guests} khách — ghép bàn liền kề: ${tableLabel})`]
          .filter(Boolean)
          .join(" ")
          .trim()
      : note || null;

    const reservations = [];
    for (const table of picked.tables) {
      const reservation = await Reservation.create(
        {
          user_id,
          branch_id,
          table_id: table.table_id,
          reservation_time,
          number_of_guests: guests,
          note: groupNote,
          booking_group_id: bookingGroupId,
          status: "confirmed",
          created_at: new Date(),
        },
        { transaction }
      );
      reservations.push(reservation);
    }

    return {
      reservation: reservations[0],
      reservations,
      tables: picked.tables,
      table: picked.table,
      multi,
      booking_group_id: bookingGroupId,
    };
  });
}

/**
 * Hủy toàn bộ nhóm đặt bàn (nếu có booking_group_id).
 */
async function cancelReservationGroup(reservation, { transaction } = {}) {
  const groupId = reservation.booking_group_id;
  if (!groupId) {
    reservation.status = "cancelled";
    await reservation.save({ transaction });
    return [reservation];
  }

  const siblings = await Reservation.findAll({
    where: {
      booking_group_id: groupId,
      user_id: reservation.user_id,
      status: { [Op.in]: CANCELABLE_RESERVATION_STATUSES },
    },
    transaction,
  });

  for (const row of siblings) {
    row.status = "cancelled";
    await row.save({ transaction });
  }
  return siblings;
}

module.exports = {
  CONFLICT_WINDOW_MS,
  getTimeWindow,
  getConflictTableIds,
  pickAvailableTable,
  createReservation,
  cancelReservationGroup,
};
