'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('123456', 10);

    await queryInterface.bulkInsert('users', [
      // Admin users
      {
        username: 'admin',
        password_hash: hashedPassword,
        full_name: 'Administrator',
        phone: '0123456789',
        role: 'admin',
        branch_id: null,
      },
      {
        username: 'admin_b1',
        password_hash: hashedPassword,
        full_name: 'Admin Branch 1',
        phone: '0123456790',
        role: 'admin',
        branch_id: 1,
      },
      {
        username: 'admin_b2',
        password_hash: hashedPassword,
        full_name: 'Admin Branch 2',
        phone: '0123456791',
        role: 'admin',
        branch_id: 2,
      },
      // Manager
      {
        username: 'manager1',
        password_hash: hashedPassword,
        full_name: 'Manager One',
        phone: '0999111222',
        role: 'manager',
        branch_id: 1,
      },
      // Kitchen
      {
        username: 'kitchen1',
        password_hash: hashedPassword,
        full_name: 'Kitchen Staff',
        phone: '0999222333',
        role: 'kitchen',
        branch_id: 1,
      },
      // Waiter
      {
        username: 'waiter1',
        password_hash: hashedPassword,
        full_name: 'Waiter Staff',
        phone: '0999333444',
        role: 'waiter',
        branch_id: 1,
      },
      // Regular users
      {
        username: 'ngochuy',
        password_hash: hashedPassword,
        full_name: 'Lê Ngọc Huy',
        phone: '0999888777',
        role: 'user',
        branch_id: 1,
      },
      {
        username: 'kimberly',
        password_hash: hashedPassword,
        full_name: 'Dr. Kimberly Collier',
        phone: '0359167823',
        role: 'user',
        branch_id: 2,
      },
      {
        username: 'sydney',
        password_hash: hashedPassword,
        full_name: 'Sydney Rodriguez',
        phone: '0791401672',
        role: 'user',
        branch_id: 2,
      },
      {
        username: 'danny',
        password_hash: hashedPassword,
        full_name: 'Danny Terry',
        phone: '0285970703',
        role: 'user',
        branch_id: 1,
      },
      {
        username: 'debbie',
        password_hash: hashedPassword,
        full_name: 'Debbie Will',
        phone: '0137125574',
        role: 'user',
        branch_id: 2,
      },
      {
        username: 'adrian',
        password_hash: hashedPassword,
        full_name: 'Adrian Dietrich IV',
        phone: '0754382616',
        role: 'user',
        branch_id: 1,
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};