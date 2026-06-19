'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const users = await queryInterface.sequelize.query(
      `SELECT user_id FROM users WHERE role = 'user' ORDER BY user_id LIMIT 5;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const tables = await queryInterface.sequelize.query(
      `SELECT table_id FROM tables WHERE branch_id = 1 ORDER BY table_id LIMIT 10;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const userIds = users.map((u) => u.user_id);
    const tableIds = tables.map((t) => t.table_id);

    if (userIds.length === 0 || tableIds.length === 0) {
      console.log('⚠️ Không có user hoặc table để seed orders');
      return;
    }

    const orders = [];

    for (let i = 0; i < 10; i++) {
      const arrival = new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000);
      orders.push({
        user_id: userIds[Math.floor(Math.random() * userIds.length)],
        table_id: tableIds[Math.floor(Math.random() * tableIds.length)],
        branch_id: 1,
        arrival_time: arrival,
        number_of_guests: Math.floor(Math.random() * 6) + 2,
        status: 'confirmed',
        order_type: 'reservation',
        payment_status: 'unpaid',
        created_at: now,
      });
    }

    await queryInterface.bulkDelete('orders', { branch_id: 1, order_type: 'reservation', status: 'confirmed' });
    await queryInterface.bulkInsert('orders', orders, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('orders', { branch_id: 1, order_type: 'reservation', status: 'confirmed' });
  },
};
