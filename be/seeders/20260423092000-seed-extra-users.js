'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('123456', 10);

    const users = [
      // Branch 2 staff
      { username: 'manager2', full_name: 'Manager Branch 2', phone: '0902000001', role: 'manager', branch_id: 2 },
      { username: 'waiter2', full_name: 'Waiter B2 01', phone: '0902000002', role: 'waiter', branch_id: 2 },
      { username: 'waiter3', full_name: 'Waiter B2 02', phone: '0902000003', role: 'waiter', branch_id: 2 },
      { username: 'waiter4', full_name: 'Waiter B2 03', phone: '0902000004', role: 'waiter', branch_id: 2 },
      { username: 'kitchen2', full_name: 'Kitchen B2 01', phone: '0902000005', role: 'kitchen', branch_id: 2 },
      { username: 'kitchen3', full_name: 'Kitchen B2 02', phone: '0902000006', role: 'kitchen', branch_id: 2 },
      { username: 'kitchen4', full_name: 'Kitchen B2 03', phone: '0902000007', role: 'kitchen', branch_id: 2 },

      // Branch 2 customers
      { username: 'b2user01', full_name: 'Khach B2 01', phone: '0902100001', role: 'user', branch_id: 2 },
      { username: 'b2user02', full_name: 'Khach B2 02', phone: '0902100002', role: 'user', branch_id: 2 },
      { username: 'b2user03', full_name: 'Khach B2 03', phone: '0902100003', role: 'user', branch_id: 2 },
      { username: 'b2user04', full_name: 'Khach B2 04', phone: '0902100004', role: 'user', branch_id: 2 },
      { username: 'b2user05', full_name: 'Khach B2 05', phone: '0902100005', role: 'user', branch_id: 2 },
      { username: 'b2user06', full_name: 'Khach B2 06', phone: '0902100006', role: 'user', branch_id: 2 },
      { username: 'b2user07', full_name: 'Khach B2 07', phone: '0902100007', role: 'user', branch_id: 2 },
      { username: 'b2user08', full_name: 'Khach B2 08', phone: '0902100008', role: 'user', branch_id: 2 },
      { username: 'b2user09', full_name: 'Khach B2 09', phone: '0902100009', role: 'user', branch_id: 2 },
      { username: 'b2user10', full_name: 'Khach B2 10', phone: '0902100010', role: 'user', branch_id: 2 },

      // More branch 1 users (để data chung dày hơn)
      { username: 'b1user11', full_name: 'Khach B1 11', phone: '0901100011', role: 'user', branch_id: 1 },
      { username: 'b1user12', full_name: 'Khach B1 12', phone: '0901100012', role: 'user', branch_id: 1 },
      { username: 'b1user13', full_name: 'Khach B1 13', phone: '0901100013', role: 'user', branch_id: 1 },
      { username: 'b1user14', full_name: 'Khach B1 14', phone: '0901100014', role: 'user', branch_id: 1 },
      { username: 'b1user15', full_name: 'Khach B1 15', phone: '0901100015', role: 'user', branch_id: 1 },
    ];

    await queryInterface.bulkInsert(
      'users',
      users.map((u) => ({
        username: u.username,
        password_hash: hashedPassword,
        full_name: u.full_name,
        phone: u.phone,
        role: u.role,
        branch_id: u.branch_id,
      })),
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      'users',
      {
        username: {
          [Sequelize.Op.in]: [
            'manager2', 'waiter2', 'waiter3', 'waiter4', 'kitchen2', 'kitchen3', 'kitchen4',
            'b2user01', 'b2user02', 'b2user03', 'b2user04', 'b2user05',
            'b2user06', 'b2user07', 'b2user08', 'b2user09', 'b2user10',
            'b1user11', 'b1user12', 'b1user13', 'b1user14', 'b1user15',
          ],
        },
      },
      {}
    );
  },
};
