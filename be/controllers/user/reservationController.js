const db = require('../../models');
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

const getAvailableTables = async (req, res) => {
  try {
    const { reservation_time, guests } = req.query;

    if (!reservation_time || !guests) {
      return res.status(400).json({ message: 'Thiếu thông tin yêu cầu' });
    }

    const targetTime = new Date(reservation_time);
    const startTime = new Date(targetTime.getTime() - 60 * 60 * 1000); // trước 1h
    const endTime = new Date(targetTime.getTime() + 60 * 60 * 1000);   // sau 1h

    const reservedTableIds = await Reservation.findAll({
      where: {
        reservation_time: {
          [Op.between]: [startTime, endTime],
        },
        status: { [Op.notIn]: ['cancelled'] },
      },
      attributes: ['table_id'],
    });

    const usedIds = reservedTableIds.map(r => r.table_id);

    const tables = await Table.findAll({
      where: {
        capacity: { [Op.gte]: guests },
        table_id: { [Op.notIn]: usedIds },
        status: 'available',
      },
      order: [['capacity', 'ASC']],
    });

    res.json({ tables });
  } catch (err) {
    console.error('Lỗi lấy bàn trống:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const getUserReservations = async (req, res) => {
  try {
    const userId = req.userId;

    const reservations = await Reservation.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Table,
          attributes: ['table_number', 'capacity'],
        },
      ],
      order: [['reservation_time', 'DESC']],
    });

    res.json({ reservations });
  } catch (err) {
    console.error('Lỗi lấy lịch sử đặt bàn:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};


module.exports = { createReservation,getAvailableTables,getUserReservations };
