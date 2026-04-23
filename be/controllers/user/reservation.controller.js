const db = require("../../models");
const Reservation = db.Reservation;
const Table = db.Table;
const { Op } = db.Sequelize;

//  API: Tạo đặt bàn mới
const createReservation = async (req, res) => {
  try {
    const user_id = req.userId;
    const { reservation_time, number_of_guests, table_id } = req.body;
    const branch_id = parseInt(req.body.branch_id, 10) || 1;

    // Từ chối đặt bàn với thời gian đã qua hoặc quá gần hiện tại (< 15 phút)
    const MIN_ADVANCE_MS = 15 * 60 * 1000;
    if (!reservation_time || new Date(reservation_time).getTime() < Date.now() + MIN_ADVANCE_MS) {
      return res.status(400).json({
        message: "Thời gian đặt bàn phải cách hiện tại ít nhất 15 phút.",
      });
    }
    if (!number_of_guests || Number(number_of_guests) < 1) {
      return res.status(400).json({ message: "Số lượng khách không hợp lệ." });
    }

    let table = null;

    // Khoảng thời gian coi là conflict: ±1 giờ quanh giờ đặt
    const resTime = new Date(reservation_time);
    const windowStart = new Date(resTime.getTime() - 60 * 60 * 1000);
    const windowEnd   = new Date(resTime.getTime() + 60 * 60 * 1000);

    // Helper: lấy danh sách table_id đang có reservation trùng khung giờ
    const conflictingReservations = await Reservation.findAll({
      where: {
        branch_id,
        reservation_time: { [Op.between]: [windowStart, windowEnd] },
        status: { [Op.notIn]: ["cancelled", "completed"] },
      },
      attributes: ["table_id"],
    });
    const conflictIds = conflictingReservations.map((r) => r.table_id).filter(Boolean);

    // 1a. Nếu user chọn bàn cụ thể → kiểm tra còn trống và không trùng lịch
    if (table_id) {
      table = await Table.findOne({
        where: {
          status: "available",
          branch_id,
          capacity: { [Op.gte]: number_of_guests },
          [Op.and]: [
            { table_id },
            ...(conflictIds.length > 0 ? [{ table_id: { [Op.notIn]: conflictIds } }] : []),
          ],
        },
      });
      if (!table) {
        return res.status(400).json({
          message: "Bàn đã được đặt trong khung giờ này hoặc không đủ chỗ. Vui lòng chọn bàn khác.",
        });
      }
    } else {
      // 1b. Auto-pick: bàn nhỏ nhất còn trống và không trùng lịch
      table = await Table.findOne({
        where: {
          branch_id,
          capacity: { [Op.gte]: number_of_guests },
          status: "available",
          ...(conflictIds.length > 0 ? { table_id: { [Op.notIn]: conflictIds } } : {}),
        },
        order: [["capacity", "ASC"]],
      });
      if (!table) {
        return res
          .status(400)
          .json({ message: "Hết bàn trong khung giờ này, vui lòng chọn thời gian khác." });
      }
    }

    // 2. Tạo reservation — KHÔNG đổi table sang pre-ordered ngay,
    //    hàm syncTableStatuses sẽ tự chuyển khi còn 15 phút trước giờ đặt
    const reservation = await Reservation.create({
      user_id,
      branch_id,
      table_id: table.table_id,
      reservation_time,
      number_of_guests,
      status: "confirmed",
      created_at: new Date(),
    });

    return res.status(201).json({ message: "Đặt bàn thành công", reservation });
  } catch (err) {
    console.error("Lỗi đặt bàn:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//  API: Lấy danh sách bàn trống
const getAvailableTables = async (req, res) => {
  try {
    const { reservation_time, guests } = req.query;
    const branch_id = parseInt(req.query.branch_id, 10) || 1;

    if (!reservation_time || !guests) {
      return res.status(400).json({ message: "Thiếu thông tin yêu cầu" });
    }

    const targetTime = new Date(reservation_time);
    const startTime = new Date(targetTime.getTime() - 60 * 60 * 1000); // trước 1h
    const endTime = new Date(targetTime.getTime() + 60 * 60 * 1000); // sau 1h

    const reservedTableIds = await Reservation.findAll({
      where: {
        branch_id,
        reservation_time: {
          [Op.between]: [startTime, endTime],
        },
        status: { [Op.notIn]: ["cancelled"] },
      },
      attributes: ["table_id"],
    });

    const usedIds = reservedTableIds.map((r) => r.table_id);

    const tables = await Table.findAll({
      where: {
        branch_id,
        capacity: { [Op.gte]: guests },
        table_id: { [Op.notIn]: usedIds },
        status: "available",
      },
      order: [["capacity", "ASC"]],
    });

    res.json({ tables });
  } catch (err) {
    console.error("Lỗi lấy bàn trống:", err);
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

    // 1. Tìm đặt bàn thuộc user hiện tại
    const reservation = await Reservation.findOne({
      where: {
        reservation_id: id,
        user_id: userId,
      },
    });

    if (!reservation) {
      return res.status(404).json({ message: "Không tìm thấy đặt bàn" });
    }

    // 2. Kiểm tra trạng thái trong DB
    if (!["pending", "confirmed"].includes(reservation.status)) {
      return res
        .status(400)
        .json({ message: "Không thể hủy ở trạng thái này" });
    }

    // 3. Cập nhật trạng thái
    reservation.status = "cancelled";
    await reservation.save();
    const table = await Table.findByPk(reservation.table_id);
    if (table) {
      table.status = "available";
      await table.save();
    }
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

    if (!["confirmed", "pre-ordered", "waiting_payment"].includes(reservation.status)) {
      return res
        .status(400)
        .json({ message: "Đặt bàn này không thể yêu cầu thanh toán" });
    }

    reservation.status = "waiting_payment";
    await reservation.save();

    return res.json({
      message: "Đã gửi yêu cầu thanh toán, vui lòng chờ nhân viên.",
      reservation,
    });
  } catch (error) {
    console.error("❌ Error requestBill:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

//  Export tất cả hàm
module.exports = {
  createReservation,
  getAvailableTables,
  getUserReservations,
  cancelReservation,
  requestBill,
};
