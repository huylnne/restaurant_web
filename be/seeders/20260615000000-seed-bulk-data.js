'use strict';

/**
 * SEED BULK DATA — tạo dữ liệu lớn 6 tháng: khách, orders, order_items để dashboard/report có số liệu.
 * Ctrl+F: seed bulk data, CUSTOMER_COUNT, MONTHS_BACK, báo cáo demo
 */
const bcrypt = require('bcrypt');
const { fakerVI: faker } = require('@faker-js/faker');
const { BRANCH_BESTSELLER_NAMES } = require('./data/restaurantMenuCatalog');

const CUSTOMER_COUNT = 500;
const ORDERS_PER_DAY_MIN = 18;
const ORDERS_PER_DAY_MAX = 35;
const MONTHS_BACK = 6;
const REVIEW_RATE = 0.55;
const OPERATION_LOG_COUNT = 1500;
const BATCH = 500;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function buildWeightedItemPicker(menuItems, branchId) {
  const hotNames = new Set(BRANCH_BESTSELLER_NAMES[branchId] || []);
  const pool = [];
  for (const m of menuItems) {
    const weight = hotNames.has(m.name) ? 5 : m.is_featured ? 3 : 1;
    for (let i = 0; i < weight; i += 1) pool.push(m.item_id);
  }
  return () => pick(pool.length ? pool : menuItems.map((m) => m.item_id));
}

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'MOMO', 'WALLET'];
const ORDER_STATUSES = ['completed', 'completed', 'completed', 'cancelled'];
const REVIEW_COMMENTS = [
  'Món ăn ngon, phục vụ nhanh.',
  'Không gian thoáng, sẽ quay lại.',
  'Giá hợp lý, đồ ăn đậm đà.',
  'Nhân viên thân thiện, món nướng rất ngon.',
  'Hơi đông nhưng đợi không lâu.',
  'Trình bày đẹp, vị vừa miệng.',
  'Phù hợp đi gia đình cuối tuần.',
  'Món lẩu đặc biệt ấn tượng.',
  'Đồ uống pha chế ổn, món chính hơi mặn.',
  'Trải nghiệm tốt, recommend cho bạn bè.',
];

const LOG_ACTIONS = [
  { action: 'ORDER_CREATE', module: 'orders', path: '/api/orders' },
  { action: 'ORDER_UPDATE', module: 'orders', path: '/api/orders/:id' },
  { action: 'MENU_UPDATE', module: 'menu', path: '/api/menu-items/:id' },
  { action: 'TABLE_UPDATE', module: 'tables', path: '/api/tables/:id' },
  { action: 'EMPLOYEE_CREATE', module: 'employees', path: '/api/employees' },
  { action: 'PAYMENT_CONFIRM', module: 'payments', path: '/api/payments/:id/confirm' },
  { action: 'REPORT_EXPORT', module: 'reports', path: '/api/reports/export' },
  { action: 'USER_LOGIN', module: 'auth', path: '/api/auth/login' },
];

async function bulkInsertChunks(queryInterface, table, rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    await queryInterface.bulkInsert(table, rows.slice(i, i + BATCH), {});
  }
}

