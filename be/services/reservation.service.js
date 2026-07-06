/**
 * SERVICE ĐẶT BÀN — logic nghiệp vụ đặt bàn online, gán bàn, ghép bàn, hủy đặt.
 * Ctrl+F gợi ý: đặt bàn, ghép bàn, buffer 2 giờ, bàn trống, tối đa 2 lượt, cancelReservation
 * Luồng demo: Phần 2 (đặt bàn), Phần 4 (hủy nếu cần)
 * API: POST /api/reservations, GET /api/reservations/available-tables
 */
const db = require("../models");
const { Order, Table, Branch, User } = db;
const sequelize = db.sequelize;
const { Op } = require("sequelize");
const {
  planTableAllocation,
  formatTableNumbers,
  maxAdjacentSeats,
} = require("../utils/tableAllocation");
const {
  linkTablesToOrder,
  getTableIdsForOrder,
  getConflictTableIds: getLinkedConflictTableIds,
  hasOverlappingBooking: hasLinkedOverlappingBooking,
} = require("../utils/orderTableLinks");
const tableSummaryService = require("./admin/tableSummary.service");
const { CANCELABLE_RESERVATION_STATUSES } = require("../utils/reservationStatus");
const { ORDER_STATUS } = require("../utils/orderStatus");

const RESERVATION_BUFFER_MS = 2 * 60 * 60 * 1000;
const FUTURE_ACTIVE_LIMIT = 2;

/** [ĐẶT BÀN] Tính khung giữ bàn: từ giờ đến + buffer 2 giờ (RESERVATION_BUFFER_MS). Ctrl+F: buffer, time window */
function getTimeWindow(arrivalTime) {
  const t = new Date(arrivalTime);
  return {
    windowStart: t,
    windowEnd: new Date(t.getTime() + RESERVATION_BUFFER_MS),
  };
}

/** [ĐẶT BÀN] Lấy danh sách table_id đã bị chiếm trong khung giờ (trùng lịch). Ctrl+F: conflict, trùng lịch */
async function getConflictTableIds(branch_id, arrivalTime, { transaction } = {}) {
  const { windowStart, windowEnd } = getTimeWindow(arrivalTime);
  return getLinkedConflictTableIds(branch_id, windowStart, windowEnd, { transaction });
}

/** [ĐẶT BÀN] Kiểm tra một bàn cụ thể có đặt trùng khung giờ không. Ctrl+F: overlap, trùng bàn */
async function hasOverlappingBooking(table_id, branch_id, arrivalTime, { transaction } = {}) {
  const { windowStart, windowEnd } = getTimeWindow(arrivalTime);
  return hasLinkedOverlappingBooking(table_id, branch_id, windowStart, windowEnd, {
    transaction,
  });
}

/** [ĐẶT BÀN] Liệt kê bàn status=available, không conflict, dùng khi preview/ghép bàn. Ctrl+F: bàn trống, available tables */
async function getAvailableTablesForSlot(branch_id, arrivalTime, excludeTableIds = [], { transaction } = {}) {
  const conflictIds = await getConflictTableIds(branch_id, arrivalTime, { transaction });
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
    const overlap = await hasOverlappingBooking(table.table_id, branch_id, arrivalTime, {
      transaction,
    });
    if (!overlap) free.push(table);
  }
  return free;
}

/**
 * [ĐẶT BÀN] Sinh thông báo lỗi khi không còn bàn: thiếu chỗ, không ghép liền kề, đã kín slot.
 * Ctrl+F: không còn bàn, kín bàn, ghép bàn liền kề
 */
