"use strict";

const { faker } = require("@faker-js/faker");

module.exports = {
  async up(queryInterface, Sequelize) {
    const menuItems = [];

    const categories = ["Món chính", "Món phụ", "Đồ uống", "Tráng miệng"];

    for (let i = 1; i <= 20; i++) {
      menuItems.push({
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.number.int({ min: 20000, max: 100000 }),
        category: categories[Math.floor(Math.random() * categories.length)],
        is_active: true,
        created_at: new Date(),
        is_featured: faker.datatype.boolean(),
        image_url: faker.image.urlPicsumPhotos(), // ảnh thật từ picsum.photos
        branch_id: 1
      });
    }

    await queryInterface.bulkInsert("menu_items", menuItems);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("menu_items", null, {});
  }
};
