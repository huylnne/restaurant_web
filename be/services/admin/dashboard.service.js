const { Sequelize, Op } = require("sequelize");
const db = require("../../models/db");
const {
  Order,
  OrderItem,
  MenuItem,
  Reservation,
  Table,
} = require("../../models");

const dashboardService = {
  //  1. Tổng quan
  async getSummary() {
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
    `;
    const [todayRevenueResult] = await db.sequelize.query(todayRevenueQuery, {
      replacements: { today, tomorrow },
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
    `;
    const [yesterdayRevenueResult] = await db.sequelize.query(
      yesterdayRevenueQuery,
      {
        replacements: { yesterday, yesterdayEnd },
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    const yesterdayRevenue = parseFloat(yesterdayRevenueResult.total) || 0;

    // Tổng đơn hàng hôm nay
    const totalOrders = await Order.count({
      where: {
        status: "COMPLETED",
        created_at: { [Op.gte]: today, [Op.lt]: tomorrow },
      },
    });

    // Tổng đơn hàng hôm qua
    const yesterdayOrders = await Order.count({
      where: {
        status: "COMPLETED",
        created_at: { [Op.gte]: yesterday, [Op.lte]: yesterdayEnd },
      },
    });

    // Số khách hôm nay
    const totalCustomers = await Order.count({
      distinct: true,
      col: "reservation_id",
      where: {
        status: "COMPLETED",
        created_at: { [Op.gte]: today, [Op.lt]: tomorrow },
        reservation_id: { [Op.ne]: null },
      },
    });

    // Số khách hôm qua
    const yesterdayCustomers = await Order.count({
      distinct: true,
      col: "reservation_id",
      where: {
        status: "COMPLETED",
        created_at: { [Op.gte]: yesterday, [Op.lte]: yesterdayEnd },
        reservation_id: { [Op.ne]: null },
      },
    });

    // Tổng món hôm nay
    const totalItemsQuery = `
      SELECT COALESCE(SUM(quantity), 0) AS total
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.status = 'COMPLETED'
        AND o.created_at >= :today
        AND o.created_at < :tomorrow
    `;
    const [totalItemsResult] = await db.sequelize.query(totalItemsQuery, {
      replacements: { today, tomorrow },
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
    `;
    const [yesterdayItemsResult] = await db.sequelize.query(
      yesterdayItemsQuery,
      {
        replacements: { yesterday, yesterdayEnd },
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
  async getWeeklyRevenue() {
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
      GROUP BY day_of_week
      ORDER BY day_of_week
    `;

    const results = await db.sequelize.query(query, {
      type: Sequelize.QueryTypes.SELECT,
      replacements: {
        startOfWeek: startOfWeek.toISOString(),
        endOfWeek: endOfWeek.toISOString(),
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

  // 🍽 3. Top 5 món ăn bán chạy
  async getTopDishes() {
    const query = `
      SELECT 
        mi.name AS dish_name,
        mi.category,
        COUNT(oi.order_item_id) AS times_sold,
        SUM(mi.price * oi.quantity) AS revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status = 'COMPLETED'
      GROUP BY mi.item_id, mi.name, mi.category
      ORDER BY times_sold DESC
      LIMIT 5
    `;

    const results = await db.sequelize.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });

    return results.map((r) => ({
      name: r.dish_name,
      category: r.category,
      soldCount: parseInt(r.times_sold),
      revenue: parseFloat(r.revenue),
    }));
  },

  //  4. Tình trạng bàn ăn (Trống / Đang phục vụ / Đã đặt)
  async getTableStatus() {
    const now = new Date();

    // Bàn trống
    const emptyTables = await Table.count({
      where: {
        status: "available",
      },
    });

    // Bàn đang phục vụ
    const occupiedTables = await Table.count({
      where: {
        status: "occupied",
      },
    });

    // ✅ Bàn đã đặt trước (có reservation_time > now)
    const reservedTablesQuery = `
      SELECT COUNT(DISTINCT t.table_id) as count
      FROM tables t
      JOIN reservations r ON t.table_id = r.table_id
      WHERE r.status = 'confirmed'
        AND r.reservation_time > :now
    `;
    const [reservedResult] = await db.sequelize.query(reservedTablesQuery, {
      replacements: { now: now.toISOString() },
      type: Sequelize.QueryTypes.SELECT,
    });
    const reservedTables = parseInt(reservedResult.count) || 0;

    // ✅ Tự động set lại status 'available' cho bàn có reservation đã qua
    const expiredReservationsQuery = `
      UPDATE tables t
      SET status = 'available'
      WHERE t.status = 'pre-ordered'
        AND t.table_id IN (
          SELECT r.table_id
          FROM reservations r
          WHERE r.status = 'confirmed'
            AND r.reservation_time <= :now
        )
    `;
    await db.sequelize.query(expiredReservationsQuery, {
      replacements: { now: now.toISOString() },
      type: Sequelize.QueryTypes.UPDATE,
    });

    const totalTables = await Table.count();

    return {
      empty: emptyTables,
      serving: occupiedTables,
      occupied: occupiedTables,
      reserved: reservedTables,
      total: totalTables,
      emptyPercent: totalTables
        ? Math.round((emptyTables / totalTables) * 100)
        : 0,
      occupiedPercent: totalTables
        ? Math.round((occupiedTables / totalTables) * 100)
        : 0,
      reservedPercent: totalTables
        ? Math.round((reservedTables / totalTables) * 100)
        : 0,
    };
  },

  //  5. Thời gian phục vụ cao điểm
  async getPeakHours() {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM r.reservation_time) AS hour,
        COUNT(r.reservation_id) AS reservation_count
      FROM reservations r
      WHERE r.status = 'confirmed'
        AND r.reservation_time >= NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY hour
    `;

    const results = await db.sequelize.query(query, {
      type: Sequelize.QueryTypes.SELECT,
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