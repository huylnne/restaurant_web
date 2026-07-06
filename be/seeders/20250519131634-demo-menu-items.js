'use strict';

/**
 * SEED DEMO MENU ITEMS — seeder tên cũ nhưng dùng catalog mới cho chi nhánh 1.
 * Ctrl+F: seed demo menu items, catalog mới, branch 1 menu
 */
const { buildMenuRowsForBranch } = require('./data/restaurantMenuCatalog');

/** Giữ tên seeder cũ — dùng catalog mới cho chi nhánh 1 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.sequelize.query(
      'ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);',
      { raw: true }
    ).catch(() => {});

    await queryInterface.sequelize.query(
      `DELETE FROM order_items
       WHERE item_id IN (SELECT item_id FROM menu_items WHERE branch_id = 1)`,
      { raw: true }
    );
    await queryInterface.bulkDelete('menu_items', { branch_id: 1 });
    await queryInterface.bulkInsert('menu_items', buildMenuRowsForBranch(1, now), {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('menu_items', { branch_id: 1 });
  },
};
