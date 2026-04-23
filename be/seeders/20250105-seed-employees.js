'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Lấy user_id thực tế từ bảng users
    const users = await queryInterface.sequelize.query(
      `SELECT user_id, username FROM users ORDER BY user_id;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Tạo map username -> user_id
    const userMap = {};
    users.forEach(u => {
      userMap[u.username] = u.user_id;
    });

    const now = new Date();

    await queryInterface.bulkInsert('employees', [
      {
        user_id: userMap['admin_b1'], // branch admin 1
        branch_id: 1,
        position: 'admin',
        salary: 20000000.00,
        hire_date: new Date('2024-01-05'),
        status: 'active',
        created_at: now,
        updated_at: now
      },
      {
        user_id: userMap['admin_b2'], // branch admin 2
        branch_id: 2,
        position: 'admin',
        salary: 18000000.00,
        hire_date: new Date('2024-01-10'),
        status: 'active',
        created_at: now,
        updated_at: now
      },
      {
        user_id: userMap['manager1'], // manager1
        branch_id: 1,
        position: 'manager',
        salary: 15000000.00,
        hire_date: new Date('2024-01-15'),
        status: 'active',
        created_at: now,
        updated_at: now
      },
      {
        user_id: userMap['kitchen1'], // kitchen1
        branch_id: 1,
        position: 'kitchen',
        salary: 12000000.00,
        hire_date: new Date('2024-02-20'),
        status: 'active',
        created_at: now,
        updated_at: now
      },
      {
        user_id: userMap['waiter1'], // waiter1
        branch_id: 1,
        position: 'waiter',
        salary: 8000000.00,
        hire_date: new Date('2024-03-10'),
        status: 'active',
        created_at: now,
        updated_at: now
      },
      {
        user_id: userMap['ngochuy'], // ngochuy
        branch_id: 1,
        position: 'user',
        salary: 9000000.00,
        hire_date: new Date('2024-06-01'),
        status: 'active',
        created_at: now,
        updated_at: now
      },
      // Thêm nhân viên cho branch 2
      {
        user_id: userMap['manager1'], // manager1
        branch_id: 2,
        position: 'manager',
        salary: 14000000.00,
        hire_date: new Date('2024-07-01'),
        status: 'active',
        created_at: now,
        updated_at: now
      },
      {
        user_id: userMap['kitchen1'], // kitchen1
        branch_id: 2,
        position: 'kitchen',
        salary: 11000000.00,
        hire_date: new Date('2024-07-15'),
        status: 'on_leave',
        created_at: now,
        updated_at: now
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('employees', null, {});
  }
};