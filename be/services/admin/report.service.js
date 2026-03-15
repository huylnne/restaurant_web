const { Order, OrderItem, MenuItem, Reservation, Table, User, Payment } = require('../../models');
const { Sequelize, Op } = require('sequelize');
const db = require('../../models/db');

const reportService = {
  // Thống kê tổng quan
  async getOverviewStats(branchId = 1, startDate, endDate) {
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Tổng doanh thu từ order_items
    let revenueQuery = `
      SELECT COALESCE(SUM(oi.quantity * mi.price), 0) as total_revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status = 'COMPLETED'
        AND mi.branch_id = $1
    `;
    
    const revenueParams = [branchId];
    
    if (startDate && endDate) {
      revenueQuery += ` AND o.created_at BETWEEN $2 AND $3`;
      revenueParams.push(startDate, endDate);
    }

    const [revenueResult] = await db.sequelize.query(revenueQuery, {
      bind: revenueParams,
      type: Sequelize.QueryTypes.SELECT
    });

    // Tổng số đơn hàng hoàn thành
    const totalOrders = await Order.count({
      where: {
        status: 'COMPLETED',
        ...whereClause
      }
    });

    // Tổng số đơn hàng đang xử lý
    const pendingOrders = await Order.count({
      where: {
        status: 'IN_PROGRESS'
      }
    });

    // Tổng số reservation
    const totalReservations = await Reservation.count({
      where: {
        branch_id: branchId,
        ...whereClause
      }
    });

    // Số khách hàng unique
    let customerQuery = `
      SELECT COUNT(DISTINCT r.user_id) as total
      FROM reservations r
      WHERE r.branch_id = $1
    `;
    
    const customerParams = [branchId];
    
    if (startDate && endDate) {
      customerQuery += ` AND r.created_at BETWEEN $2 AND $3`;
      customerParams.push(startDate, endDate);
    }

    const [customerResult] = await db.sequelize.query(customerQuery, {
      bind: customerParams,
      type: Sequelize.QueryTypes.SELECT
    });

    return {
      totalRevenue: parseFloat(revenueResult.total_revenue) || 0,
      totalOrders,
      pendingOrders,
      totalReservations,
      totalCustomers: parseInt(customerResult.total) || 0
    };
  },

  // Doanh thu theo ngày (7 ngày gần nhất)
  async getRevenueByDay(branchId = 1, days = 7) {
    const query = `
      SELECT 
        DATE(o.created_at) as date,
        COALESCE(SUM(oi.quantity * mi.price), 0) as revenue
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.status = 'COMPLETED'
        AND mi.branch_id = $1
        AND o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `;

    const result = await db.sequelize.query(query, {
      bind: [branchId],
      type: Sequelize.QueryTypes.SELECT
    });

    return result;
  },

  // Món ăn bán chạy nhất
  async getTopSellingItems(branchId = 1, limit = 10) {
    const query = `
      SELECT 
        mi.item_id,
        mi.name,
        mi.category,
        mi.price,
        mi.image_url,
        SUM(oi.quantity) as total_sold,
        COALESCE(SUM(oi.quantity * mi.price), 0) as total_revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status = 'COMPLETED'
        AND mi.branch_id = $1
      GROUP BY mi.item_id, mi.name, mi.category, mi.price, mi.image_url
      ORDER BY total_sold DESC
      LIMIT $2
    `;

    const result = await db.sequelize.query(query, {
      bind: [branchId, limit],
      type: Sequelize.QueryTypes.SELECT
    });

    return result;
  },

  // Doanh thu theo danh mục món ăn
  async getRevenueByCategory(branchId = 1) {
    const query = `
      SELECT 
        mi.category,
        COALESCE(SUM(oi.quantity * mi.price), 0) as revenue,
        SUM(oi.quantity) as total_sold
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status = 'COMPLETED'
        AND mi.branch_id = $1
      GROUP BY mi.category
      ORDER BY revenue DESC
    `;

    const result = await db.sequelize.query(query, {
      bind: [branchId],
      type: Sequelize.QueryTypes.SELECT
    });

    return result;
  },

  // Thống kê theo giờ trong ngày
  async getOrdersByHour(branchId = 1) {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM o.created_at) as hour,
        COUNT(o.order_id) as order_count,
        COALESCE(SUM(oi.quantity * mi.price), 0) as revenue
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.status = 'COMPLETED'
        AND mi.branch_id = $1
        AND DATE(o.created_at) = CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM o.created_at)
      ORDER BY hour ASC
    `;

    const result = await db.sequelize.query(query, {
      bind: [branchId],
      type: Sequelize.QueryTypes.SELECT
    });

    return result;
  },

  // Khách hàng thân thiết (top customers)
  async getTopCustomers(branchId = 1, limit = 10) {
    const query = `
      SELECT 
        u.user_id,
        u.full_name,
        u.phone,
        COUNT(DISTINCT r.reservation_id) as total_orders,
        COALESCE(SUM(oi.quantity * mi.price), 0) as total_spent
      FROM users u
      JOIN reservations r ON u.user_id = r.user_id
      LEFT JOIN orders o ON r.reservation_id = o.reservation_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE (o.status = 'COMPLETED' OR o.status IS NULL)
        AND r.branch_id = $1
      GROUP BY u.user_id, u.full_name, u.phone
      HAVING COALESCE(SUM(oi.quantity * mi.price), 0) > 0
      ORDER BY total_spent DESC
      LIMIT $2
    `;

    const result = await db.sequelize.query(query, {
      bind: [branchId, limit],
      type: Sequelize.QueryTypes.SELECT
    });

    return result;
  },

  // Thống kê bàn ăn
  async getTableStats(branchId = 1) {
    const totalTables = await Table.count({ where: { branch_id: branchId } });
    const availableTables = await Table.count({ 
      where: { branch_id: branchId, status: 'available' } 
    });
    const occupiedTables = await Table.count({ 
      where: { branch_id: branchId, status: 'occupied' } 
    });
    const reservedTables = await Table.count({ 
      where: { branch_id: branchId, status: 'pre-ordered' } 
    });

    return {
      totalTables,
      availableTables,
      occupiedTables,
      reservedTables,
      occupancyRate: totalTables > 0 ? ((occupiedTables / totalTables) * 100).toFixed(2) : 0
    };
  },

  // So sánh doanh thu theo tháng
  async getMonthlyRevenue(branchId = 1, months = 6) {
    const query = `
      SELECT 
        TO_CHAR(o.created_at, 'YYYY-MM') as month,
        COALESCE(SUM(oi.quantity * mi.price), 0) as revenue,
        COUNT(DISTINCT o.order_id) as order_count
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.status = 'COMPLETED'
        AND mi.branch_id = $1
        AND o.created_at >= CURRENT_DATE - INTERVAL '${months} months'
      GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
      ORDER BY month ASC
    `;

    const result = await db.sequelize.query(query, {
      bind: [branchId],
      type: Sequelize.QueryTypes.SELECT
    });

    return result;
  }
};

module.exports = reportService;