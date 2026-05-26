const { Reservation, Table, User, sequelize } = require("../../models");
const { Op } = require("sequelize");
const tableSummaryService = require("./tableSummary.service");
const { TABLE_STATUS, isBookableTableStatus } = require("../../utils/tableStatus");
const {
  CHECK_IN_RESERVATION_STATUSES,
  ACTIVE_SESSION_STATUSES,
  RESERVATION_STATUS,
} = require("../../utils/reservationStatus");

const CHECK_IN_STATUSES = CHECK_IN_RESERVATION_STATUSES;

function mapArrivalRow(r) {
  const data = r.toJSON();
  const canCheckIn = CHECK_IN_STATUSES.includes(data.status);
  const alreadyCheckedIn = ACTIVE_SESSION_STATUSES.includes(data.status);
  return {
    reservation_id: data.reservation_id,
    reservation_time: data.reservation_time,
    number_of_guests: data.number_of_guests,
    status: data.status,
    canCheckIn,
    alreadyCheckedIn,
    guest: data.User
      ? {
          full_name: data.User.full_name,
          phone: data.User.phone,
        }
      : null,
    table: data.Table
      ? {
          table_id: data.Table.table_id,
          table_number: data.Table.table_number,
          capacity: data.Table.capacity,
          status: data.Table.status,
        }
      : null,
  };
}

const arrivalIncludes = [
  {
    model: User,
    attributes: ["user_id", "full_name", "phone"],
  },
  {
    model: Table,
    attributes: ["table_id", "table_number", "capacity", "status", "branch_id"],
  },
];

