/**
 * SERVICE ADMIN REPORT — logic SQL báo cáo doanh thu/thống kê theo chi nhánh.
 * Ctrl+F: report service, getOverviewStats, getRevenueByDay, getTopSellingItems
 * Luồng demo: Phần 5 — báo cáo & thống kê sau khi thanh toán.
 */
const { Order } = require('../../models');
const { Sequelize, Op } = require('sequelize');
const db = require('../../models/db');
const tableSummaryService = require('./tableSummary.service');
const {
  completedOrderStatusSqlIn,
  inProgressOrderStatusSqlIn,
} = require('../../utils/orderStatus');
const { hasDateRange, inclusiveDateClause } = require('../../utils/reportDateRange');
const { orderItemLineRevenueSumExpr } = require('../../utils/revenueSql');

const lineRevenueSum = orderItemLineRevenueSumExpr();

const reportService = {
  /** [BÁO CÁO] Tổng quan doanh thu/đơn/khách/đặt bàn theo khoảng ngày. Ctrl+F: getOverviewStats report service */
  async getOverviewStats(branchId = 1, startDate, endDate) {
    const whereClause = {};
    if (hasDateRange(startDate, endDate)) {
      whereClause.created_at = {
        [Op.gte]: new Date(startDate),
        [Op.lt]: new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000),
      };
    }

    const revenueParams = [branchId];
    let revenueQuery = `
      SELECT ${lineRevenueSum} as total_revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND mi.branch_id = $1
    `;
    revenueQuery += inclusiveDateClause('o.created_at', revenueParams, startDate, endDate);

    const [revenueResult] = await db.sequelize.query(revenueQuery, {
      bind: revenueParams,
      type: Sequelize.QueryTypes.SELECT,
    });

    const orderCountParams = [branchId];
    const orderCountQuery = `
      SELECT
        COUNT(*) FILTER (WHERE o.status IN (${completedOrderStatusSqlIn()})) AS total_completed_orders,
        COUNT(*) FILTER (WHERE o.status IN (${inProgressOrderStatusSqlIn()})) AS total_in_progress_orders
      FROM orders o
      WHERE o.branch_id = $1
      ${inclusiveDateClause('o.created_at', orderCountParams, startDate, endDate)}
    `;

    const [orderCountResult] = await db.sequelize.query(orderCountQuery, {
      bind: orderCountParams,
      type: Sequelize.QueryTypes.SELECT,
    });

    const totalOrders = parseInt(orderCountResult.total_completed_orders, 10) || 0;
    const pendingOrders = parseInt(orderCountResult.total_in_progress_orders, 10) || 0;

    const totalReservations = await Order.count({
      where: {
        branch_id: branchId,
        order_type: 'reservation',
        ...whereClause,
      },
    });

    const customerParams = [branchId];
    let customerQuery = `
      SELECT COUNT(DISTINCT o.user_id) as total
      FROM orders o
      WHERE o.branch_id = $1
        AND o.user_id IS NOT NULL
    `;
    customerQuery += inclusiveDateClause('o.created_at', customerParams, startDate, endDate);

    const [customerResult] = await db.sequelize.query(customerQuery, {
      bind: customerParams,
      type: Sequelize.QueryTypes.SELECT,
    });

    return {
      totalRevenue: parseFloat(revenueResult.total_revenue) || 0,
      totalOrders,
      pendingOrders,
      totalReservations,
      totalCustomers: parseInt(customerResult.total, 10) || 0,
    };
  },

  /** [BÁO CÁO] Doanh thu từng ngày theo days hoặc khoảng start/end. Ctrl+F: getRevenueByDay report service */
  async getRevenueByDay(branchId = 1, days = 7, startDate, endDate) {
    const params = [branchId];
    let dateFilter = inclusiveDateClause('o.created_at', params, startDate, endDate);
    if (!dateFilter) {
      dateFilter = ` AND o.created_at >= CURRENT_DATE - INTERVAL '${Number(days) || 7} days'`;
    }

    const query = `
      SELECT
        DATE(o.created_at) as date,
        ${lineRevenueSum} as revenue
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND mi.branch_id = $1
        ${dateFilter}
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `;

    return db.sequelize.query(query, {
      bind: params,
      type: Sequelize.QueryTypes.SELECT,
    });
  },

  /** [BÁO CÁO] Top món bán chạy theo quantity/revenue. Ctrl+F: getTopSellingItems report service */
  async getTopSellingItems(branchId = 1, limit = 10, startDate, endDate) {
    const params = [branchId];
    const dateFilter = inclusiveDateClause('o.created_at', params, startDate, endDate);
    params.push(limit);

    const query = `
      SELECT
        mi.item_id,
        mi.name,
        mi.category,
        mi.price,
        mi.sale_price,
        mi.image_url,
        SUM(oi.quantity) as total_sold,
        ${lineRevenueSum} as total_revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND mi.branch_id = $1
        ${dateFilter}
      GROUP BY mi.item_id, mi.name, mi.category, mi.price, mi.sale_price, mi.image_url
      ORDER BY total_sold DESC
      LIMIT $${params.length}
    `;

    return db.sequelize.query(query, {
      bind: params,
      type: Sequelize.QueryTypes.SELECT,
    });
  },

  /** [BÁO CÁO] Doanh thu gom theo category món. Ctrl+F: getRevenueByCategory report service */
  async getRevenueByCategory(branchId = 1, startDate, endDate) {
    const params = [branchId];
    const dateFilter = inclusiveDateClause('o.created_at', params, startDate, endDate);

    const query = `
      SELECT
        mi.category,
        ${lineRevenueSum} as revenue,
        SUM(oi.quantity) as total_sold
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND mi.branch_id = $1
        ${dateFilter}
      GROUP BY mi.category
      ORDER BY revenue DESC
    `;

    return db.sequelize.query(query, {
      bind: params,
      type: Sequelize.QueryTypes.SELECT,
    });
  },

  /** [BÁO CÁO] Số order theo giờ trong ngày để phân tích giờ cao điểm. Ctrl+F: getOrdersByHour report service */
  async getOrdersByHour(branchId = 1, startDate, endDate) {
    const params = [branchId];
    let dateFilter = inclusiveDateClause('o.created_at', params, startDate, endDate);
    if (!dateFilter) {
      dateFilter = ' AND DATE(o.created_at) = CURRENT_DATE';
    }

    const query = `
      SELECT
        EXTRACT(HOUR FROM o.created_at)::int as hour,
        COUNT(DISTINCT o.order_id) as order_count,
        ${lineRevenueSum} as revenue
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND mi.branch_id = $1
        ${dateFilter}
      GROUP BY EXTRACT(HOUR FROM o.created_at)
      ORDER BY hour ASC
    `;

    return db.sequelize.query(query, {
      bind: params,
      type: Sequelize.QueryTypes.SELECT,
    });
  },

  /** [BÁO CÁO] Top khách hàng theo tổng chi tiêu và số đơn. Ctrl+F: getTopCustomers report service */
  async getTopCustomers(branchId = 1, limit = 10, startDate, endDate) {
    const params = [branchId];
    const dateFilter = inclusiveDateClause('o.created_at', params, startDate, endDate);
    params.push(limit);

    const query = `
      SELECT
        u.user_id,
        u.full_name,
        u.phone,
        COUNT(DISTINCT o.order_id) as total_orders,
        ${lineRevenueSum} as total_spent
      FROM users u
      JOIN orders o ON u.user_id = o.user_id
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND o.branch_id = $1
        AND mi.branch_id = $1
        ${dateFilter}
      GROUP BY u.user_id, u.full_name, u.phone
      HAVING ${lineRevenueSum} > 0
      ORDER BY total_spent DESC
      LIMIT $${params.length}
    `;

    return db.sequelize.query(query, {
      bind: params,
      type: Sequelize.QueryTypes.SELECT,
    });
  },

  /** [BÁO CÁO] Thống kê bàn qua tableSummaryService. Ctrl+F: getTableStats report service */
  async getTableStats(branchId = 1) {
    const summary = await tableSummaryService.getTableSummary(branchId);
    const occupiedTables = summary.servingTables;

    return {
      totalTables: summary.totalTables,
      availableTables: summary.availableTables,
      occupiedTables,
      reservedTables: summary.reservedTables,
      cleaningTables: summary.cleaningTables,
      occupancyRate:
        summary.totalTables > 0
          ? ((occupiedTables / summary.totalTables) * 100).toFixed(2)
          : 0,
    };
  },

  /** [BÁO CÁO] Doanh thu theo tháng cho biểu đồ dài hạn. Ctrl+F: getMonthlyRevenue report service */
  async getMonthlyRevenue(branchId = 1, months = 6, startDate, endDate) {
    const params = [branchId];
    let dateFilter = inclusiveDateClause('o.created_at', params, startDate, endDate);
    if (!dateFilter) {
      dateFilter = ` AND o.created_at >= CURRENT_DATE - INTERVAL '${Number(months) || 6} months'`;
    }

    const query = `
      SELECT
        TO_CHAR(o.created_at, 'YYYY-MM') as month,
        ${lineRevenueSum} as revenue,
        COUNT(DISTINCT o.order_id) as order_count
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.status IN (${completedOrderStatusSqlIn()})
        AND mi.branch_id = $1
        ${dateFilter}
      GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
      ORDER BY month ASC
    `;

    return db.sequelize.query(query, {
      bind: params,
      type: Sequelize.QueryTypes.SELECT,
    });
  },
};

module.exports = reportService;
