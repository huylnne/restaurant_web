'use strict';

/**
 * Seed thêm dữ liệu vận hành cho chi nhánh 2:
 * - reservations
 * - orders COMPLETED
 * - order_items
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const menuItems = await queryInterface.sequelize.query(
      `SELECT item_id FROM menu_items WHERE branch_id = 2`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const users = await queryInterface.sequelize.query(
      `SELECT user_id FROM users WHERE branch_id = 2 AND role = 'user' ORDER BY user_id`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const tables = await queryInterface.sequelize.query(
      `SELECT table_id FROM tables WHERE branch_id = 2 ORDER BY table_id`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!menuItems.length || !users.length || !tables.length) {
      throw new Error('Thiếu dữ liệu nền branch 2 (menu/users/tables)');
    }

    const itemIds = menuItems.map((m) => m.item_id);
    const userIds = users.map((u) => u.user_id);
    const tableIds = tables.map((t) => t.table_id);

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const TODAY = new Date('2026-03-31');
    TODAY.setHours(0, 0, 0, 0);

    const schedule = [];
    function addRange(start, days, minOrders, maxOrders) {
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        if (d <= TODAY) schedule.push({ date: d, count: rand(minOrders, maxOrders) });
      }
    }

    // 4 tháng gần nhất cho branch 2
    addRange(new Date('2025-12-01'), 31, 2, 6);
    addRange(new Date('2026-01-01'), 31, 3, 8);
    addRange(new Date('2026-02-01'), 28, 2, 7);
    addRange(new Date('2026-03-01'), 31, 3, 9);

    function mealTime(baseDate, mealSlot) {
      const d = new Date(baseDate);
      if (mealSlot === 'lunch') d.setHours(rand(11, 13), rand(0, 59), rand(0, 59), 0);
      else d.setHours(rand(17, 20), rand(0, 59), rand(0, 59), 0);
      return d;
    }

    const reservations = [];
    const orders = [];
    const orderItems = [];
    let orderIdx = 0;

    for (const { date, count } of schedule) {
      for (let i = 0; i < count; i++) {
        const meal = i % 2 === 0 ? 'lunch' : 'dinner';
        const resTime = mealTime(date, meal);
        const orderTime = new Date(resTime.getTime() + rand(8, 25) * 60 * 1000);

        const userId = pick(userIds);
        const tableId = pick(tableIds);

        reservations.push({
          user_id: userId,
          branch_id: 2,
          table_id: tableId,
          reservation_time: resTime,
          number_of_guests: rand(1, 8),
          status: 'confirmed',
          created_at: resTime,
        });

        orders.push({
          table_id: tableId,
          user_id: userId,
          status: 'COMPLETED',
          created_at: orderTime,
        });

        const numItems = rand(2, 5);
        for (let j = 0; j < numItems; j++) {
          orderItems.push({
            _orderIdx: orderIdx,
            item_id: pick(itemIds),
            quantity: rand(1, 3),
            status: 'served',
          });
        }
        orderIdx++;
      }
    }

    await queryInterface.bulkInsert('reservations', reservations, {});

    const insertedReservations = await queryInterface.sequelize.query(
      `SELECT reservation_id FROM reservations ORDER BY reservation_id DESC LIMIT ${reservations.length}`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    insertedReservations.reverse();

    const ordersToInsert = orders.map((o, idx) => ({
      reservation_id: insertedReservations[idx]?.reservation_id ?? null,
      table_id: o.table_id,
      user_id: o.user_id,
      status: o.status,
      created_at: o.created_at,
    }));
    await queryInterface.bulkInsert('orders', ordersToInsert, {});

    const insertedOrders = await queryInterface.sequelize.query(
      `SELECT order_id FROM orders ORDER BY order_id DESC LIMIT ${orders.length}`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    insertedOrders.reverse();

    const orderItemsToInsert = orderItems
      .map((oi) => ({
        order_id: insertedOrders[oi._orderIdx]?.order_id,
        item_id: oi.item_id,
        quantity: oi.quantity,
        status: oi.status,
      }))
      .filter((x) => x.order_id != null);

    await queryInterface.bulkInsert('order_items', orderItemsToInsert, {});

    console.log(
      `✅ Branch 2 demo: ${reservations.length} reservations, ${orders.length} orders, ${orderItemsToInsert.length} order_items`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM order_items
       WHERE order_id IN (
         SELECT o.order_id
         FROM orders o
         JOIN reservations r ON r.reservation_id = o.reservation_id
         WHERE r.branch_id = 2
       )`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM orders
       WHERE reservation_id IN (SELECT reservation_id FROM reservations WHERE branch_id = 2)`
    );
    await queryInterface.sequelize.query(`DELETE FROM reservations WHERE branch_id = 2`);
  },
};
