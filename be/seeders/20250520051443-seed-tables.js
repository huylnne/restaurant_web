'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = [];
    for (let i = 1; i <= 10; i++) {
      tables.push({
        branch_id: 1,
        table_number: i,
        capacity: Math.floor(Math.random() * 6) + 2, // 2 đến 7 người
        status: 'available',
        created_at: new Date()
      });
    }

    await queryInterface.bulkInsert('tables', tables);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('tables', null, {});
  }
};
