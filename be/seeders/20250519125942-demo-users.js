// seeders/20250521-users.js
'use strict';

const { faker } = require('@faker-js/faker');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const users = [];

    for (let i = 0; i < 100; i++) {
      users.push({
        branch_id: 1,
        username: faker.internet.userName() + faker.number.int({ min: 1000, max: 9999 }),
        password_hash: faker.internet.password(),
        role: 'user', // hoặc 'user' nếu enum đúng tên đó
        full_name: faker.person.fullName(),
        phone: faker.phone.number('09########'),
        created_at: now,
        avatar_url: faker.image.avatar(),
      });
    }

    await queryInterface.bulkDelete('users', { branch_id: 1 });
    await queryInterface.bulkInsert('users', users, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { branch_id: 1 });
  }
};
