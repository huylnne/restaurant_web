'use strict';



/**

 * Seeder: Demo data cho admin dashboard & báo cáo thống kê

 * Tạo orders (phiên đặt bàn) + order_items trải đều 6 tháng gần đây

 */

module.exports = {

  async up(queryInterface, Sequelize) {

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



    const itemIds = menuItems.map((m) => m.item_id);

    const priceByItemId = Object.fromEntries(menuItems.map((m) => [m.item_id, m.price]));

    const userIds = users.map((u) => u.user_id);

    const tableIds = tables.map((t) => t.table_id);



    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;



    function mealTime(baseDate, mealSlot) {

      const d = new Date(baseDate);

      if (mealSlot === 'lunch') {

        d.setHours(rand(11, 13), rand(0, 59), rand(0, 59), 0);

      } else {

        d.setHours(rand(17, 20), rand(0, 59), rand(0, 59), 0);

      }

      return d;

    }



    const TODAY = new Date();

    TODAY.setHours(0, 0, 0, 0);



    const schedule = [];



    function addRange(start, days, minOrders, maxOrders) {

      for (let i = 0; i < days; i++) {

        const d = new Date(start);

        d.setDate(d.getDate() + i);

        if (d <= TODAY) {

          schedule.push({ date: new Date(d), count: rand(minOrders, maxOrders) });

        }

      }

    }



    const sixMonthsAgo = new Date(TODAY);

    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    sixMonthsAgo.setDate(1);



    const diffDays = Math.floor((TODAY - sixMonthsAgo) / (24 * 60 * 60 * 1000)) + 1;

    addRange(sixMonthsAgo, diffDays, 12, 22);



    const orders = [];

    const orderItems = [];

    let orderIdx = 0;



    for (const { date, count } of schedule) {

      for (let i = 0; i < count; i++) {

        const meal = i % 2 === 0 ? 'lunch' : 'dinner';

        const arrivalTime = mealTime(date, meal);

        const orderTime = new Date(arrivalTime.getTime() + rand(5, 20) * 60 * 1000);



        const userId = pick(userIds);

        const tableId = pick(tableIds);



        orders.push({

          user_id: userId,

          branch_id: 1,

          table_id: tableId,

          arrival_time: arrivalTime,

          number_of_guests: rand(1, 6),

          status: 'completed',

          order_type: 'reservation',

          payment_status: 'succeeded',

          created_at: orderTime,

        });



        const numItems = rand(2, 4);

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



    await queryInterface.bulkInsert('orders', orders, {});



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

        price: priceByItemId[oi.item_id] ?? 0,

        status: oi.status,

      }))

      .filter((oi) => oi.order_id != null);



    await queryInterface.bulkInsert('order_items', orderItemsToInsert, {});



    console.log(`✅ Seeded ${orders.length} orders, ${orderItemsToInsert.length} order_items`);

  },



  async down(queryInterface) {

    await queryInterface.sequelize.query(

      `DELETE FROM order_items WHERE order_id IN (

         SELECT order_id FROM orders WHERE status = 'completed' AND created_at < NOW()

       )`

    );

    await queryInterface.sequelize.query(

      `DELETE FROM orders WHERE status = 'completed' AND created_at < NOW()`

    );

  },

};