async function resolveNoTableMessage(branch_id, guests, arrivalTime, conflictIds, { transaction } = {}) {
  const available = await getAvailableTablesForSlot(branch_id, arrivalTime, conflictIds, {
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
 * [ĐẶT BÀN] Chọn bàn (hoặc ghép bàn) cho khách — không lock DB, dùng GET available-tables.
 * Ctrl+F: pickAvailableTable, kiểm tra bàn trống, preview đặt bàn
 */
async function pickAvailableTable(branch_id, number_of_guests, arrivalTime) {
  await tableSummaryService.expireReservationsForBranch(branch_id);

  const guests = Number(number_of_guests);
  const available = await getAvailableTablesForSlot(branch_id, arrivalTime);
  const plan = planTableAllocation(
    guests,
    available.map((t) => (t.toJSON ? t.toJSON() : t))
  );

  if (plan) {
    const tables = plan.tables.map((row) => available.find((t) => t.table_id === row.table_id) || row);
    return { tables, table: tables[0], multi: plan.multi };
  }

  const conflictIds = await getConflictTableIds(branch_id, arrivalTime);
  const fallback = await resolveNoTableMessage(branch_id, guests, arrivalTime, conflictIds);
  return { message: fallback.message };
}

/**
 * [ĐẶT BÀN] Chọn bàn có row-lock trong transaction — tránh race khi nhiều khách đặt cùng lúc.
 * Ctrl+F: pickAvailableTableWithLock, lock bàn, ghép bàn
 */
async function pickAvailableTableWithLock(branch_id, number_of_guests, arrivalTime, transaction) {
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
      const overlap = await hasOverlappingBooking(table.table_id, branch_id, arrivalTime, {
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
      const fallback = await resolveNoTableMessage(branch_id, guests, arrivalTime, [
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
      const overlap = await hasOverlappingBooking(table.table_id, branch_id, arrivalTime, {
        transaction,
      });
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
 * [ĐẶT BÀN] Tạo lượt đặt bàn — tạo Order type=reservation, gán bàn, link order_tables nếu ghép.
 * Ràng buộc: tối đa 2 lượt tương lai/khách, tài khoản active, chi nhánh mở.
 * Luồng demo: Phần 2 — Bước 2.3 (/booking). Ctrl+F: createReservation, đặt bàn thành công
 */
async function createReservation({ user_id, branch_id, reservation_time, number_of_guests, note }) {
  const guests = Number(number_of_guests);
  const arrivalDate = new Date(reservation_time);
  const arrival_time = arrivalDate.toISOString();
  const expected_end_time = new Date(arrivalDate.getTime() + RESERVATION_BUFFER_MS);

  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(user_id, {
      attributes: ["user_id", "is_active", "locked"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user || user.is_active === false || user.locked === true) {
      const err = new Error("Tài khoản không hợp lệ hoặc đã bị khóa.");
      err.code = "USER_LOCKED";
      throw err;
    }

    const now = new Date();
    const activeFutureOrders = await Order.findAll({
      where: {
        user_id,
        order_type: "reservation",
        status: { [Op.in]: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED] },
        arrival_time: { [Op.gt]: now },
      },
      attributes: ["order_id"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (activeFutureOrders.length >= FUTURE_ACTIVE_LIMIT) {
      const err = new Error(`Bạn chỉ được có tối đa ${FUTURE_ACTIVE_LIMIT} lượt đặt bàn trong tương lai.`);
      err.code = "FUTURE_LIMIT";
      throw err;
    }

    const branch = await Branch.findByPk(branch_id, {
      attributes: ["branch_id", "open_time", "close_time", "is_active"],
      transaction,
    });
    if (!branch || branch.is_active === false) {
      const err = new Error("Chi nhánh không tồn tại hoặc đang tạm ngưng hoạt động.");
      err.code = "BRANCH_INVALID";
      throw err;
    }

    await tableSummaryService.expireReservationsForBranch(branch_id);

    const picked = await pickAvailableTableWithLock(branch_id, guests, arrival_time, transaction);

    if (!picked.tables?.length) {
      const err = new Error(picked.message);
      err.code = "NO_TABLE";
      throw err;
    }

    const multi = picked.tables.length > 1;
    const primaryTable = picked.tables[0];
    const tableLabel = formatTableNumbers(picked.tables.map((t) => t.toJSON()));
    const groupNote = multi
      ? [note, `(Nhóm ${guests} khách — ghép bàn liền kề: ${tableLabel})`]
          .filter(Boolean)
          .join(" ")
          .trim()
      : note || null;

    const order = await Order.create(
      {
        user_id,
        branch_id,
        table_id: primaryTable.table_id,
        arrival_time,
        expected_end_time,
        number_of_guests: guests,
        note: groupNote,
        booking_group_id: null,
        order_type: "reservation",
        status: ORDER_STATUS.PENDING,
        payment_status: "unpaid",
        total_amount: 0,
        created_at: new Date(),
      },
      { transaction }
    );

    if (multi) {
      await linkTablesToOrder(order.order_id, picked.tables, { transaction });
    }

    return {
      order,
      orders: [order],
      reservation: order,
      reservations: [order],
      tables: picked.tables,
      table: picked.table,
      multi,
      booking_group_id: null,
    };
  });
}

/**
 * [HỦY ĐẶT BÀN] Hủy một order hoặc cả nhóm booking_group_id, set status=cancelled.
 * Ctrl+F: cancelReservation, hủy đặt bàn
 */
async function cancelReservationGroup(orderRow, { transaction } = {}) {
  const groupId = orderRow.booking_group_id;
  if (groupId) {
    const siblings = await Order.findAll({
      where: {
        booking_group_id: groupId,
        user_id: orderRow.user_id,
        status: { [Op.in]: CANCELABLE_RESERVATION_STATUSES },
      },
      transaction,
    });

    for (const row of siblings) {
      row.status = ORDER_STATUS.CANCELLED;
      await row.save({ transaction });
    }
    return siblings;
  }

  orderRow.status = ORDER_STATUS.CANCELLED;
  await orderRow.save({ transaction });
  return [orderRow];
}

module.exports = {
  RESERVATION_BUFFER_MS,
  FUTURE_ACTIVE_LIMIT,
  getTimeWindow,
  getConflictTableIds,
  pickAvailableTable,
  createReservation,
  cancelReservationGroup,
};
