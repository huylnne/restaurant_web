/**
 * SERVICE ADMIN USER ACCOUNT — logic tìm kiếm, xem chi tiết, khóa/mở tài khoản khách.
 * Ctrl+F: user account service, listUsers, getUserDetail, updateAccountStatus
 * Luồng demo: Phần 5 — Bước 5.2 tìm demo_khach01.
 */
const { Op } = require('sequelize');
const db = require('../../models');
const { splitRestaurantAndBranch } = require('../../utils/branchDisplay');

const STAFF_ROLES = ['admin', 'waiter', 'kitchen', 'manager'];

class UserAccountService {
  /** [TÀI KHOẢN KHÁCH] Build where search username/full_name/phone + role + trạng thái. Ctrl+F: buildWhere user account */
  buildWhere({ search = '', role = 'user', accountStatus = 'all' }) {
    const where = {};

    // Lọc theo vai trò (mặc định 'user'); 'all' = không giới hạn vai trò.
    if (role && role !== 'all') {
      where.role = role;
    }

    // Tìm kiếm không phân biệt hoa/thường (iLike) trên username HOẶC họ tên HOẶC SĐT.
    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      where[Op.or] = [
        { username: { [Op.iLike]: q } },
        { full_name: { [Op.iLike]: q } },
        { phone: { [Op.iLike]: q } },
      ];
    }

    // Trạng thái tài khoản:
    //  - locked   : đang bị khóa
    //  - inactive : bị vô hiệu hóa (is_active=false)
    //  - active   : vừa bật vừa không khóa
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

  /** [TÀI KHOẢN KHÁCH] Danh sách có phân trang + số lượt đặt reservation_count. Ctrl+F: listUsers user account */
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

    // Tính số lượt đặt bàn cho từng user trong trang hiện tại bằng 1 truy vấn gộp (tránh N+1 query).
    const userIds = rows.map((u) => u.user_id);
    let orderCounts = {};

    if (userIds.length > 0) {
      const counts = await db.Order.findAll({
        attributes: [
          'user_id',
          [db.sequelize.fn('COUNT', db.sequelize.col('order_id')), 'total'],
        ],
        where: {
          user_id: { [Op.in]: userIds },
          order_type: 'reservation',
        },
        group: ['user_id'],
        raw: true,
      });
      orderCounts = Object.fromEntries(counts.map((c) => [c.user_id, Number(c.total)]));
    }

    return {
      users: rows.map((u) => ({
        ...u.toJSON(),
        reservation_count: orderCounts[u.user_id] || 0,
      })),
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    };
  }

  /** [TÀI KHOẢN KHÁCH] Chi tiết khách + lịch sử đặt gần đây + thống kê chi tiêu. Ctrl+F: getUserDetail */
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

    const reservationWhere = { user_id: userId, order_type: 'reservation' };

    const [reservationCount, activeReservations, recentReservations] = await Promise.all([
      db.Order.count({ where: reservationWhere }),
      db.Order.count({
        where: {
          ...reservationWhere,
          status: { [Op.notIn]: ['cancelled', 'completed'] },
        },
      }),
      db.Order.findAll({
        where: reservationWhere,
        attributes: [
          'order_id',
          'arrival_time',
          'status',
          'branch_id',
          'created_at',
          'order_type',
        ],
        include: [
          {
            model: db.Branch,
            attributes: ['branch_id', 'name', 'address'],
          },
        ],
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
      recent_reservations: recentReservations.map((o) => {
        const json = o.toJSON();
        const { restaurant_name, branch_display_name } = splitRestaurantAndBranch(
          json.Branch?.name
        );
        return {
          ...json,
          reservation_id: json.order_id,
          reservation_time: json.arrival_time,
          restaurant_name,
          branch_display_name,
        };
      }),
    };
  }

  /** [TÀI KHOẢN KHÁCH] Summary tổng active/locked/inactive cho card admin. Ctrl+F: getSummaryStats */
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

  /** [TÀI KHOẢN KHÁCH] Admin khóa/mở/vô hiệu hóa, không cho tự khóa chính mình. Ctrl+F: updateAccountStatus service */
  async updateAccountStatus(targetUserId, adminUserId, { is_active, locked }) {
    // Chặn tự khóa/vô hiệu hóa chính mình → tránh admin tự đá mình ra khỏi hệ thống.
    if (Number(targetUserId) === Number(adminUserId)) {
      throw new Error('Không thể thay đổi trạng thái tài khoản của chính bạn');
    }

    const user = await db.User.findByPk(targetUserId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    // Bảo vệ hệ thống: nếu định khóa 1 admin, phải còn ít nhất 1 admin khác đang hoạt động.
    if (user.role === 'admin' && locked === true) {
      const otherActiveAdmins = await db.User.count({
        where: {
          role: 'admin',
          user_id: { [Op.ne]: targetUserId }, // trừ chính người đang bị khóa
          is_active: true,
          locked: false,
        },
      });
      if (otherActiveAdmins === 0) {
        throw new Error('Không thể khóa admin cuối cùng còn hoạt động');
      }
    }

    // Chỉ cập nhật field được gửi lên dạng boolean (bỏ qua undefined/null).
    const updates = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (typeof locked === 'boolean') updates.locked = locked;

    // Không có field hợp lệ nào → coi là request sai.
    if (Object.keys(updates).length === 0) {
      throw new Error('Cần gửi is_active và/hoặc locked (boolean)');
    }

    await user.update(updates);
    return user;
  }
}

module.exports = new UserAccountService();
