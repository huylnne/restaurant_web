const db = require("../../models");
const Reservation = db.Reservation;
const Table = db.Table;
const { Op } = db.Sequelize;

//  API: Tạo đặt bàn mới
const createReservation = async (req, res) => {
  try {
    const user_id = req.userId;
    const { reservation_time, number_of_guests } = req.body;

    // 1. Tìm bàn phù hợp còn trống
    const table = await Table.findOne({
      where: {
        capacity: { [Op.gte]: number_of_guests },
        status: "available",
      },
      order: [["capacity", "ASC"]],
    });

    if (!table) {
      return res
        .status(400)
        .json({ message: "Hết bàn, vui lòng chọn thời gian khác." });
    }

    // 2. Tạo reservation
    const reservation = await Reservation.create({
      user_id,
      branch_id: 1,
      table_id: table.table_id,
      reservation_time,
      number_of_guests,
      status: "confirmed",
      created_at: new Date(),
    });

    // 3. Cập nhật bàn thành 'reserved'
    await table.update({ status: "reserved" });

    res.status(201).json({ message: "Đặt bàn thành công", reservation });
  } catch (err) {
    console.error("Lỗi đặt bàn:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//  API: Lấy danh sách bàn trống
const getAvailableTables = async (req, res) => {
  try {
    const { reservation_time, guests } = req.query;

    if (!reservation_time || !guests) {
      return res.status(400).json({ message: "Thiếu thông tin yêu cầu" });
    }

    const targetTime = new Date(reservation_time);
    const startTime = new Date(targetTime.getTime() - 60 * 60 * 1000); // trước 1h
    const endTime = new Date(targetTime.getTime() + 60 * 60 * 1000); // sau 1h

    const reservedTableIds = await Reservation.findAll({
      where: {
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

//  Export tất cả hàm
module.exports = {
  createReservation,
  getAvailableTables,
  getUserReservations,
  cancelReservation,
};
