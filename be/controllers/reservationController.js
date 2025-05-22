const db = require('../models/db');
const Reservation = db.Reservation;
const Table = db.Table;
const { Op } = db.Sequelize;

const createReservation = async (req, res) => {
  try {
    const user_id = req.userId; 
    const { reservation_time, number_of_guests } = req.body;

    // 1. Tìm bàn phù hợp còn trống
    const table = await Table.findOne({
      where: {
        capacity: { [Op.gte]: number_of_guests },
        status: 'available'
      },
      order: [['capacity', 'ASC']]
    });

    if (!table) {
      return res.status(400).json({ message: 'Hết bàn, vui lòng chọn thời gian khác.' });
    }

    // 2. Tạo reservation


    const reservation = await Reservation.create({
      user_id:req.userId,
      branch_id: 1,
      table_id: table.table_id,
      reservation_time,
      number_of_guests,
      status: 'confirmed',
      created_at: new Date()
    });

    // 3. Cập nhật bàn thành 'reserved'
    await table.update({ status: 'reserved' });

    res.status(201).json({ message: 'Đặt bàn thành công', reservation });
  } catch (err) {
    console.error('Lỗi đặt bàn:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { createReservation };