/** Khung giờ hiển thị đặt bàn: từ đầu ngày (lùi 2h) đến 7 ngày sau — tránh lọt đặt bàn xa trong ngày/tuần. */
function arrivalTimeWindow() {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setTime(windowStart.getTime() - 2 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { windowStart, windowEnd };
}

/**
 * Danh sách đặt bàn trong khung giờ (không cần nhập từ khóa) — dùng khi mở dialog tiếp nhận.
 */
async function listUpcomingArrivals(branchId) {
  await tableSummaryService.expireReservationsForBranch(branchId);
  const { windowStart, windowEnd } = arrivalTimeWindow();

  const rows = await Reservation.findAll({
    where: {
      branch_id: branchId,
      status: { [Op.in]: [...CHECK_IN_STATUSES, ...ACTIVE_SESSION_STATUSES] },
      reservation_time: { [Op.between]: [windowStart, windowEnd] },
    },
    include: arrivalIncludes,
    order: [["reservation_time", "ASC"]],
    limit: 30,
  });

  return rows.map(mapArrivalRow);
}

/**
 * Tìm đặt bàn chờ tiếp nhận theo SĐT / tên / mã đặt bàn.
 */
async function searchArrivals(branchId, query) {
  const q = String(query || "").trim();
  if (!q) return [];

  await tableSummaryService.expireReservationsForBranch(branchId);

  const { windowStart, windowEnd } = arrivalTimeWindow();

  const orConditions = [
    { "$User.phone$": { [Op.iLike]: `%${q}%` } },
    { "$User.full_name$": { [Op.iLike]: `%${q}%` } },
  ];

  const idStr = q.replace(/^#/, "").trim();
  const searchById = /^\d+$/.test(idStr);
  if (searchById) {
    orConditions.push({ reservation_id: parseInt(idStr, 10) });
  }

  const where = {
    branch_id: branchId,
    status: { [Op.in]: [...CHECK_IN_STATUSES, ...ACTIVE_SESSION_STATUSES] },
    [Op.or]: orConditions,
  };
  if (!searchById) {
    where.reservation_time = { [Op.between]: [windowStart, windowEnd] };
  }

  const rows = await Reservation.findAll({
    where,
    include: arrivalIncludes,
    order: [["reservation_time", "ASC"]],
    limit: 20,
    subQuery: false,
  });

  return rows.map(mapArrivalRow);
}

/**
 * Xác nhận khách có đặt trước → bàn occupied, phiên pre-ordered.
 */
async function confirmArrival(reservationId, branchId) {
  await tableSummaryService.expireReservationsForBranch(branchId);

  const reservation = await Reservation.findOne({
    where: { reservation_id: reservationId, branch_id: branchId },
    include: [{ model: Table }],
  });

  if (!reservation) {
    const err = new Error("Không tìm thấy đặt bàn");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (ACTIVE_SESSION_STATUSES.includes(reservation.status)) {
    return {
      reservation: reservation.toJSON(),
      table: reservation.Table?.toJSON?.() ?? reservation.Table,
      alreadyCheckedIn: true,
    };
  }

  if (!CHECK_IN_STATUSES.includes(reservation.status)) {
    const err = new Error("Đặt bàn này không thể tiếp nhận (đã hủy hoặc hoàn tất)");
    err.code = "INVALID_STATUS";
    throw err;
  }

  if (!reservation.table_id) {
    const err = new Error("Đặt bàn chưa gán bàn");
    err.code = "NO_TABLE";
    throw err;
  }

  const table = await Table.findByPk(reservation.table_id);
  if (!table || table.branch_id !== branchId) {
    const err = new Error("Bàn không hợp lệ");
    err.code = "NO_TABLE";
    throw err;
  }

  if (table.status === "occupied") {
    const activeOnTable = await Reservation.findOne({
      where: {
        table_id: table.table_id,
        reservation_id: { [Op.ne]: reservation.reservation_id },
        status: { [Op.in]: ACTIVE_SESSION_STATUSES },
      },
    });
    if (activeOnTable) {
      const err = new Error("Bàn đang phục vụ khách khác");
      err.code = "TABLE_BUSY";
      throw err;
    }
  }

  await sequelize.transaction(async (t) => {
    await reservation.update({ status: RESERVATION_STATUS.PRE_ORDERED }, { transaction: t });
    await table.update({ status: "occupied" }, { transaction: t });
  });

  await reservation.reload({ include: [{ model: Table }, { model: User, attributes: ["full_name", "phone"] }] });

  return {
    reservation: reservation.toJSON(),
    table: reservation.Table?.toJSON?.() ?? reservation.Table,
    alreadyCheckedIn: false,
  };
}

/**
 * Khách vãng lai → chọn bàn trống → occupied + phiên pre-ordered.
 */
async function walkInCheckIn({ branchId, tableId, numberOfGuests, staffUserId }) {
  const guests = Number(numberOfGuests);
  if (!Number.isFinite(guests) || guests < 1) {
    const err = new Error("Số khách không hợp lệ");
    err.code = "INVALID_GUESTS";
    throw err;
  }

  await tableSummaryService.expireReservationsForBranch(branchId);

  const table = await Table.findOne({
    where: { table_id: tableId, branch_id: branchId },
  });

  if (!table) {
    const err = new Error("Không tìm thấy bàn");
    err.code = "TABLE_NOT_FOUND";
    throw err;
  }

  if (!isBookableTableStatus(table.status)) {
    const err = new Error(
      table.status === TABLE_STATUS.CLEANING ? "Bàn đang chờ dọn" : "Bàn không còn trống"
    );
    err.code = "TABLE_NOT_AVAILABLE";
    throw err;
  }

  if (table.capacity < guests) {
    const err = new Error(`Bàn chỉ có ${table.capacity} chỗ`);
    err.code = "CAPACITY_EXCEEDED";
    throw err;
  }

  const now = new Date();
  const upcoming = await Reservation.findOne({
    where: {
      table_id: tableId,
      status: "confirmed",
      reservation_time: { [Op.gt]: now },
    },
  });

  if (upcoming) {
    const err = new Error("Bàn có đặt trước sắp tới, không nên xếp khách vãng lai");
    err.code = "TABLE_RESERVED";
    throw err;
  }

  const existing = await Reservation.findOne({
    where: {
      table_id: tableId,
      status: { [Op.in]: ACTIVE_SESSION_STATUSES },
    },
  });

  if (existing) {
    const err = new Error("Bàn đang có phiên phục vụ");
    err.code = "TABLE_BUSY";
    throw err;
  }

  let reservation;
  await sequelize.transaction(async (t) => {
    reservation = await Reservation.create(
      {
        user_id: staffUserId,
        branch_id: branchId,
        table_id: tableId,
        reservation_time: now,
        number_of_guests: guests,
        status: RESERVATION_STATUS.PRE_ORDERED,
        created_at: now,
      },
      { transaction: t }
    );
    await table.update({ status: "occupied" }, { transaction: t });
  });

  return {
    reservation: reservation.toJSON(),
    table: table.toJSON(),
  };
}

/**
 * Bàn có thể chọn cho walk-in (trống, đủ chỗ).
 */
async function getWalkInTables(branchId, guests = 1) {
  await tableSummaryService.expireReservationsForBranch(branchId);

  const minGuests = Math.max(1, Number(guests) || 1);
  const now = new Date();

  const tables = await Table.findAll({
    where: {
      branch_id: branchId,
      status: "available",
      capacity: { [Op.gte]: minGuests },
    },
    order: [["table_number", "ASC"]],
  });

  const tableIds = tables.map((t) => t.table_id);
  if (!tableIds.length) return [];

  const upcomingList = await Reservation.findAll({
    where: {
      table_id: { [Op.in]: tableIds },
      status: "confirmed",
      reservation_time: { [Op.gt]: now },
    },
    attributes: ["table_id", "reservation_time", "number_of_guests"],
  });

  const upcomingByTable = new Map(upcomingList.map((r) => [r.table_id, r.toJSON()]));

  return tables
    .map((t) => {
      const data = t.toJSON();
      const upcoming = upcomingByTable.get(t.table_id) || null;
      return {
        ...data,
        walkInAvailable: !upcoming,
        upcomingReservation: upcoming,
      };
    })
    .filter((t) => t.walkInAvailable);
}

module.exports = {
  listUpcomingArrivals,
  searchArrivals,
  confirmArrival,
  walkInCheckIn,
  getWalkInTables,
};
