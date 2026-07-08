/**
 * CONTROLLER ĐẶT BÀN (KHÁCH) — HTTP layer cho booking, hủy, yêu cầu thanh toán.
 * Ctrl+F: đặt bàn controller, /booking, requestBill
 * Luồng demo: Phần 2, Phần 4 — Bước 4.3
 */
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
const {
  getBranchHoursValidationMessage,
  RESERVATION_HOLD_MINUTES,
} = require("../../utils/branchHours");

const MIN_ADVANCE_MS = 30 * 60 * 1000; // phải đặt trước tối thiểu 30 phút
const MAX_ADVANCE_MS = 14 * 24 * 60 * 60 * 1000; // đặt xa nhất 14 ngày
const CANCELLATION_MIN_HOURS = 2; // chỉ hủy khi còn ≥ 2 giờ trước giờ đến

/** Map order → response có reservation_id alias (tương thích FE). */
function mapOrderResponse(order) {
  if (!order) return null;
  const json = order.toJSON ? order.toJSON() : order;
  return {
    ...json,
    reservation_id: json.order_id,
    reservation_time: json.arrival_time,
  };
}

/**
 * [ĐẶT BÀN] POST — validate giờ (30 phút–14 ngày, giờ mở cửa) rồi gọi createReservation.
 * Trang FE: /booking. Ctrl+F: createReservation controller
 */
const createReservation = async (req, res) => {
  try {
    const user_id = req.userId;
    const { reservation_time, number_of_guests, note } = req.body;
    const branch_id = parseInt(req.body.branch_id, 10) || 1;

    // B1: parse & kiểm tra thời gian đặt hợp lệ (không rỗng, là ngày giờ đúng định dạng).
    const reservationDate = new Date(reservation_time);
    if (!reservation_time || Number.isNaN(reservationDate.getTime())) {
      return res.status(400).json({
        message: "Thời gian đặt bàn không hợp lệ.",
      });
    }
    // B2: chặn đặt quá gần (<30 phút) hoặc quá xa (>14 ngày).
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

    // B3: chi nhánh phải tồn tại và đang hoạt động.
    const branch = await Branch.findByPk(branch_id, {
      attributes: ["branch_id", "open_time", "close_time", "is_active"],
    });
    if (!branch || branch.is_active === false) {
      return res.status(400).json({ message: "Chi nhánh không hợp lệ." });
    }

    // B4: giờ đặt phải nằm trong giờ mở cửa (còn trừ hao thời gian giữ bàn holdMinutes).
    const hoursError = getBranchHoursValidationMessage(
      reservationDate,
      branch.open_time,
      branch.close_time,
      { holdMinutes: RESERVATION_HOLD_MINUTES }
    );
    if (hoursError) {
      return res.status(400).json({ message: hoursError });
    }

    // B5: số khách tối thiểu 1.
    if (!number_of_guests || Number(number_of_guests) < 1) {
      return res.status(400).json({ message: "Số lượng khách không hợp lệ." });
    }

    // B6: giao service xử lý chọn/khóa bàn + tạo order trong transaction (có thể ghép nhiều bàn).
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
    // Lỗi nghiệp vụ đã lường trước (hết bàn, quá hạn, user bị khóa...) → trả 400 với message rõ ràng.
    if (
      ["NO_TABLE", "FUTURE_LIMIT", "USER_LOCKED", "BRANCH_INVALID"].includes(err.code)
    ) {
      return res.status(400).json({ message: err.message });
    }
    // Còn lại là lỗi ngoài dự kiến → 500.
    console.error("Lỗi đặt bàn:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/**
 * [ĐẶT BÀN] GET — kiểm tra còn bàn trước khi submit form (preview).
 * Ctrl+F: getAvailableTables, kiểm tra bàn trống
 */
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
    const hoursError = getBranchHoursValidationMessage(
      reservationDate,
      branch.open_time,
      branch.close_time,
      { holdMinutes: RESERVATION_HOLD_MINUTES }
    );
    if (hoursError) {
      return res.json({ available: false, message: hoursError });
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

/** [LỊCH SỬ] GET — danh sách đặt bàn của khách (đơn giản, không bill). Ctrl+F: getUserReservations */
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

/**
 * [HỦY ĐẶT BÀN] DELETE — hủy khi chưa check-in, còn ≥2h trước giờ đến.
 * Ctrl+F: cancelReservation
 */
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

    // Điều kiện hủy 1: trạng thái phải cho phép hủy (chưa hoàn tất/đang phục vụ).
    if (!CANCELABLE_RESERVATION_STATUSES.includes(order.status)) {
      return res.status(400).json({ message: "Không thể hủy ở trạng thái này" });
    }
    // Điều kiện hủy 2: chưa từng check-in.
    if (order.checked_in_at) {
      return res.status(400).json({ message: "Không thể hủy sau khi đã check-in." });
    }
    // Điều kiện hủy 3: còn ít nhất 2 giờ trước giờ đến.
    const arrivalMs = new Date(order.arrival_time).getTime();
    if (
      Number.isFinite(arrivalMs) &&
      arrivalMs - Date.now() < CANCELLATION_MIN_HOURS * 60 * 60 * 1000
    ) {
      return res
        .status(400)
        .json({ message: "Chỉ được hủy khi còn ít nhất 2 giờ trước giờ đến." });
    }

    // Hủy cả nhóm (nếu là booking ghép nhiều bàn) rồi giải phóng các bàn liên quan về "available".
    const cancelled = await reservationService.cancelReservationGroup(order);
    // Gom mọi table_id đã dùng (cả bàn chính lẫn bàn ghép qua bảng nối) để trả bàn.
    const tableIdSet = new Set();
    for (const row of cancelled) {
      const ids = await getTableIdsForOrder(row.order_id);
      ids.forEach((id) => tableIdSet.add(id));
      if (row.table_id) tableIdSet.add(row.table_id);
    }
    // Chỉ đưa về trống những bàn đang giữ chỗ (pre-ordered/reserved), không đụng bàn đang có khách.
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

/**
 * [YÊU CẦU THANH TOÁN] POST — khách bấm nút từ /my-table hoặc QR, order → waiting_payment.
 * Luồng demo: Phần 4 — Bước 4.3. Ctrl+F: requestBill, yêu cầu thanh toán
 */
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

    // Chỉ đơn đang hoạt động mới được yêu cầu thanh toán.
    if (!ACTIVE_RESERVATION_STATUSES.includes(order.status)) {
      return res.status(400).json({ message: "Đơn này không thể yêu cầu thanh toán" });
    }

    // Nếu là booking nhóm (ghép bàn) → chuyển trạng thái cho toàn bộ đơn cùng nhóm; nếu không chỉ đơn hiện tại.
    const groupOrders = order.booking_group_id
      ? await Order.findAll({
          where: {
            booking_group_id: order.booking_group_id,
            user_id: userId,
            status: { [Op.in]: ACTIVE_RESERVATION_STATUSES },
          },
        })
      : [order];

    // Đổi sang "chờ thanh toán" để nhân viên thấy và ra hóa đơn.
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
