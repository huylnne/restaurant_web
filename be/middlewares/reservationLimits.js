const db = require('../models');
const { Op } = require('sequelize');

const MAX_ACTIVE_RESERVATIONS = 3;
const MAX_RESERVATIONS_PER_DAY = 5;
const {
  RESERVATION_STATUS,
  ACTIVE_RESERVATION_STATUSES,
} = require('../utils/reservationStatus');
const ACTIVE_STATUSES = [
  RESERVATION_STATUS.PENDING,
  ...ACTIVE_RESERVATION_STATUSES,
];

const enforceReservationQuota = async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [activeCount, todayCount] = await Promise.all([
      db.Reservation.count({
        where: {
          user_id: userId,
          status: { [Op.in]: ACTIVE_STATUSES },
        },
      }),
      db.Reservation.count({
        where: {
          user_id: userId,
          created_at: { [Op.between]: [startOfDay, endOfDay] },
          status: { [Op.notIn]: ['cancelled'] },
        },
      }),
    ]);

    if (activeCount >= MAX_ACTIVE_RESERVATIONS) {
      return res.status(429).json({
        message: `Bạn đã có ${MAX_ACTIVE_RESERVATIONS} đặt bàn đang hoạt động. Vui lòng hủy bớt trước khi đặt thêm.`,
      });
    }

    if (todayCount >= MAX_RESERVATIONS_PER_DAY) {
      return res.status(429).json({
        message: `Đã đạt giới hạn ${MAX_RESERVATIONS_PER_DAY} lần đặt bàn trong ngày.`,
      });
    }

    next();
  } catch (err) {
    console.error('enforceReservationQuota:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { enforceReservationQuota, MAX_ACTIVE_RESERVATIONS, MAX_RESERVATIONS_PER_DAY };
