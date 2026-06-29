'use strict';

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
