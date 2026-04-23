const { Sequelize, Op } = require("sequelize");
const db = require("../../models/db");
const {
  Order,
  OrderItem,
  MenuItem,
  Reservation,
  Table,
} = require("../../models");
const tableSummaryService = require("./tableSummary.service");

const dashboardService = {
  //  1. Tổng quan
  async getSummary(branchId = 1) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ✅ Hôm qua = ngày liền trước (bất kể tuần nào)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Doanh thu hôm nay
    const todayRevenueQuery = `
      SELECT COALESCE(SUM(mi.price * oi.quantity), 0) AS total
      FROM order_items oi
      JOIN menu_items mi ON mi.item_id = oi.item_id
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.status = 'COMPLETED'
        AND o.created_at >= :today
        AND o.created_at < :tomorrow
        AND mi.branch_id = :branchId
    `;
    const [todayRevenueResult] = await db.sequelize.query(todayRevenueQuery, {
      replacements: { today, tomorrow, branchId },
      type: Sequelize.QueryTypes.SELECT,
    });
    const todayRevenue = parseFloat(todayRevenueResult.total) || 0;

    // Doanh thu hôm qua
    const yesterdayRevenueQuery = `
      SELECT COALESCE(SUM(mi.price * oi.quantity), 0) AS total
      FROM order_items oi
      JOIN menu_items mi ON mi.item_id = oi.item_id
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.status = 'COMPLETED'
        AND o.created_at >= :yesterday
        AND o.created_at <= :yesterdayEnd
        AND mi.branch_id = :branchId
    `;
    const [yesterdayRevenueResult] = await db.sequelize.query(
      yesterdayRevenueQuery,
      {
        replacements: { yesterday, yesterdayEnd, branchId },
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    const yesterdayRevenue = parseFloat(yesterdayRevenueResult.total) || 0;

    const [todayOrdersResult] = await db.sequelize.query(
      `SELECT COUNT(1)::int AS total
       FROM orders o
       WHERE o.status = 'COMPLETED'
         AND o.created_at >= :today
         AND o.created_at < :tomorrow
         AND o.table_id IN (SELECT table_id FROM tables WHERE branch_id = :branchId)`,
      { replacements: { today, tomorrow, branchId }, type: Sequelize.QueryTypes.SELECT }
    );
    const totalOrders = parseInt(todayOrdersResult.total, 10) || 0;

    const [yesterdayOrdersResult] = await db.sequelize.query(
      `SELECT COUNT(1)::int AS total
       FROM orders o
       WHERE o.status = 'COMPLETED'
         AND o.created_at >= :yesterday
         AND o.created_at <= :yesterdayEnd
         AND o.table_id IN (SELECT table_id FROM tables WHERE branch_id = :branchId)`,
      { replacements: { yesterday, yesterdayEnd, branchId }, type: Sequelize.QueryTypes.SELECT }
    );
    const yesterdayOrders = parseInt(yesterdayOrdersResult.total, 10) || 0;

    const [todayCustomersResult] = await db.sequelize.query(
      `SELECT COUNT(DISTINCT o.reservation_id)::int AS total
       FROM orders o
       WHERE o.status = 'COMPLETED'
         AND o.created_at >= :today
         AND o.created_at < :tomorrow
         AND o.reservation_id IS NOT NULL
         AND o.table_id IN (SELECT table_id FROM tables WHERE branch_id = :branchId)`,
      { replacements: { today, tomorrow, branchId }, type: Sequelize.QueryTypes.SELECT }
    );
    const totalCustomers = parseInt(todayCustomersResult.total, 10) || 0;

    const [yesterdayCustomersResult] = await db.sequelize.query(
      `SELECT COUNT(DISTINCT o.reservation_id)::int AS total
       FROM orders o
       WHERE o.status = 'COMPLETED'
         AND o.created_at >= :yesterday
         AND o.created_at <= :yesterdayEnd
         AND o.reservation_id IS NOT NULL
         AND o.table_id IN (SELECT table_id FROM tables WHERE branch_id = :branchId)`,
      { replacements: { yesterday, yesterdayEnd, branchId }, type: Sequelize.QueryTypes.SELECT }
    );
    const yesterdayCustomers = parseInt(yesterdayCustomersResult.total, 10) || 0;

    // Tổng món hôm nay
    const totalItemsQuery = `
      SELECT COALESCE(SUM(quantity), 0) AS total
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.status = 'COMPLETED'
        AND o.created_at >= :today
        AND o.created_at < :tomorrow
        AND o.table_id IN (SELECT table_id FROM tables WHERE branch_id = :branchId)
    `;
    const [totalItemsResult] = await db.sequelize.query(totalItemsQuery, {
      replacements: { today, tomorrow, branchId },
      type: Sequelize.QueryTypes.SELECT,
    });
    const totalItems = parseInt(totalItemsResult.total) || 0;

    // Tổng món hôm qua
    const yesterdayItemsQuery = `
      SELECT COALESCE(SUM(quantity), 0) AS total
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.status = 'COMPLETED'
        AND o.created_at >= :yesterday
        AND o.created_at <= :yesterdayEnd
        AND o.table_id IN (SELECT table_id FROM tables WHERE branch_id = :branchId)
    `;
    const [yesterdayItemsResult] = await db.sequelize.query(
      yesterdayItemsQuery,
      {
        replacements: { yesterday, yesterdayEnd, branchId },
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    const yesterdayItems = parseInt(yesterdayItemsResult.total) || 0;

    return {
      todayRevenue,
      yesterdayRevenue,
      totalOrders,
      yesterdayOrders,
      totalCustomers,
      yesterdayCustomers,
      totalItems,
      yesterdayItems,
    };
  },

  //  2. Doanh thu theo tuần (T2-CN)
  async getWeeklyRevenue(branchId = 1) {
    // ✅ Tính ngày đầu tuần (Thứ Hai) và cuối tuần (Chủ Nhật)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7

    // Tính ngày Thứ Hai của tuần hiện tại
    const startOfWeek = new Date(today);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Nếu hôm nay là CN, lùi 6 ngày
    startOfWeek.setDate(today.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Tính ngày Chủ Nhật của tuần hiện tại
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const query = `
      SELECT 
        EXTRACT(DOW FROM o.created_at) AS day_of_week,
        COALESCE(SUM(mi.price * oi.quantity), 0) AS revenue
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.status = 'COMPLETED'
        AND o.created_at >= :startOfWeek
        AND o.created_at <= :endOfWeek
        AND mi.branch_id = :branchId
      GROUP BY day_of_week
      ORDER BY day_of_week
    `;

    const results = await db.sequelize.query(query, {
      type: Sequelize.QueryTypes.SELECT,
      replacements: {
        startOfWeek: startOfWeek.toISOString(),
        endOfWeek: endOfWeek.toISOString(),
        branchId,
      },
    });

    // Map 0=CN, 1=T2, 2=T3, ..., 6=T7
    const daysMap = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    // ✅ Sắp xếp lại theo thứ tự T2 -> CN
    const daysOrder = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const weeklyData = daysOrder.map((day) => {
      const dayIndex = daysMap.indexOf(day);
      const found = results.find((r) => parseInt(r.day_of_week) === dayIndex);
      return {
        day,
        revenue: found ? parseFloat(found.revenue) : 0,
      };
    });

    return weeklyData;
  },

  // 🍽 3. Top 5 món ăn bán chạy (số món đã bán = tổng quantity, không phải số dòng order_item)
  async getTopDishes(branchId = 1) {
    const query = `
      SELECT 
        mi.name AS dish_name,
        mi.category,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity,
        COALESCE(SUM(mi.price * oi.quantity), 0) AS revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status = 'COMPLETED'
        AND mi.branch_id = :branchId
      GROUP BY mi.item_id, mi.name, mi.category
      ORDER BY total_quantity DESC
      LIMIT 5
    `;

    const results = await db.sequelize.query(query, {
      type: Sequelize.QueryTypes.SELECT,
      replacements: { branchId },
    });

    return results.map((r) => ({
      name: r.dish_name,
      category: r.category,
      soldCount: parseInt(r.total_quantity, 10) || 0,
      revenue: parseFloat(r.revenue) || 0,
    }));
  },

  //  4. Tình trạng bàn ăn – dùng chung tableSummary.service với trang Quản lý bàn
  async getTableStatus(branchId = tableSummaryService.DEFAULT_BRANCH_ID) {
    const summary = await tableSummaryService.getTableSummary(branchId);
    const { totalTables, availableTables, servingTables, reservedTables } = summary;
    return {
      empty: availableTables,
      serving: servingTables,
      occupied: servingTables,
      reserved: reservedTables,
      total: totalTables,
      emptyPercent: totalTables ? Math.round((availableTables / totalTables) * 100) : 0,
      occupiedPercent: totalTables ? Math.round((servingTables / totalTables) * 100) : 0,
      reservedPercent: totalTables ? Math.round((reservedTables / totalTables) * 100) : 0,
    };
  },

  //  5. Thời gian phục vụ cao điểm
  async getPeakHours(branchId = 1) {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM r.reservation_time) AS hour,
        COUNT(r.reservation_id) AS reservation_count
      FROM reservations r
      WHERE r.status = 'confirmed'
        AND r.reservation_time >= NOW() - INTERVAL '30 days'
        AND r.branch_id = :branchId
      GROUP BY hour
      ORDER BY hour
    `;

    const results = await db.sequelize.query(query, {
      type: Sequelize.QueryTypes.SELECT,
      replacements: { branchId },
    });

    // Tìm giờ cao điểm nhất
    const maxCount = Math.max(
      ...results.map((r) => parseInt(r.reservation_count))
    );

    return results
      .map((r) => {
        const hour = parseInt(r.hour);
        const count = parseInt(r.reservation_count);
        return {
          timeRange: `${hour}:00 - ${hour + 2}:00`,
          reservationCount: count,
          percentage: Math.round((count / maxCount) * 100),
        };
      })
      .filter((r) => r.percentage > 30);
  },
};

module.exports = dashboardService;