function mealTime(baseDate, mealSlot) {
  const d = new Date(baseDate);
  if (mealSlot === 'lunch') d.setHours(rand(11, 13), rand(0, 59), rand(0, 59), 0);
  else d.setHours(rand(17, 21), rand(0, 59), rand(0, 59), 0);
  return d;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const hashedPassword = await bcrypt.hash('123456', 10);

    const branches = await queryInterface.sequelize.query(
      `SELECT branch_id FROM branches ORDER BY branch_id`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const branchIds = branches.map((b) => b.branch_id);
    if (!branchIds.length) throw new Error('Không có chi nhánh');

    // —— 500 khách hàng ——
    const customers = [];
    for (let i = 1; i <= CUSTOMER_COUNT; i += 1) {
      const branchId = branchIds[(i - 1) % branchIds.length];
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      customers.push({
        username: `kh_${String(i).padStart(4, '0')}`,
        password_hash: hashedPassword,
        full_name: `${last} ${first}`,
        phone: `09${String(10000000 + i).slice(-8)}`,
        role: 'user',
        branch_id: branchId,
      });
    }
    await bulkInsertChunks(queryInterface, 'users', customers);
    console.log(`   ✓ ${CUSTOMER_COUNT} khách hàng`);

    const menuByBranch = {};
    const usersByBranch = {};
    const tablesByBranch = {};
    const staffByBranch = {};

    for (const branchId of branchIds) {
      menuByBranch[branchId] = await queryInterface.sequelize.query(
        `SELECT item_id, name, price, is_featured FROM menu_items WHERE branch_id = ${branchId}`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      usersByBranch[branchId] = await queryInterface.sequelize.query(
        `SELECT user_id FROM users WHERE branch_id = ${branchId} AND role = 'user'`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      tablesByBranch[branchId] = await queryInterface.sequelize.query(
        `SELECT table_id FROM tables WHERE branch_id = ${branchId}`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      staffByBranch[branchId] = await queryInterface.sequelize.query(
        `SELECT user_id, username, role FROM users WHERE branch_id = ${branchId} AND role != 'user'`,
        { type: Sequelize.QueryTypes.SELECT }
      );
    }

    const TODAY = new Date();
    TODAY.setHours(23, 59, 59, 999);
    const startDate = new Date(TODAY);
    startDate.setMonth(startDate.getMonth() - MONTHS_BACK);
    startDate.setHours(0, 0, 0, 0);

    const orders = [];
    const orderItems = [];
    let orderIdx = 0;

    for (const branchId of branchIds) {
      const menuItems = menuByBranch[branchId];
      const userIds = usersByBranch[branchId].map((u) => u.user_id);
      const tableIds = tablesByBranch[branchId].map((t) => t.table_id);
      if (!menuItems.length || !userIds.length || !tableIds.length) continue;

      const priceByItemId = Object.fromEntries(menuItems.map((m) => [m.item_id, Number(m.price)]));
      const pickItemId = buildWeightedItemPicker(menuItems, branchId);

      const cursor = new Date(startDate);
      while (cursor <= TODAY) {
        const count = rand(ORDERS_PER_DAY_MIN, ORDERS_PER_DAY_MAX);
        for (let i = 0; i < count; i += 1) {
          const meal = i % 2 === 0 ? 'lunch' : 'dinner';
          const arrivalTime = mealTime(cursor, meal);
          const orderTime = new Date(arrivalTime.getTime() + rand(5, 30) * 60 * 1000);
          const status = pick(ORDER_STATUSES);
          const paymentStatus =
            status === 'completed' ? 'succeeded' : status === 'cancelled' ? 'canceled' : 'unpaid';

          orders.push({
            user_id: pick(userIds),
            branch_id: branchId,
            table_id: pick(tableIds),
            arrival_time: arrivalTime,
            number_of_guests: rand(1, 8),
            status,
            order_type: Math.random() < 0.7 ? 'reservation' : 'dine_in',
            payment_status: paymentStatus,
            note: 'bulk_seed',
            created_at: orderTime,
          });

          if (status !== 'cancelled') {
            const numItems = rand(2, 6);
            for (let j = 0; j < numItems; j += 1) {
              orderItems.push({
                _orderIdx: orderIdx,
                item_id: pickItemId(),
                quantity: rand(1, 4),
                status: status === 'completed' ? 'served' : 'pending',
              });
            }
          }
          orderIdx += 1;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    await bulkInsertChunks(queryInterface, 'orders', orders);
    console.log(`   ✓ ${orders.length} orders`);

    const allOrders = await queryInterface.sequelize.query(
      `SELECT order_id, user_id, branch_id, status, payment_status, created_at
       FROM orders ORDER BY order_id DESC LIMIT ${orders.length}`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    allOrders.reverse();

    const priceCache = {};
    for (const branchId of branchIds) {
      for (const m of menuByBranch[branchId]) {
        priceCache[m.item_id] = Number(m.price);
      }
    }

    const oiRows = orderItems
      .map((oi) => ({
        order_id: allOrders[oi._orderIdx]?.order_id,
        item_id: oi.item_id,
        quantity: oi.quantity,
        price: priceCache[oi.item_id] ?? 0,
        status: oi.status,
      }))
      .filter((x) => x.order_id != null);

    await bulkInsertChunks(queryInterface, 'order_items', oiRows);
    console.log(`   ✓ ${oiRows.length} order_items`);

    // total_amount cho orders
    await queryInterface.sequelize.query(
      `UPDATE orders o SET total_amount = sub.sum
       FROM (
         SELECT order_id, SUM(price * quantity) AS sum
         FROM order_items GROUP BY order_id
       ) sub
       WHERE o.order_id = sub.order_id
         AND o.total_amount IS NULL`,
      { raw: true }
    );

    // —— Payments ——
    const completedOrders = allOrders.filter((o) => o.status === 'completed' && o.payment_status === 'succeeded');
    const amountRows = await queryInterface.sequelize.query(
      `SELECT order_id, COALESCE(total_amount, 0) AS total_amount FROM orders
       WHERE order_id IN (${completedOrders.map((o) => o.order_id).join(',') || '0'})`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const amountMap = Object.fromEntries(amountRows.map((r) => [r.order_id, Number(r.total_amount)]));

    const paymentRows = completedOrders.map((o, idx) => {
      const paidAt = new Date(o.created_at);
      paidAt.setMinutes(paidAt.getMinutes() + rand(10, 45));
      return {
        order_id: o.order_id,
        amount: amountMap[o.order_id] || rand(150000, 850000),
        method: pick(PAYMENT_METHODS),
        status: 'succeeded',
        transaction_ref: `BULK${idx}${rand(100000, 999999)}`,
        paid_at: paidAt,
        invoice_no: `HD${String(idx + 1).padStart(6, '0')}`,
        invoice_issued_at: paidAt,
        created_at: paidAt,
      };
    });
    await bulkInsertChunks(queryInterface, 'payments', paymentRows);
    console.log(`   ✓ ${paymentRows.length} payments`);

    // —— Reviews ——
    const reviews = [];
    for (const o of completedOrders) {
      if (Math.random() > REVIEW_RATE) continue;
      reviews.push({
        order_id: o.order_id,
        user_id: o.user_id,
        rating: rand(3, 5),
        comment: pick(REVIEW_COMMENTS),
        created_at: new Date(new Date(o.created_at).getTime() + rand(1, 72) * 3600000),
      });
    }
    await bulkInsertChunks(queryInterface, 'reviews', reviews);
    console.log(`   ✓ ${reviews.length} reviews`);

    // —— Operation logs ——
    const logs = [];
    for (let i = 0; i < OPERATION_LOG_COUNT; i += 1) {
      const branchId = pick(branchIds);
      const staff = staffByBranch[branchId];
      const actor = staff.length ? pick(staff) : null;
      const tpl = pick(LOG_ACTIONS);
      const logDate = new Date(startDate.getTime() + Math.random() * (TODAY - startDate));
      logs.push({
        user_id: actor?.user_id ?? null,
        username: actor?.username ?? 'system',
        role: actor?.role ?? 'admin',
        branch_id: branchId,
        action: tpl.action,
        module: tpl.module,
        description: `${tpl.action} — chi nhánh ${branchId}`,
        entity_type: tpl.module,
        entity_id: rand(1, 500),
        http_method: pick(['GET', 'POST', 'PUT', 'PATCH']),
        path: tpl.path,
        ip_address: faker.internet.ip(),
        status_code: pick([200, 200, 200, 201, 400, 404]),
        created_at: logDate,
      });
    }
    await bulkInsertChunks(queryInterface, 'operation_logs', logs);
    console.log(`   ✓ ${logs.length} operation_logs`);

    console.log(`✅ Bulk seed hoàn tất (${CUSTOMER_COUNT} users, ${orders.length} orders, ${paymentRows.length} payments, ${reviews.length} reviews)`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM reviews WHERE order_id IN (SELECT order_id FROM orders WHERE note = 'bulk_seed')`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM payments WHERE transaction_ref LIKE 'BULK%'`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE note = 'bulk_seed')`
    );
    await queryInterface.sequelize.query(`DELETE FROM orders WHERE note = 'bulk_seed'`);
    await queryInterface.sequelize.query(`DELETE FROM operation_logs WHERE description LIKE '%chi nhánh%'`);
    await queryInterface.bulkDelete('users', { username: { [require('sequelize').Op.like]: 'kh_%' } });
  },
};
