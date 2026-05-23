const db = require("../../models");
const Reservation = db.Reservation;
const Table = db.Table;
const { Op } = db.Sequelize;

const CONFLICT_WINDOW_MS = 60 * 60 * 1000;

/** Bàn đã có đặt chỗ trong khung ±1 giờ quanh giờ khách chọn */
async function getConflictTableIds(branch_id, reservationTime) {
  const resTime = new Date(reservationTime);
  const windowStart = new Date(resTime.getTime() - CONFLICT_WINDOW_MS);
  const windowEnd = new Date(resTime.getTime() + CONFLICT_WINDOW_MS);
  const rows = await Reservation.findAll({
    where: {
      branch_id,
      reservation_time: { [Op.between]: [windowStart, windowEnd] },
      status: { [Op.notIn]: ["cancelled", "completed"] },
    },
    attributes: ["table_id"],
  });
  return rows.map((r) => r.table_id).filter(Boolean);
}

/** Tự chọn bàn nhỏ nhất đủ chỗ; trả { table } hoặc { message } */
async function pickAvailableTable(branch_id, number_of_guests, reservationTime) {
  const guests = Number(number_of_guests);
  const conflictIds = await getConflictTableIds(branch_id, reservationTime);

  const table = await Table.findOne({
    where: {
      branch_id,
      capacity: { [Op.gte]: guests },
      status: "available",
      ...(conflictIds.length > 0 ? { table_id: { [Op.notIn]: conflictIds } } : {}),
    },
    order: [["capacity", "ASC"]],
  });
  if (table) return { table };

  const hasCapacity = await Table.findOne({
    where: { branch_id, capacity: { [Op.gte]: guests } },
  });
  if (!hasCapacity) {
    return {
      message: `Chi nhánh không có bàn đủ chỗ cho ${guests} khách. Vui lòng giảm số khách hoặc chọn chi nhánh khác.`,
    };
  }

  const bookedInSlot = await Table.findOne({
    where: {
      branch_id,
      capacity: { [Op.gte]: guests },
      status: "available",
      ...(conflictIds.length > 0 ? { table_id: { [Op.in]: conflictIds } } : { table_id: -1 }),
    },
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

//  API: Tạo đặt bàn mới
const createReservation = async (req, res) => {
  try {
    const user_id = req.userId;
    const { reservation_time, number_of_guests, note } = req.body;
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

    const picked = await pickAvailableTable(branch_id, number_of_guests, reservation_time);
    if (!picked.table) {
      return res.status(400).json({ message: picked.message });
    }
    const table = picked.table;

    // 2. Tạo reservation — KHÔNG đổi table sang pre-ordered ngay,
    //    hàm syncTableStatuses sẽ tự chuyển khi còn 15 phút trước giờ đặt
    const reservation = await Reservation.create({
      user_id,
      branch_id,
      table_id: table.table_id,
      reservation_time,
      number_of_guests,
      note: note || null,
      status: "confirmed",
      created_at: new Date(),
    });

    req.audit = {
      entityId: reservation.reservation_id,
      description: `Đặt bàn #${reservation.reservation_id}, bàn ${table.table_id}`,
      metadata: { branch_id, table_id: table.table_id },
    };
    return res.status(201).json({ message: "Đặt bàn thành công", reservation });
  } catch (err) {
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

    const picked = await pickAvailableTable(branch_id, guests, reservation_time);
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

    if (!["confirmed", "pre-ordered", "waiting_payment"].includes(reservation.status)) {
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

//  Export tất cả hàm
module.exports = {
  createReservation,
  getAvailableTables,
  getUserReservations,
  cancelReservation,
  requestBill,
};
