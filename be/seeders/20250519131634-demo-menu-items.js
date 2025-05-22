// seeders/20250521-menu-items.js
'use strict';

const { faker } = require('@faker-js/faker');

module.exports = {
  async up(queryInterface, Sequelize) {
    const categories = ['Món chính', 'Khai vị', 'Tráng miệng', 'Đồ uống'];
    const now = new Date();
    const items = [];

    for (let i = 0; i < 50; i++) {
      items.push({
        branch_id: 1,
        name: faker.commerce.productName(),
        description: faker.lorem.sentence(),
        price: faker.number.float({ min: 20000, max: 200000, precision: 1000 }),
        category: faker.helpers.arrayElement(categories),
        is_active: true,
        is_featured: faker.datatype.boolean(),
        created_at: now,
        image_url: faker.image.url(),
      });
    }

    await queryInterface.bulkDelete('menu_items', { branch_id: 1 });
    await queryInterface.bulkInsert('menu_items', items, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('menu_items', { branch_id: 1 });
  }
};
