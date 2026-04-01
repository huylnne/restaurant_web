'use strict';

/**
 * Seeder: Thêm đơn hàng COMPLETED cho HÔM NAY (31/03/2026)
 * để thống kê "Hôm nay" trên Dashboard có dữ liệu
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const menuItems = await queryInterface.sequelize.query(
      `SELECT item_id FROM menu_items WHERE branch_id = 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const users = await queryInterface.sequelize.query(
      `SELECT user_id FROM users WHERE username NOT IN ('admin','admin2','manager1','kitchen1','waiter1') ORDER BY user_id`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const tables = await queryInterface.sequelize.query(
      `SELECT table_id FROM tables WHERE branch_id = 1 ORDER BY table_id`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const itemIds  = menuItems.map(m => m.item_id);
    const userIds  = users.map(u => u.user_id);
    const tableIds = tables.map(t => t.table_id);

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Tạo thời gian trong ngày hôm nay (theo UTC) cho giờ ăn trưa & tối
    function todayMealTimeUTC(hour) {
      // Ngày 31/03/2026 UTC, tại giờ `hour`
      const d = new Date(Date.UTC(2026, 2, 31, hour, rand(0, 59), rand(0, 59)));
      return d;
    }

    // 8 đơn hôm nay: 3 trưa (7h-9h UTC = 14h-16h UTC+7), 5 tối (10h-13h UTC = 17h-20h UTC+7)
    const todaySlots = [7, 7, 8, 10, 10, 11, 12, 13];

    const reservations = [];
    const orders = [];
    const orderItems = [];

    for (let i = 0; i < todaySlots.length; i++) {
      const hour = todaySlots[i];
      const resTime   = todayMealTimeUTC(hour);
      const orderTime = new Date(resTime.getTime() + rand(5, 20) * 60 * 1000);
      const userId    = pick(userIds);
      const tableId   = pick(tableIds);

      reservations.push({
        user_id:          userId,
        branch_id:        1,
        table_id:         tableId,
        reservation_time: resTime,
        number_of_guests: rand(1, 5),
        status:           'confirmed',
        created_at:       resTime,
      });

      orders.push({
        _resIdx:    i,
        table_id:   tableId,
        user_id:    userId,
        status:     'COMPLETED',
        created_at: orderTime,
      });

      const numItems = rand(2, 4);
      for (let j = 0; j < numItems; j++) {
        orderItems.push({
          _orderIdx: i,
          item_id:   pick(itemIds),
          quantity:  rand(1, 3),
          status:    'served',
        });
      }
    }

    await queryInterface.bulkInsert('reservations', reservations, {});

    const insertedRes = await queryInterface.sequelize.query(
      `SELECT reservation_id FROM reservations ORDER BY reservation_id DESC LIMIT ${reservations.length}`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    insertedRes.reverse();

    const ordersToInsert = orders.map((o, idx) => ({
      reservation_id: insertedRes[idx]?.reservation_id ?? null,
      table_id:       o.table_id,
      user_id:        o.user_id,
      status:         o.status,
      created_at:     o.created_at,
    }));
    await queryInterface.bulkInsert('orders', ordersToInsert, {});

    const insertedOrders = await queryInterface.sequelize.query(
      `SELECT order_id FROM orders ORDER BY order_id DESC LIMIT ${orders.length}`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    insertedOrders.reverse();

    const oiToInsert = orderItems.map(oi => ({
      order_id: insertedOrders[oi._orderIdx]?.order_id,
      item_id:  oi.item_id,
      quantity: oi.quantity,
      status:   'served',
    })).filter(oi => oi.order_id != null);

    await queryInterface.bulkInsert('order_items', oiToInsert, {});

    console.log(`✅ Seeded ${orders.length} orders TODAY (31/03/2026 UTC)`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM order_items WHERE order_id IN (
         SELECT order_id FROM orders WHERE status='COMPLETED'
           AND created_at >= '2026-03-31 00:00:00+00'
           AND created_at  < '2026-04-01 00:00:00+00'
       )`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM orders WHERE status='COMPLETED'
         AND created_at >= '2026-03-31 00:00:00+00'
         AND created_at  < '2026-04-01 00:00:00+00'`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM reservations
         WHERE created_at >= '2026-03-31 00:00:00+00'
           AND created_at  < '2026-04-01 00:00:00+00'`
    );
  }
};
