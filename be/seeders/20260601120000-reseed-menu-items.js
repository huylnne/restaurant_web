'use strict';

/**
 * SEED RESEED MENU ITEMS — tạo lại menu_items cho tất cả chi nhánh active từ catalog.
 * Ctrl+F: seed menu items, reseed-menu-items, buildMenuRowsForBranch
 * Luồng demo: Phần 2/5 xem thực đơn public/admin.
 */
const { Op } = require('sequelize');
const { buildMenuRowsForBranch } = require('./data/restaurantMenuCatalog');

/** npx sequelize-cli db:seed --seed 20260601120000-reseed-menu-items.js */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const branches = await queryInterface.sequelize.query(
      `SELECT branch_id FROM branches WHERE is_active IS DISTINCT FROM false ORDER BY branch_id`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const branchIds = branches.map((b) => Number(b.branch_id)).filter(Number.isFinite);
    if (!branchIds.length) branchIds.push(1);

    await queryInterface.sequelize.query(
      'ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);',
      { raw: true }
    ).catch(() => {});

    const idList = branchIds.join(',');
    await queryInterface.sequelize.query(
      `DELETE FROM order_items
       WHERE item_id IN (SELECT item_id FROM menu_items WHERE branch_id IN (${idList}))`,
      { raw: true }
    );
    await queryInterface.bulkDelete('menu_items', {
      branch_id: { [Op.in]: branchIds },
    });

    const allRows = [];
    for (const branchId of branchIds) {
      allRows.push(...buildMenuRowsForBranch(branchId, now));
    }
    await queryInterface.bulkInsert('menu_items', allRows, {});

    await queryInterface.sequelize.query(
      `SELECT setval(
        pg_get_serial_sequence('menu_items', 'item_id'),
        COALESCE((SELECT MAX(item_id) FROM menu_items), 1)
      )`,
      { raw: true }
    ).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('menu_items', null, {});
  },
};
