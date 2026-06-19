const { Order, Table, User, sequelize } = require("../../models");
const { Op } = require("sequelize");
const tableSummaryService = require("./tableSummary.service");
const { TABLE_STATUS, isBookableTableStatus } = require("../../utils/tableStatus");
const {
  CHECK_IN_RESERVATION_STATUSES,
  ACTIVE_SESSION_STATUSES,
  RESERVATION_STATUS,
} = require("../../utils/reservationStatus");

const CHECK_IN_STATUSES = CHECK_IN_RESERVATION_STATUSES;

function mapArrivalRow(o, { groupTables } = {}) {
  const data = o.toJSON();
  const canCheckIn = CHECK_IN_STATUSES.includes(data.status);
  const alreadyCheckedIn = ACTIVE_SESSION_STATUSES.includes(data.status);
  const tables = groupTables?.length
    ? groupTables
    : data.Table
      ? [
          {
            table_id: data.Table.table_id,
            table_number: data.Table.table_number,
            capacity: data.Table.capacity,
            status: data.Table.status,
          },
        ]
      : [];

  return {
    order_id: data.order_id,
    reservation_id: data.order_id,
    booking_group_id: data.booking_group_id || null,
    arrival_time: data.arrival_time,
    reservation_time: data.arrival_time,
    number_of_guests: data.number_of_guests,
    status: data.status,
    order_type: data.order_type,
    canCheckIn,
    alreadyCheckedIn,
    multiTable: tables.length > 1,
    guest: data.User
      ? {
          full_name: data.User.full_name,
          phone: data.User.phone,
        }
      : null,
    table: tables[0] || null,
    tables,
  };
}

/** Gộp các đặt bàn cùng booking_group_id thành một dòng tiếp nhận. */
function dedupeArrivalRows(rows) {
  const seenGroups = new Set();
  const result = [];

  for (const o of rows) {
    const data = o.toJSON();
    const gid = data.booking_group_id;
    if (!gid) {
      result.push(mapArrivalRow(o));
      continue;
    }
    if (seenGroups.has(gid)) continue;
    seenGroups.add(gid);

    const groupRows = rows.filter((x) => x.toJSON().booking_group_id === gid);
    const groupTables = groupRows
      .map((x) => x.toJSON().Table)
      .filter(Boolean)
      .map((t) => ({
        table_id: t.table_id,
        table_number: t.table_number,
        capacity: t.capacity,
        status: t.status,
      }));

    result.push(mapArrivalRow(groupRows[0], { groupTables }));
  }

  return result;
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

function arrivalTimeWindow() {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setTime(windowStart.getTime() - 2 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { windowStart, windowEnd };
}

async function listUpcomingArrivals(branchId) {
  await tableSummaryService.expireReservationsForBranch(branchId);
  const { windowStart, windowEnd } = arrivalTimeWindow();

  const rows = await Order.findAll({
    where: {
      branch_id: branchId,
      order_type: "reservation",
      status: { [Op.in]: [...CHECK_IN_STATUSES, ...ACTIVE_SESSION_STATUSES] },
      arrival_time: { [Op.between]: [windowStart, windowEnd] },
    },
    include: arrivalIncludes,
    order: [["arrival_time", "ASC"]],
    limit: 30,
  });

  return dedupeArrivalRows(rows);
}

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
    orConditions.push({ order_id: parseInt(idStr, 10) });
  }

  const where = {
    branch_id: branchId,
    order_type: "reservation",
    status: { [Op.in]: [...CHECK_IN_STATUSES, ...ACTIVE_SESSION_STATUSES] },
    [Op.or]: orConditions,
  };
  if (!searchById) {
    where.arrival_time = { [Op.between]: [windowStart, windowEnd] };
  }

  const rows = await Order.findAll({
    where,
    include: arrivalIncludes,
    order: [["arrival_time", "ASC"]],
    limit: 20,
    subQuery: false,
  });

  return dedupeArrivalRows(rows);
}

