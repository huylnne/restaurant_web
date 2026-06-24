const db = require("../../models");
const Order = db.Order;
const Table = db.Table;
const OrderTable = db.OrderTable;
const { Op } = require("sequelize");
const reservationService = require("../../services/reservation.service");
const { getTableIdsForOrder } = require("../../utils/orderTableLinks");
const {
  CANCELABLE_RESERVATION_STATUSES,
  ACTIVE_RESERVATION_STATUSES,
} = require("../../utils/reservationStatus");
const { ORDER_STATUS } = require("../../utils/orderStatus");
const { MAX_GUESTS } = require("../../middlewares/validateReservationInput");
const { Branch } = db;

const MIN_ADVANCE_MS = 30 * 60 * 1000;
const MAX_ADVANCE_MS = 14 * 24 * 60 * 60 * 1000;
const CANCELLATION_MIN_HOURS = 2;

function buildBranchDateTime(dateLike, timeText) {
  if (!timeText || typeof timeText !== "string") return null;
  const m = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(timeText.trim());
  if (!m) return null;
  const dt = new Date(dateLike);
  dt.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return dt;
}

function mapOrderResponse(order) {
  if (!order) return null;
  const json = order.toJSON ? order.toJSON() : order;
  return {
    ...json,
    reservation_id: json.order_id,
    reservation_time: json.arrival_time,
  };
}

