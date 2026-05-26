const db = require("../../models");
const Reservation = db.Reservation;
const Table = db.Table;
const reservationService = require("../../services/reservation.service");
const {
  CANCELABLE_RESERVATION_STATUSES,
  ACTIVE_RESERVATION_STATUSES,
} = require("../../utils/reservationStatus");

const MIN_ADVANCE_MS = 15 * 60 * 1000;

//  API: Tạo đặt bàn mới
const createReservation = async (req, res) => {
  try {
    const user_id = req.userId;
    const { reservation_time, number_of_guests, note } = req.body;
    const branch_id = parseInt(req.body.branch_id, 10) || 1;

    if (!reservation_time || new Date(reservation_time).getTime() < Date.now() + MIN_ADVANCE_MS) {
      return res.status(400).json({
        message: "Thời gian đặt bàn phải cách hiện tại ít nhất 15 phút.",
      });
    }
    if (!number_of_guests || Number(number_of_guests) < 1) {
      return res.status(400).json({ message: "Số lượng khách không hợp lệ." });
    }

    const { reservation, table } = await reservationService.createReservation({
      user_id,
      branch_id,
      reservation_time,
      number_of_guests,
      note,
    });

    req.audit = {
      entityId: reservation.reservation_id,
      description: `Đặt bàn #${reservation.reservation_id}, bàn ${table.table_id}`,
      metadata: { branch_id, table_id: table.table_id },
    };
    return res.status(201).json({ message: "Đặt bàn thành công", reservation });
  } catch (err) {
    if (err.code === "NO_TABLE") {
      return res.status(400).json({ message: err.message });
    }
    console.error("Lỗi đặt bàn:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//  API: Kiểm tra còn bàn phù hợp (khách không cần chọn bàn)
const getAvailableTables = async (req, res) => {
  try {
    const { reservation_time, guests } = req.query;
    const branch_id = parseInt(req.query.branch_id, 10) || 1;

    if (!reservation_time || !guests) {
      return res.status(400).json({ message: "Thiếu thông tin yêu cầu" });
    }

    const picked = await reservationService.pickAvailableTable(
      branch_id,
      guests,
      reservation_time
    );
    if (picked.table) {
      return res.json({
        available: true,
        message: "Còn bàn phù hợp. Bạn có thể gửi yêu cầu đặt bàn.",
      });
    }
    return res.json({ available: false, message: picked.message });
  } catch (err) {
    console.error("Lỗi kiểm tra bàn trống:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//  API: Lấy lịch sử đặt bàn của user
const getUserReservations = async (req, res) => {
  try {
    const userId = req.userId;

    const reservations = await Reservation.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Table,
          attributes: ["table_number", "capacity"],
        },
      ],
      order: [["reservation_time", "DESC"]],
    });

    res.json({ reservations });
  } catch (err) {
    console.error("Lỗi lấy lịch sử đặt bàn:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//  API: Hủy đặt bàn
const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const reservation = await Reservation.findOne({
      where: {
        reservation_id: id,
        user_id: userId,
      },
    });

    if (!reservation) {
      return res.status(404).json({ message: "Không tìm thấy đặt bàn" });
    }

    if (!CANCELABLE_RESERVATION_STATUSES.includes(reservation.status)) {
      return res
        .status(400)
        .json({ message: "Không thể hủy ở trạng thái này" });
    }

    reservation.status = "cancelled";
    await reservation.save();
    const table = await Table.findByPk(reservation.table_id);
    if (table && ["pre-ordered", "reserved"].includes(table.status)) {
      table.status = "available";
      await table.save();
    }
    req.audit = { entityId: reservation.reservation_id };
    return res.json({
      message: "Đã hủy đặt bàn thành công",
      reservation,
    });
  } catch (error) {
    console.error("❌ Error cancelling reservation:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

//  API: User gửi yêu cầu thanh toán cho reservation hiện tại
const requestBill = async (req, res) => {
  try {
    const userId = req.userId;
    const { reservation_id } = req.body;

    if (!reservation_id) {
      return res.status(400).json({ message: "Thiếu reservation_id" });
    }

    const reservation = await Reservation.findOne({
      where: {
        reservation_id,
        user_id: userId,
      },
    });

    if (!reservation) {
      return res.status(404).json({ message: "Không tìm thấy đặt bàn" });
    }

    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
      return res
        .status(400)
        .json({ message: "Đặt bàn này không thể yêu cầu thanh toán" });
    }

    reservation.status = "waiting_payment";
    await reservation.save();

    req.audit = { entityId: reservation.reservation_id };
    return res.json({
      message: "Đã gửi yêu cầu thanh toán, vui lòng chờ nhân viên.",
      reservation,
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
