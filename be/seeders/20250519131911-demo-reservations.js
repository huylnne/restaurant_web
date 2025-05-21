'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Lấy danh sách user_id có sẵn
    const users = await queryInterface.sequelize.query(
      'SELECT user_id FROM users LIMIT 3;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // 2. Lấy danh sách table_id có sẵn
    const tables = await queryInterface.sequelize.query(
      'SELECT table_id FROM tables LIMIT 5;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (users.length === 0 || tables.length === 0) {
      console.log('❌ Không có user hoặc table để seed reservation!');
      return;
    }

    // 3. Tạo danh sách seed reservations
    const reservations = [];

    for (let i = 0; i < 10; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const table = tables[Math.floor(Math.random() * tables.length)];

      reservations.push({
        user_id: user.user_id,
        branch_id: 1,
        table_id: table.table_id,
        reservation_time: new Date(Date.now() + i * 3600000), // mỗi cái cách nhau 1 giờ
        number_of_guests: Math.floor(Math.random() * 5) + 1,
        status: ['confirmed', 'pending', 'cancelled'][i % 3],
        created_at: new Date()
      });
    }

    await queryInterface.bulkInsert('reservations', reservations);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('reservations', null, {});
  }
};
