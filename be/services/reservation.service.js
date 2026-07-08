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

// Buffer giữ bàn: mỗi lượt đặt "chiếm" bàn trong 2 giờ (2 * 60 phút * 60 giây * 1000 ms).
const RESERVATION_BUFFER_MS = 2 * 60 * 60 * 1000;
// Mỗi khách chỉ được giữ tối đa 2 lượt đặt trong tương lai (chống ôm bàn / spam đặt).
const FUTURE_ACTIVE_LIMIT = 2;

/** [ĐẶT BÀN] Tính khung giữ bàn: từ giờ đến + buffer 2 giờ (RESERVATION_BUFFER_MS). Ctrl+F: buffer, time window */
function getTimeWindow(arrivalTime) {
  // Mốc bắt đầu = giờ khách hẹn đến.
  const t = new Date(arrivalTime);
  return {
    windowStart: t,
    // Mốc kết thúc = giờ đến + 2 giờ; trong khoảng này bàn coi như bị giữ.
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
  // Lấy các bàn đã bị chiếm trong khung giờ, gộp thêm bàn cần loại thủ công → tập loại trừ.
  const conflictIds = await getConflictTableIds(branch_id, arrivalTime, { transaction });
  const exclude = new Set([...conflictIds, ...excludeTableIds]);

  // Lấy bàn đang "available" của chi nhánh, bỏ các bàn trong tập loại trừ.
  const rows = await Table.findAll({
    where: {
      branch_id,
      status: "available",
      ...(exclude.size > 0 ? { table_id: { [Op.notIn]: [...exclude] } } : {}),
    },
    order: [["table_id", "ASC"]],
    transaction,
  });

  // Lọc lần 2: loại bàn có lịch đặt chồng khung giờ (kể cả qua bàn ghép order_tables).
  // Trạng thái "available" chưa đủ vì bàn có thể đang được GIỮ cho lượt đặt tương lai.
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
  // Lấy bàn còn trống để phân tích lý do vì sao không xếp được.
  const available = await getAvailableTablesForSlot(branch_id, arrivalTime, conflictIds, {
    transaction,
  });
  const totalSeats = available.reduce((sum, t) => sum + t.capacity, 0); // tổng ghế rải rác
  const adjacentSeats = maxAdjacentSeats(available.map((t) => t.toJSON())); // ghế của cụm liền kề lớn nhất

  // Lý do 1: chi nhánh không có bàn nào (dữ liệu trống).
  const hasAnyCapacity = await Table.findOne({
    where: { branch_id, capacity: { [Op.gte]: 1 } },
    transaction,
  });
  if (!hasAnyCapacity) {
    return {
      message: `Chi nhánh không có bàn đủ chỗ cho ${guests} khách. Vui lòng giảm số khách hoặc chọn chi nhánh khác.`,
    };
  }

  // Lý do 2: tổng ghế trống < số khách (thật sự thiếu chỗ trong khung giờ này).
  if (totalSeats < guests) {
    const maxSingle = await Table.max("capacity", { where: { branch_id }, transaction });
    if (maxSingle && maxSingle < guests) {
      return {
        message: `Không đủ bàn trống cho ${guests} khách (tối đa ghép được ~${totalSeats} chỗ trong khung giờ này). Vui lòng giảm số khách, chọn giờ khác hoặc liên hệ nhà hàng.`,
      };
    }
  }

  // Lý do 3: đủ ghế nhưng nằm rải rác, không có DÃY bàn liền kề đủ chỗ để ghép.
  if (totalSeats >= guests && adjacentSeats < guests) {
    return {
      message: `Có đủ chỗ rải rác nhưng không có dãy bàn liền kề cho ${guests} khách (khu liền kề tối đa ~${adjacentSeats} chỗ). Vui lòng chọn giờ khác hoặc liên hệ nhà hàng.`,
    };
  }

  // Lý do 4: có bàn đủ chỗ nhưng đã bị đặt trùng trong slot (table_id nằm trong danh sách conflict).
  const bookedInSlot = await Table.findOne({
    where: {
      branch_id,
      capacity: { [Op.gte]: guests },
      status: "available",
      // Nếu không có conflict thì dùng table_id:-1 (không tồn tại) để query chắc chắn không khớp.
      ...(conflictIds.length > 0 ? { table_id: { [Op.in]: conflictIds } } : { table_id: -1 }),
    },
    transaction,
  });
  if (bookedInSlot) {
    return {
      message: "Đã kín bàn trong khung giờ này. Vui lòng chọn ngày hoặc giờ khác.",
    };
  }

  // Mặc định: không rơi vào lý do cụ thể nào ở trên.
  return {
    message: "Hiện không còn bàn trống. Vui lòng thử thời gian khác hoặc liên hệ nhà hàng.",
  };
}

/**
 * [ĐẶT BÀN] Chọn bàn (hoặc ghép bàn) cho khách — không lock DB, dùng GET available-tables.
 * Ctrl+F: pickAvailableTable, kiểm tra bàn trống, preview đặt bàn
 */
async function pickAvailableTable(branch_id, number_of_guests, arrivalTime) {
  // Dọn no-show trước để phản ánh đúng bàn trống (bản preview không lock DB).
  await tableSummaryService.expireReservationsForBranch(branch_id);

  const guests = Number(number_of_guests);
  // Lấy bàn trống thật sự trong khung giờ rồi lập kế hoạch chọn/ghép bàn.
  const available = await getAvailableTablesForSlot(branch_id, arrivalTime);
  const plan = planTableAllocation(
    guests,
    available.map((t) => (t.toJSON ? t.toJSON() : t))
  );

  // Có phương án → map lại về object Table gốc và trả về (bàn đầu là bàn chính).
  if (plan) {
    const tables = plan.tables.map((row) => available.find((t) => t.table_id === row.table_id) || row);
    return { tables, table: tables[0], multi: plan.multi };
  }

  // Không có phương án → trả thông báo lỗi giải thích lý do hết bàn.
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
  // Ghi nhớ các bàn đã thử mà không dùng được, để vòng lặp sau bỏ qua (tránh lặp vô hạn).
  const triedTableIds = new Set();

  // Lặp cho tới khi chọn được phương án bàn ổn định hoặc xác định hết bàn.
  while (true) {
    const exclude = [...triedTableIds];
    // Khóa các bàn available (SELECT ... FOR UPDATE) để 2 giao dịch không cùng giành 1 bàn.
    const candidates = await Table.findAll({
      where: {
        branch_id,
        status: "available",
        ...(exclude.length > 0 ? { table_id: { [Op.notIn]: exclude } } : {}),
      },
      order: [["table_id", "ASC"]],
      lock: transaction.LOCK.UPDATE, // row-lock chống race condition
      transaction,
    });

    // Lọc bỏ bàn bị trùng lịch trong khung giờ; bàn trùng thì đánh dấu đã thử.
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

    // Lập kế hoạch: 1 bàn đủ chỗ hoặc ghép các bàn liền kề.
    const plan = planTableAllocation(
      guests,
      free.map((t) => t.toJSON())
    );

    // Không có phương án nào → sinh thông báo lỗi phù hợp và trả về (thoát vòng lặp).
    if (!plan) {
      const fallback = await resolveNoTableMessage(branch_id, guests, arrivalTime, [
        ...triedTableIds,
      ], { transaction });
      return { message: fallback.message };
    }

    // Đối chiếu bàn trong kế hoạch với danh sách bàn đã lock được (đã "free").
    const picked = plan.tables
      .map((row) => free.find((t) => t.table_id === row.table_id))
      .filter(Boolean);

    // Nếu thiếu bàn nào so với kế hoạch → đánh dấu đã thử rồi lặp lại lập kế hoạch mới.
    if (picked.length !== plan.tables.length) {
      for (const row of plan.tables) triedTableIds.add(row.table_id);
      continue;
    }

    // Kiểm tra lần cuối từng bàn đã chọn có bị "cướp" (đặt trùng) giữa chừng không.
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

    // Có bàn bị chiếm mất → thử lại vòng mới với danh sách bàn còn lại.
    if (raceDetected) continue;

    // Phương án ổn định → trả về (bàn đầu là bàn chính, multi=true nếu ghép nhiều bàn).
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
  // Lưu giờ đến dạng ISO (chuẩn, không lệch timezone khi ghi DB).
  const arrival_time = arrivalDate.toISOString();
  // Giờ kết thúc dự kiến = giờ đến + 2 giờ (khung giữ bàn).
  const expected_end_time = new Date(arrivalDate.getTime() + RESERVATION_BUFFER_MS);

  // Bọc toàn bộ trong 1 transaction: hoặc tạo được order + gán bàn trọn vẹn, hoặc rollback hết.
  return sequelize.transaction(async (transaction) => {
    // B1: khóa & kiểm tra tài khoản khách (chặn user bị khóa/vô hiệu hóa đặt bàn).
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

    // B2: đếm số lượt đặt tương lai còn hiệu lực (pending/confirmed, giờ đến > hiện tại).
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
    // Vượt hạn mức (2 lượt) → từ chối.
    if (activeFutureOrders.length >= FUTURE_ACTIVE_LIMIT) {
      const err = new Error(`Bạn chỉ được có tối đa ${FUTURE_ACTIVE_LIMIT} lượt đặt bàn trong tương lai.`);
      err.code = "FUTURE_LIMIT";
      throw err;
    }

    // B3: kiểm tra chi nhánh tồn tại & đang hoạt động.
    const branch = await Branch.findByPk(branch_id, {
      attributes: ["branch_id", "open_time", "close_time", "is_active"],
      transaction,
    });
    if (!branch || branch.is_active === false) {
      const err = new Error("Chi nhánh không tồn tại hoặc đang tạm ngưng hoạt động.");
      err.code = "BRANCH_INVALID";
      throw err;
    }

    // B4: dọn các lượt đặt quá hạn (no-show) để giải phóng bàn trước khi chọn.
    await tableSummaryService.expireReservationsForBranch(branch_id);

    // B5: chọn/ghép bàn có row-lock (an toàn khi nhiều khách đặt cùng lúc).
    const picked = await pickAvailableTableWithLock(branch_id, guests, arrival_time, transaction);

    // Không có bàn phù hợp → ném lỗi kèm thông báo cụ thể.
    if (!picked.tables?.length) {
      const err = new Error(picked.message);
      err.code = "NO_TABLE";
      throw err;
    }

    // B6: chuẩn bị dữ liệu order. multi=true nghĩa là phải ghép nhiều bàn.
    const multi = picked.tables.length > 1;
    const primaryTable = picked.tables[0]; // bàn chính lưu vào orders.table_id
    const tableLabel = formatTableNumbers(picked.tables.map((t) => t.toJSON()));
    // Nếu ghép bàn thì thêm chú thích vào note cho nhân viên dễ nhận biết.
    const groupNote = multi
      ? [note, `(Nhóm ${guests} khách — ghép bàn liền kề: ${tableLabel})`]
          .filter(Boolean)
          .join(" ")
          .trim()
      : note || null;

    // B7: tạo bản ghi Order (loại reservation, chưa thanh toán, tổng tiền 0 lúc đặt).
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

    // B8: nếu ghép bàn → ghi các liên kết vào bảng order_tables (bàn đầu là primary).
    if (multi) {
      await linkTablesToOrder(order.order_id, picked.tables, { transaction });
    }

    // Trả về nhiều alias (order/reservation/tables...) cho controller/FE dùng linh hoạt.
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
  // TH có nhóm đặt (booking_group_id): hủy tất cả order cùng nhóm của chính khách đó.
  if (groupId) {
    const siblings = await Order.findAll({
      where: {
        booking_group_id: groupId,
        user_id: orderRow.user_id,
        // Chỉ hủy các order còn ở trạng thái được phép hủy (pending/confirmed).
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

  // TH đơn lẻ: chỉ hủy chính order này.
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