const createReservation = async (req, res) => {
  try {
    const user_id = req.userId;
    const { reservation_time, number_of_guests, note } = req.body;
    const branch_id = parseInt(req.body.branch_id, 10) || 1;

    const reservationDate = new Date(reservation_time);
    if (!reservation_time || Number.isNaN(reservationDate.getTime())) {
      return res.status(400).json({
        message: "Thời gian đặt bàn không hợp lệ.",
      });
    }
    const now = Date.now();
    const reservationMs = reservationDate.getTime();
    if (reservationMs < now + MIN_ADVANCE_MS) {
      return res.status(400).json({
        message: "Thời gian đặt bàn phải cách hiện tại ít nhất 30 phút.",
      });
    }
    if (reservationMs > now + MAX_ADVANCE_MS) {
      return res.status(400).json({
        message: "Chỉ được đặt bàn tối đa trong vòng 14 ngày tới.",
      });
    }

    const branch = await Branch.findByPk(branch_id, {
      attributes: ["branch_id", "open_time", "close_time", "is_active"],
    });
    if (!branch || branch.is_active === false) {
      return res.status(400).json({ message: "Chi nhánh không hợp lệ." });
    }

    if (branch.open_time && branch.close_time) {
      const openAt = buildBranchDateTime(reservationDate, branch.open_time);
      const closeAt = buildBranchDateTime(reservationDate, branch.close_time);
      if (!openAt || !closeAt || reservationDate < openAt || reservationDate > closeAt) {
        return res.status(400).json({
          message: "Thời gian đặt bàn phải nằm trong giờ mở cửa của chi nhánh.",
        });
      }
    }

    if (!number_of_guests || Number(number_of_guests) < 1) {
      return res.status(400).json({ message: "Số lượng khách không hợp lệ." });
    }

    const result = await reservationService.createReservation({
      user_id,
      branch_id,
      reservation_time,
      number_of_guests,
      note,
    });
    const { order, orders, tables, multi, booking_group_id } = result;

    const tableIds = tables.map((t) => t.table_id);
    req.audit = {
      entityId: order.order_id,
      description: multi
        ? `Đặt bàn nhóm #${order.order_id} (${tables.length} bàn)`
        : `Đặt bàn #${order.order_id}, bàn ${tableIds[0]}`,
      metadata: { branch_id, table_ids: tableIds, booking_group_id },
    };
    return res.status(201).json({
      message: multi
        ? `Đặt bàn thành công — ${tables.length} bàn cho ${number_of_guests} khách`
        : "Đặt bàn thành công",
      order: mapOrderResponse(order),
      orders: orders.map(mapOrderResponse),
      reservation: mapOrderResponse(order),
      tables: tables.map((t) => ({
        table_id: t.table_id,
        table_number: t.table_number,
        capacity: t.capacity,
      })),
      multiTable: !!multi,
      booking_group_id,
    });
  } catch (err) {
    if (
      ["NO_TABLE", "FUTURE_LIMIT", "USER_LOCKED", "BRANCH_INVALID"].includes(err.code)
    ) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Lỗi đặt bàn:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const getAvailableTables = async (req, res) => {
  try {
    const { reservation_time, guests } = req.query;
    const branch_id = parseInt(req.query.branch_id, 10) || 1;

    if (!reservation_time || !guests) {
      return res.status(400).json({ message: "Thiếu thông tin yêu cầu" });
    }
    const reservationDate = new Date(reservation_time);
    if (Number.isNaN(reservationDate.getTime())) {
      return res.status(400).json({ message: "Thời gian đặt bàn không hợp lệ" });
    }
    const now = Date.now();
    const reservationMs = reservationDate.getTime();
    if (reservationMs < now + MIN_ADVANCE_MS) {
      return res
        .status(400)
        .json({ message: "Thời gian đặt bàn phải cách hiện tại ít nhất 30 phút." });
    }
    if (reservationMs > now + MAX_ADVANCE_MS) {
      return res.status(400).json({ message: "Chỉ được đặt bàn tối đa trong vòng 14 ngày tới." });
    }

    const branch = await Branch.findByPk(branch_id, {
      attributes: ["branch_id", "open_time", "close_time", "is_active"],
    });
    if (!branch || branch.is_active === false) {
      return res.status(400).json({ message: "Chi nhánh không hợp lệ." });
    }
    if (branch.open_time && branch.close_time) {
      const openAt = buildBranchDateTime(reservationDate, branch.open_time);
      const closeAt = buildBranchDateTime(reservationDate, branch.close_time);
      if (!openAt || !closeAt || reservationDate < openAt || reservationDate > closeAt) {
        return res.status(400).json({
          message: "Thời gian đặt bàn phải nằm trong giờ mở cửa của chi nhánh.",
        });
      }
    }

    const guestCount = Number(guests);
    if (!Number.isFinite(guestCount) || guestCount < 1 || guestCount > MAX_GUESTS) {
      return res.status(400).json({ message: `Số khách phải từ 1 đến ${MAX_GUESTS}` });
    }

    const picked = await reservationService.pickAvailableTable(branch_id, guestCount, reservation_time);
    if (picked.tables?.length) {
      const multi = picked.tables.length > 1;
      return res.json({
        available: true,
        multiTable: multi,
        tableCount: picked.tables.length,
        message: "Còn bàn phù hợp. Bạn có thể gửi yêu cầu đặt bàn.",
      });
    }
    return res.json({ available: false, message: picked.message });
  } catch (err) {
    console.error("Lỗi kiểm tra bàn trống:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const getUserReservations = async (req, res) => {
  try {
    const userId = req.userId;

    const orders = await Order.findAll({
      where: { user_id: userId, order_type: "reservation" },
      include: [
        {
          model: Table,
          attributes: ["table_number", "capacity"],
        },
        {
          model: OrderTable,
          required: false,
          include: [
            {
              model: Table,
              attributes: ["table_id", "table_number", "capacity"],
            },
          ],
        },
      ],
      order: [["arrival_time", "DESC"]],
    });

    const mapped = orders.map((order) => {
      const json = mapOrderResponse(order);
      const linkedTables = (order.OrderTables || [])
        .map((link) => link.Table)
        .filter(Boolean)
        .map((t) => ({
          table_id: t.table_id,
          table_number: t.table_number,
          capacity: t.capacity,
        }));
      if (linkedTables.length) {
        json.tables = linkedTables;
        json.multiTable = linkedTables.length > 1;
      }
      return json;
    });

    res.json({
      orders: mapped,
      reservations: mapped,
    });
  } catch (err) {
    console.error("Lỗi lấy lịch sử đặt bàn:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const order = await Order.findOne({
      where: {
        order_id: id,
        user_id: userId,
        order_type: "reservation",
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đặt bàn" });
    }

    if (!CANCELABLE_RESERVATION_STATUSES.includes(order.status)) {
      return res.status(400).json({ message: "Không thể hủy ở trạng thái này" });
    }
    if (order.checked_in_at) {
      return res.status(400).json({ message: "Không thể hủy sau khi đã check-in." });
    }
    const arrivalMs = new Date(order.arrival_time).getTime();
    if (
      Number.isFinite(arrivalMs) &&
      arrivalMs - Date.now() < CANCELLATION_MIN_HOURS * 60 * 60 * 1000
    ) {
      return res
        .status(400)
        .json({ message: "Chỉ được hủy khi còn ít nhất 2 giờ trước giờ đến." });
    }

    const cancelled = await reservationService.cancelReservationGroup(order);
    const tableIdSet = new Set();
    for (const row of cancelled) {
      const ids = await getTableIdsForOrder(row.order_id);
      ids.forEach((id) => tableIdSet.add(id));
      if (row.table_id) tableIdSet.add(row.table_id);
    }
    for (const tableId of tableIdSet) {
      const table = await Table.findByPk(tableId);
      if (table && ["pre-ordered", "reserved"].includes(table.status)) {
        table.status = "available";
        await table.save();
      }
    }
    req.audit = { entityId: order.order_id };
    return res.json({
      message:
        cancelled.length > 1
          ? `Đã hủy đặt bàn thành công (${cancelled.length} bàn trong nhóm)`
          : "Đã hủy đặt bàn thành công",
      order: mapOrderResponse(cancelled[0]),
      reservation: mapOrderResponse(cancelled[0]),
      cancelledCount: cancelled.length,
    });
  } catch (error) {
    console.error("❌ Error cancelling reservation:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const requestBill = async (req, res) => {
  try {
    const userId = req.userId;
    const sessionOrderId = req.body.order_id || req.body.reservation_id;

    if (!sessionOrderId) {
      return res.status(400).json({ message: "Thiếu order_id" });
    }

    const order = await Order.findOne({
      where: {
        order_id: sessionOrderId,
        user_id: userId,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn" });
    }

    if (!ACTIVE_RESERVATION_STATUSES.includes(order.status)) {
      return res.status(400).json({ message: "Đơn này không thể yêu cầu thanh toán" });
    }

    const groupOrders = order.booking_group_id
      ? await Order.findAll({
          where: {
            booking_group_id: order.booking_group_id,
            user_id: userId,
            status: { [Op.in]: ACTIVE_RESERVATION_STATUSES },
          },
        })
      : [order];

    for (const row of groupOrders) {
      row.status = ORDER_STATUS.WAITING_PAYMENT;
      await row.save();
    }

    req.audit = { entityId: order.order_id };
    return res.json({
      message: "Đã gửi yêu cầu thanh toán, vui lòng chờ nhân viên.",
      order: mapOrderResponse(order),
      reservation: mapOrderResponse(order),
    });
  } catch (error) {
    console.error("❌ Error requestBill:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  createReservation,
  getAvailableTables,
  getUserReservations,
  cancelReservation,
  requestBill,
};