async function confirmArrival(orderId, branchId) {
  await tableSummaryService.expireReservationsForBranch(branchId);

  const order = await Order.findOne({
    where: { order_id: orderId, branch_id: branchId, order_type: "reservation" },
    include: [{ model: Table }],
  });

  if (!order) {
    const err = new Error("Không tìm thấy đặt bàn");
    err.code = "NOT_FOUND";
    throw err;
  }

  const groupId = order.booking_group_id;
  const partyOrders = groupId
    ? await Order.findAll({
        where: { booking_group_id: groupId, branch_id: branchId, order_type: "reservation" },
        include: [{ model: Table }],
      })
    : [order];

  const allCheckedIn = partyOrders.every((o) => ACTIVE_SESSION_STATUSES.includes(o.status));
  if (allCheckedIn) {
    return {
      order: order.toJSON(),
      reservation: order.toJSON(),
      table: order.Table?.toJSON?.() ?? order.Table,
      alreadyCheckedIn: true,
    };
  }

  const toCheckIn = partyOrders.filter((o) => CHECK_IN_STATUSES.includes(o.status));
  if (!toCheckIn.length) {
    const err = new Error("Đặt bàn này không thể tiếp nhận (đã hủy hoặc hoàn tất)");
    err.code = "INVALID_STATUS";
    throw err;
  }

  for (const sess of toCheckIn) {
    if (!sess.table_id) {
      const err = new Error("Đặt bàn chưa gán bàn");
      err.code = "NO_TABLE";
      throw err;
    }
    const table = await Table.findByPk(sess.table_id);
    if (!table || table.branch_id !== branchId) {
      const err = new Error("Bàn không hợp lệ");
      err.code = "NO_TABLE";
      throw err;
    }
    if (table.status === "occupied") {
      const activeOnTable = await Order.findOne({
        where: {
          table_id: table.table_id,
          order_id: { [Op.ne]: sess.order_id },
          status: { [Op.in]: ACTIVE_SESSION_STATUSES },
        },
      });
      if (activeOnTable) {
        const err = new Error(`Bàn ${table.table_number} đang phục vụ khách khác`);
        err.code = "TABLE_BUSY";
        throw err;
      }
    }
  }

  await sequelize.transaction(async (t) => {
    for (const sess of toCheckIn) {
      await sess.update({ status: RESERVATION_STATUS.PRE_ORDERED }, { transaction: t });
      const table = await Table.findByPk(sess.table_id, { transaction: t });
      if (table && isBookableTableStatus(table.status)) {
        await table.update({ status: TABLE_STATUS.OCCUPIED }, { transaction: t });
      }
    }
  });

  await order.reload({
    include: [{ model: Table }, { model: User, attributes: ["full_name", "phone"] }],
  });

  return {
    order: order.toJSON(),
    reservation: order.toJSON(),
    table: order.Table?.toJSON?.() ?? order.Table,
    checkedInCount: toCheckIn.length,
    alreadyCheckedIn: false,
  };
}

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
  const upcoming = await Order.findOne({
    where: {
      table_id: tableId,
      order_type: "reservation",
      status: "confirmed",
      arrival_time: { [Op.gt]: now },
    },
  });

  if (upcoming) {
    const err = new Error("Bàn có đặt trước sắp tới, không nên xếp khách vãng lai");
    err.code = "TABLE_RESERVED";
    throw err;
  }

  const existing = await Order.findOne({
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

  let order;
  await sequelize.transaction(async (t) => {
    order = await Order.create(
      {
        user_id: staffUserId,
        branch_id: branchId,
        table_id: tableId,
        arrival_time: now,
        number_of_guests: guests,
        status: RESERVATION_STATUS.PRE_ORDERED,
        order_type: "walk_in",
        payment_status: "unpaid",
        created_at: now,
      },
      { transaction: t }
    );
    await table.update({ status: "occupied" }, { transaction: t });
  });

  return {
    order: order.toJSON(),
    reservation: order.toJSON(),
    table: table.toJSON(),
  };
}

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

  const upcomingList = await Order.findAll({
    where: {
      table_id: { [Op.in]: tableIds },
      order_type: "reservation",
      status: "confirmed",
      arrival_time: { [Op.gt]: now },
    },
    attributes: ["table_id", "arrival_time", "number_of_guests"],
  });

  const upcomingByTable = new Map(upcomingList.map((o) => [o.table_id, o.toJSON()]));

  return tables
    .map((t) => {
      const data = t.toJSON();
      const upcoming = upcomingByTable.get(t.table_id) || null;
      return {
        ...data,
        walkInAvailable: !upcoming,
        upcomingReservation: upcoming
          ? {
              ...upcoming,
              reservation_time: upcoming.arrival_time,
            }
          : null,
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
