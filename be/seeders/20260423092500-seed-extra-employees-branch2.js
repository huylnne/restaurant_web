'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const users = await queryInterface.sequelize.query(
      `SELECT user_id, username FROM users WHERE username IN
      ('manager2','waiter2','waiter3','waiter4','kitchen2','kitchen3','kitchen4')
      ORDER BY username`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const userMap = {};
    users.forEach((u) => {
      userMap[u.username] = u.user_id;
    });

    const now = new Date();

    await queryInterface.bulkInsert(
      'employees',
      [
        {
          user_id: userMap.manager2,
          branch_id: 2,
          position: 'manager',
          salary: 17000000.0,
          hire_date: new Date('2025-01-10'),
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          user_id: userMap.waiter2,
          branch_id: 2,
          position: 'waiter',
          salary: 9000000.0,
          hire_date: new Date('2025-02-05'),
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          user_id: userMap.waiter3,
          branch_id: 2,
          position: 'waiter',
          salary: 8800000.0,
          hire_date: new Date('2025-03-12'),
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          user_id: userMap.waiter4,
          branch_id: 2,
          position: 'waiter',
          salary: 8600000.0,
          hire_date: new Date('2025-04-01'),
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          user_id: userMap.kitchen2,
          branch_id: 2,
          position: 'kitchen',
          salary: 11800000.0,
          hire_date: new Date('2025-02-20'),
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          user_id: userMap.kitchen3,
          branch_id: 2,
          position: 'kitchen',
          salary: 11500000.0,
          hire_date: new Date('2025-03-18'),
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          user_id: userMap.kitchen4,
          branch_id: 2,
          position: 'kitchen',
          salary: 11200000.0,
          hire_date: new Date('2025-05-07'),
          status: 'on_leave',
          created_at: now,
          updated_at: now,
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `DELETE FROM employees
       WHERE branch_id = 2
         AND user_id IN (
           SELECT user_id FROM users
           WHERE username IN ('manager2','waiter2','waiter3','waiter4','kitchen2','kitchen3','kitchen4')
         )`
    );
  },
};
