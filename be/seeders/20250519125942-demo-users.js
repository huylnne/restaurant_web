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
        role: 'admin'
      },
      {
        username: 'admin2',
        password_hash: hashedPassword,
        full_name: 'Admin Manager',
        phone: '0123456790',
        role: 'admin'
      },
      // Manager
      {
        username: 'manager1',
        password_hash: hashedPassword,
        full_name: 'Manager One',
        phone: '0999111222',
        role: 'manager'
      },
      // Kitchen
      {
        username: 'kitchen1',
        password_hash: hashedPassword,
        full_name: 'Kitchen Staff',
        phone: '0999222333',
        role: 'kitchen'
      },
      // Waiter
      {
        username: 'waiter1',
        password_hash: hashedPassword,
        full_name: 'Waiter Staff',
        phone: '0999333444',
        role: 'waiter'
      },
      // Regular users
      {
        username: 'ngochuy',
        password_hash: hashedPassword,
        full_name: 'Lê Ngọc Huy',
        phone: '0999888777',
        role: 'user'
      },
      {
        username: 'kimberly',
        password_hash: hashedPassword,
        full_name: 'Dr. Kimberly Collier',
        phone: '0359167823',
        role: 'user'
      },
      {
        username: 'sydney',
        password_hash: hashedPassword,
        full_name: 'Sydney Rodriguez',
        phone: '0791401672',
        role: 'user'
      },
      {
        username: 'danny',
        password_hash: hashedPassword,
        full_name: 'Danny Terry',
        phone: '0285970703',
        role: 'user'
      },
      {
        username: 'debbie',
        password_hash: hashedPassword,
        full_name: 'Debbie Will',
        phone: '0137125574',
        role: 'user'
      },
      {
        username: 'adrian',
        password_hash: hashedPassword,
        full_name: 'Adrian Dietrich IV',
        phone: '0754382616',
        role: 'user'
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};