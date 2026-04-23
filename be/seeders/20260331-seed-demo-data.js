'use strict';

/**
 * Seeder: Demo data cho admin dashboard & báo cáo thống kê
 * Tạo reservations + COMPLETED orders + order_items trải đều 6 tháng gần đây
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Lấy dữ liệu thực từ DB ──────────────────────────────────────────────
    const menuItems = await queryInterface.sequelize.query(
      `SELECT item_id, price FROM menu_items WHERE branch_id = 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const users = await queryInterface.sequelize.query(
      `SELECT user_id FROM users WHERE username NOT IN ('admin','admin_b1','admin_b2','manager1','kitchen1','waiter1') ORDER BY user_id`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const tables = await queryInterface.sequelize.query(
      `SELECT table_id FROM tables WHERE branch_id = 1 ORDER BY table_id`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!menuItems.length || !users.length || !tables.length) {
      throw new Error('Thiếu dữ liệu nền (menu_items / users / tables). Hãy chạy các seeder trước.');
    }

    const itemIds  = menuItems.map(m => m.item_id);
    const userIds  = users.map(u => u.user_id);
    const tableIds = tables.map(t => t.table_id);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    /**
     * Tạo Date tại giờ ăn (lunch 11-14h, dinner 17-21h) trong một ngày nhất định
     */
    function mealTime(baseDate, mealSlot) {
      const d = new Date(baseDate);
      if (mealSlot === 'lunch') {
        d.setHours(rand(11, 13), rand(0, 59), rand(0, 59), 0);
      } else {
        d.setHours(rand(17, 20), rand(0, 59), rand(0, 59), 0);
      }
      return d;
    }

    // ── Lịch tạo đơn hàng ───────────────────────────────────────────────────
    // Dùng mốc ngày hiện tại để biểu đồ "7 ngày gần nhất" luôn có dữ liệu
    const TODAY = new Date();
    TODAY.setHours(0, 0, 0, 0);

    /**
     * ordersPerDay: mảng {date, count} – số đơn COMPLETED mỗi ngày
     * Trải 6 tháng gần đây tính theo TODAY
     */
    const schedule = [];

    // Helper: thêm nhiều ngày liên tiếp với số đơn ngẫu nhiên trong khoảng
    function addRange(start, days, minOrders, maxOrders) {
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        // Chỉ thêm ngày <= TODAY
        if (d <= TODAY) {
          schedule.push({ date: new Date(d), count: rand(minOrders, maxOrders) });
        }
      }
    }

    const sixMonthsAgo = new Date(TODAY);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);

    const diffDays = Math.floor((TODAY - sixMonthsAgo) / (24 * 60 * 60 * 1000)) + 1;
    addRange(sixMonthsAgo, diffDays, 4, 10);

    // ── Build reservations & orders ─────────────────────────────────────────
    const reservations = [];
    const orders       = [];
    const orderItems   = [];

    let reservationIdx = 0;
    let orderIdx       = 0;

    for (const { date, count } of schedule) {
      for (let i = 0; i < count; i++) {
        const meal = i % 2 === 0 ? 'lunch' : 'dinner';
        const resTime   = mealTime(date, meal);
        const orderTime = new Date(resTime.getTime() + rand(5, 20) * 60 * 1000);

        const userId  = pick(userIds);
        const tableId = pick(tableIds);

        // Reservation
        reservations.push({
          user_id:          userId,
          branch_id:        1,
          table_id:         tableId,
          reservation_time: resTime,
          number_of_guests: rand(1, 6),
          status:           'confirmed',
          created_at:       resTime,
        });

        const resPlaceholder = { _idx: reservationIdx };
        reservationIdx++;

        // Order
        orders.push({
          _resIdx:    resPlaceholder._idx,
          table_id:   tableId,
          user_id:    userId,
          status:     'COMPLETED',
          created_at: orderTime,
        });

        // OrderItems (2–4 món)
        const numItems = rand(2, 4);
        const chosenItems = [];
        for (let j = 0; j < numItems; j++) {
          chosenItems.push({
            _orderIdx: orderIdx,
            item_id:   pick(itemIds),
            quantity:  rand(1, 3),
            status:    'served',
          });
        }
        orderItems.push(...chosenItems);
        orderIdx++;
      }
    }

    // ── Insert reservations ─────────────────────────────────────────────────
    await queryInterface.bulkInsert('reservations', reservations, {});

    // Lấy lại reservation_id vừa insert (theo thứ tự created_at + user_id)
    const insertedReservations = await queryInterface.sequelize.query(
      `SELECT reservation_id FROM reservations ORDER BY reservation_id DESC LIMIT ${reservations.length}`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    // Đảo ngược để khớp thứ tự insert (DESC → ASC)
    insertedReservations.reverse();

    // ── Insert orders ───────────────────────────────────────────────────────
    const ordersToInsert = orders.map((o, idx) => ({
      reservation_id: insertedReservations[idx]?.reservation_id ?? null,
      table_id:       o.table_id,
      user_id:        o.user_id,
      status:         o.status,
      created_at:     o.created_at,
    }));
    await queryInterface.bulkInsert('orders', ordersToInsert, {});

    // Lấy lại order_id vừa insert
    const insertedOrders = await queryInterface.sequelize.query(
      `SELECT order_id FROM orders ORDER BY order_id DESC LIMIT ${orders.length}`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    insertedOrders.reverse();

    // ── Insert order_items ──────────────────────────────────────────────────
    const orderItemsToInsert = orderItems.map(oi => ({
      order_id:  insertedOrders[oi._orderIdx]?.order_id,
      item_id:   oi.item_id,
      quantity:  oi.quantity,
      status:    oi.status,
    })).filter(oi => oi.order_id != null);

    await queryInterface.bulkInsert('order_items', orderItemsToInsert, {});

    console.log(`✅ Seeded ${reservations.length} reservations, ${orders.length} orders, ${orderItemsToInsert.length} order_items`);
  },

  async down(queryInterface, Sequelize) {
    // Xóa theo thứ tự FK
    await queryInterface.sequelize.query(
      `DELETE FROM order_items WHERE order_id IN (
         SELECT order_id FROM orders WHERE status = 'COMPLETED' AND created_at < NOW()
       )`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM orders WHERE status = 'COMPLETED' AND created_at < NOW()`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM reservations WHERE status = 'confirmed' AND created_at < NOW()`
    );
  }
};
