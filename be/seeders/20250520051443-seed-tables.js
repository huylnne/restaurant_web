'use strict';

/**
 * SEED TABLES — tạo bàn vật lý cho chi nhánh demo.
 * Ctrl+F: seed tables, table_number, capacity, available
 * Luồng demo: /admin/tables hiển thị sơ đồ bàn.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const tables = [];

    for (let i = 1; i <= 50; i++) {
      tables.push({
        branch_id: 1,
        table_number: i,
        capacity: 6,
        status: 'available',
        created_at: now,
      });
    }

    await queryInterface.bulkDelete('tables', { branch_id: 1 });
    await queryInterface.bulkInsert('tables', tables, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('tables', { branch_id: 1 });
  }
};
