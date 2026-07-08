/**
 * SERVICE ADMIN DASHBOARD — SQL tổng hợp số liệu nhanh cho trang /admin.
 * Ctrl+F: dashboard service, getSummary, getWeeklyRevenue, getTopDishes, peak hours
 * Luồng demo: Phần 5 — dashboard tổng quan doanh thu/lượt phục vụ/món bán chạy.
 */
const { Sequelize } = require("sequelize");
const db = require("../../models/db");
const tableSummaryService = require("./tableSummary.service");
const { completedOrderStatusSqlIn } = require("../../utils/orderStatus");
const { orderItemLineRevenueSumExpr } = require("../../utils/revenueSql");

const lineRevenueSum = orderItemLineRevenueSumExpr();

const dashboardService = {
  /** [DASHBOARD] Tổng quan hôm nay/hôm qua: doanh thu, đơn, khách, món. Ctrl+F: getSummary dashboard service */
  async getSummary(branchId = 1) {
    // Mốc thời gian: hôm nay = [00:00 hôm nay, 00:00 ngày mai).
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Mốc hôm qua = [00:00 hôm qua, 23:59:59 hôm qua] để so sánh tăng/giảm.
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Bên dưới: mỗi chỉ số (doanh thu/đơn/khách/món) chạy 2 truy vấn giống nhau cho hôm nay & hôm qua.
    // Doanh thu tính bằng lineRevenueSum (đơn giá thực tế × số lượng), chỉ tính order đã hoàn tất.

    const todayRevenueQuery = `
      SELECT ${lineRevenueSum} AS total
      FROM order_items oi
      JOIN menu_items mi ON mi.item_id = oi.item_id
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND o.created_at >= :today
        AND o.created_at < :tomorrow
        AND o.branch_id = :branchId
    `;
    const [todayRevenueResult] = await db.sequelize.query(todayRevenueQuery, {
      replacements: { today, tomorrow, branchId },
      type: Sequelize.QueryTypes.SELECT,
    });
    const todayRevenue = parseFloat(todayRevenueResult.total) || 0;

    const yesterdayRevenueQuery = `
      SELECT ${lineRevenueSum} AS total
      FROM order_items oi
      JOIN menu_items mi ON mi.item_id = oi.item_id
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND o.created_at >= :yesterday
        AND o.created_at <= :yesterdayEnd
        AND o.branch_id = :branchId
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
       WHERE o.status IN (${completedOrderStatusSqlIn()})
         AND o.created_at >= :today
         AND o.created_at < :tomorrow
         AND o.branch_id = :branchId`,
      { replacements: { today, tomorrow, branchId }, type: Sequelize.QueryTypes.SELECT }
    );
    const totalOrders = parseInt(todayOrdersResult.total, 10) || 0;

    const [yesterdayOrdersResult] = await db.sequelize.query(
      `SELECT COUNT(1)::int AS total
       FROM orders o
       WHERE o.status IN (${completedOrderStatusSqlIn()})
         AND o.created_at >= :yesterday
         AND o.created_at <= :yesterdayEnd
         AND o.branch_id = :branchId`,
      { replacements: { yesterday, yesterdayEnd, branchId }, type: Sequelize.QueryTypes.SELECT }
    );
    const yesterdayOrders = parseInt(yesterdayOrdersResult.total, 10) || 0;

    const [todayCustomersResult] = await db.sequelize.query(
      `SELECT COUNT(DISTINCT o.user_id)::int AS total
       FROM orders o
       WHERE o.status IN (${completedOrderStatusSqlIn()})
         AND o.created_at >= :today
         AND o.created_at < :tomorrow
         AND o.user_id IS NOT NULL
         AND o.branch_id = :branchId`,
      { replacements: { today, tomorrow, branchId }, type: Sequelize.QueryTypes.SELECT }
    );
    const totalCustomers = parseInt(todayCustomersResult.total, 10) || 0;

    const [yesterdayCustomersResult] = await db.sequelize.query(
      `SELECT COUNT(DISTINCT o.user_id)::int AS total
       FROM orders o
       WHERE o.status IN (${completedOrderStatusSqlIn()})
         AND o.created_at >= :yesterday
         AND o.created_at <= :yesterdayEnd
         AND o.user_id IS NOT NULL
         AND o.branch_id = :branchId`,
      { replacements: { yesterday, yesterdayEnd, branchId }, type: Sequelize.QueryTypes.SELECT }
    );
    const yesterdayCustomers = parseInt(yesterdayCustomersResult.total, 10) || 0;

    const totalItemsQuery = `
      SELECT COALESCE(SUM(quantity), 0) AS total
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND o.created_at >= :today
        AND o.created_at < :tomorrow
        AND o.branch_id = :branchId
    `;
    const [totalItemsResult] = await db.sequelize.query(totalItemsQuery, {
      replacements: { today, tomorrow, branchId },
      type: Sequelize.QueryTypes.SELECT,
    });
    const totalItems = parseInt(totalItemsResult.total) || 0;

    const yesterdayItemsQuery = `
      SELECT COALESCE(SUM(quantity), 0) AS total
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND o.created_at >= :yesterday
        AND o.created_at <= :yesterdayEnd
        AND o.branch_id = :branchId
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

  /** [DASHBOARD] Doanh thu theo 7 ngày gần nhất cho biểu đồ tuần. Ctrl+F: getWeeklyRevenue dashboard service */
  async getWeeklyRevenue(branchId = 1) {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const query = `
      SELECT 
        DATE(o.created_at) AS order_date,
        ${lineRevenueSum} AS revenue
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND o.created_at >= :startDate
        AND o.created_at <= :endDate
        AND mi.branch_id = :branchId
      GROUP BY order_date
      ORDER BY order_date
    `;

    const results = await db.sequelize.query(query, {
      type: Sequelize.QueryTypes.SELECT,
      replacements: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        branchId,
      },
    });

    const daysMap = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]; // nhãn thứ trong tuần
    // Đưa kết quả SQL vào Map: "YYYY-MM-DD" → doanh thu, để tra nhanh theo ngày.
    const revenueByDate = new Map(
      results.map((row) => {
        const dateKey =
          row.order_date instanceof Date
            ? row.order_date.toISOString().slice(0, 10)
            : String(row.order_date).slice(0, 10);
        return [dateKey, parseFloat(row.revenue)];
      })
    );

    // Lấp đầy đủ 7 ngày liên tiếp (kể cả ngày không có doanh thu → 0) để biểu đồ không bị khuyết cột.
    const output = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      // Tự ghép key ngày theo giờ LOCAL (không dùng toISOString để tránh lệch múi giờ sang ngày khác).
      const dateKey = [
        day.getFullYear(),
        String(day.getMonth() + 1).padStart(2, "0"),
        String(day.getDate()).padStart(2, "0"),
      ].join("-");

      output.push({
        day: `${daysMap[day.getDay()]} ${day.getDate()}/${day.getMonth() + 1}`,
        revenue: revenueByDate.get(dateKey) || 0,
      });
    }

    return output;
  },

  /** [DASHBOARD] Top món bán chạy theo số lượng và doanh thu. Ctrl+F: getTopDishes dashboard service */
  async getTopDishes(branchId = 1) {
    const query = `
      SELECT 
        mi.name AS dish_name,
        mi.category,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity,
        ${lineRevenueSum} AS revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
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

  /** [DASHBOARD] Trạng thái bàn từ tableSummaryService để số liệu khớp sơ đồ bàn. Ctrl+F: getTableStatus dashboard service */
  async getTableStatus(branchId = tableSummaryService.DEFAULT_BRANCH_ID) {
    const summary = await tableSummaryService.getTableSummary(branchId);
    const {
      totalTables,
      availableTables,
      servingTables,
      reservedTables,
      cleaningTables,
    } = summary;
    return {
      empty: availableTables,
      serving: servingTables,
      occupied: servingTables,
      reserved: reservedTables,
      cleaning: cleaningTables,
      total: totalTables,
      emptyPercent: totalTables ? Math.round((availableTables / totalTables) * 100) : 0,
      occupiedPercent: totalTables ? Math.round((servingTables / totalTables) * 100) : 0,
      reservedPercent: totalTables ? Math.round((reservedTables / totalTables) * 100) : 0,
      cleaningPercent: totalTables ? Math.round((cleaningTables / totalTables) * 100) : 0,
    };
  },

  /** [DASHBOARD] Thống kê giờ cao điểm theo số order hoàn thành. Ctrl+F: getPeakHours dashboard service */
  async getPeakHours(branchId = 1) {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM o.arrival_time) AS hour,
        COUNT(o.order_id) AS reservation_count
      FROM orders o
      WHERE o.order_type = 'reservation'
        AND o.status IN ('confirmed', 'completed')
        AND o.arrival_time >= NOW() - INTERVAL '30 days'
        AND o.branch_id = :branchId
      GROUP BY hour
      ORDER BY hour
    `;

    const results = await db.sequelize.query(query, {
      type: Sequelize.QueryTypes.SELECT,
      replacements: { branchId },
    });

    // Số lượt lớn nhất trong các khung giờ (tối thiểu 1 để không chia cho 0).
    const maxCount = Math.max(
      ...results.map((r) => parseInt(r.reservation_count)),
      1
    );

    return results
      .map((r) => {
        const hour = parseInt(r.hour);
        const count = parseInt(r.reservation_count);
        return {
          timeRange: `${hour}:00 - ${hour + 2}:00`,
          reservationCount: count,
          // % so với khung giờ đông nhất → dùng vẽ thanh mức độ cao điểm.
          percentage: Math.round((count / maxCount) * 100),
        };
      })
      // Chỉ giữ các khung giờ đủ đông (>30% so với đỉnh) để coi là "cao điểm".
      .filter((r) => r.percentage > 30);
  },
};

module.exports = dashboardService;
