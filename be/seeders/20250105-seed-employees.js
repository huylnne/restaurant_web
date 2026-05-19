'use strict';

/**
 * Gán employees cho tài khoản demo cũ (admin/manager cơ sở).
 * Nhân viên theo chi nhánh mới: chạy 20260519100000-seed-seven-branches-staff.js
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const users = await queryInterface.sequelize.query(
      `SELECT user_id, username FROM users ORDER BY user_id;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const userMap = {};
    users.forEach((u) => {
      userMap[u.username] = u.user_id;
    });

    const pairs = [
      ['admin_b1', 1, 'admin', 20000000],
      ['admin_b2', 5, 'admin', 19500000],
      ['manager1', 1, 'manager', 15000000],
      ['manager2', 6, 'manager', 17000000],
      ['kitchen1', 1, 'kitchen', 12000000],
      ['waiter1', 1, 'waiter', 8000000],
    ];

    const now = new Date();
    const rows = [];

    for (const [username, branchId, position, salary] of pairs) {
      const userId = userMap[username];
      if (!userId) continue;
      const exists = await queryInterface.sequelize.query(
        `SELECT 1 FROM employees WHERE user_id = ${userId} LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      if (exists.length) continue;
      rows.push({
        user_id: userId,
        branch_id: branchId,
        position,
        salary,
        hire_date: new Date('2024-01-15'),
        status: 'active',
        created_at: now,
        updated_at: now,
      });
    }

    if (rows.length) {
      await queryInterface.bulkInsert('employees', rows, {});
    }
  },

  down: async () => {},
};
