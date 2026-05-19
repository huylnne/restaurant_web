const { Op } = require('sequelize');
const db = require('../../models');

const STAFF_ROLES = ['admin', 'waiter', 'kitchen', 'manager'];

class UserAccountService {
  buildWhere({ search = '', role = 'user', accountStatus = 'all' }) {
    const where = {};

    if (role && role !== 'all') {
      where.role = role;
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      where[Op.or] = [
        { username: { [Op.iLike]: q } },
        { full_name: { [Op.iLike]: q } },
        { phone: { [Op.iLike]: q } },
      ];
    }

    if (accountStatus === 'locked') {
      where.locked = true;
    } else if (accountStatus === 'inactive') {
      where.is_active = false;
    } else if (accountStatus === 'active') {
      where.is_active = true;
      where.locked = false;
    }

    return where;
  }

  async listUsers({ page = 1, limit = 10, search = '', role = 'user', accountStatus = 'all' }) {
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    const where = this.buildWhere({ search, role, accountStatus });

    const { count, rows } = await db.User.findAndCountAll({
      where,
      attributes: [
        'user_id',
        'username',
        'full_name',
        'phone',
        'role',
        'is_active',
        'locked',
        'created_at',
        'branch_id',
      ],
      order: [['created_at', 'DESC']],
      limit: Math.min(100, Math.max(1, Number(limit))),
      offset,
    });

    const userIds = rows.map((u) => u.user_id);
    let reservationCounts = {};

    if (userIds.length > 0) {
      const counts = await db.Reservation.findAll({
        attributes: [
          'user_id',
          [db.sequelize.fn('COUNT', db.sequelize.col('reservation_id')), 'total'],
        ],
        where: { user_id: { [Op.in]: userIds } },
        group: ['user_id'],
        raw: true,
      });
      reservationCounts = Object.fromEntries(
        counts.map((c) => [c.user_id, Number(c.total)])
      );
    }

    return {
      users: rows.map((u) => ({
        ...u.toJSON(),
        reservation_count: reservationCounts[u.user_id] || 0,
      })),
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    };
  }

  async getUserDetail(userId) {
    const user = await db.User.findByPk(userId, {
      attributes: [
        'user_id',
        'username',
        'full_name',
        'phone',
        'role',
        'is_active',
        'locked',
        'created_at',
        'branch_id',
        'avatar_url',
      ],
    });

    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    const [reservationCount, activeReservations, recentReservations] = await Promise.all([
      db.Reservation.count({ where: { user_id: userId } }),
      db.Reservation.count({
        where: {
          user_id: userId,
          status: { [Op.notIn]: ['cancelled', 'completed'] },
        },
      }),
      db.Reservation.findAll({
        where: { user_id: userId },
        attributes: ['reservation_id', 'reservation_time', 'status', 'branch_id', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: 5,
      }),
    ]);

    return {
      user: user.toJSON(),
      stats: {
        reservation_count: reservationCount,
        active_reservations: activeReservations,
      },
      recent_reservations: recentReservations,
    };
  }

  async getSummaryStats() {
    const [totalCustomers, lockedCount, inactiveCount, staffCount] = await Promise.all([
      db.User.count({ where: { role: 'user' } }),
      db.User.count({ where: { locked: true } }),
      db.User.count({ where: { is_active: false } }),
      db.User.count({ where: { role: { [Op.in]: STAFF_ROLES } } }),
    ]);

    return {
      total_customers: totalCustomers,
      locked_accounts: lockedCount,
      inactive_accounts: inactiveCount,
      staff_accounts: staffCount,
    };
  }

  async updateAccountStatus(targetUserId, adminUserId, { is_active, locked }) {
    if (Number(targetUserId) === Number(adminUserId)) {
      throw new Error('Không thể thay đổi trạng thái tài khoản của chính bạn');
    }

    const user = await db.User.findByPk(targetUserId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    if (user.role === 'admin' && locked === true) {
      const otherActiveAdmins = await db.User.count({
        where: {
          role: 'admin',
          user_id: { [Op.ne]: targetUserId },
          is_active: true,
          locked: false,
        },
      });
      if (otherActiveAdmins === 0) {
        throw new Error('Không thể khóa admin cuối cùng còn hoạt động');
      }
    }

    const updates = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (typeof locked === 'boolean') updates.locked = locked;

    if (Object.keys(updates).length === 0) {
      throw new Error('Cần gửi is_active và/hoặc locked (boolean)');
    }

    await user.update(updates);
    return user;
  }
}

module.exports = new UserAccountService();
