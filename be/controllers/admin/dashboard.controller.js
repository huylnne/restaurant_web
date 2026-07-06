/**
 * CONTROLLER ADMIN DASHBOARD — HTTP layer cho số liệu tổng quan trang /admin.
 * Ctrl+F: dashboard controller, getSummary, getWeeklyRevenue, getTopDishes
 * Luồng demo: Phần 5 — Bước 5.1 Admin xem dashboard.
 */
const dashboardService = require('../../services/admin/dashboard.service');
const { resolveBranchId } = require('../../utils/branchScope');
const {
  filterSummaryForRole,
  filterTopDishesForRole,
  filterWeeklyRevenueForRole,
} = require('../../utils/roleResponse');

const dashboardController = {
  /** [DASHBOARD] Tổng quan đơn/khách/món/doanh thu, filter dữ liệu tài chính theo role. Ctrl+F: getSummary */
  async getSummary(req, res) {
    try {
      const branchId = resolveBranchId(req, req.query.branchId, 1);
      const data = await dashboardService.getSummary(branchId);
      const role = req.userRole || req.user?.role;
      res.json(filterSummaryForRole(role, data));
    } catch (error) {
      console.error('❌ Lỗi getSummary:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  /** [DASHBOARD] Doanh thu 7 ngày gần nhất, waiter bị filter rỗng. Ctrl+F: getWeeklyRevenue */
  async getWeeklyRevenue(req, res) {
    try {
      const branchId = resolveBranchId(req, req.query.branchId, 1);
      const data = await dashboardService.getWeeklyRevenue(branchId);
      const role = req.userRole || req.user?.role;
      res.json(filterWeeklyRevenueForRole(role, data));
    } catch (error) {
      console.error('❌ Lỗi getWeeklyRevenue:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  /** [DASHBOARD] Món bán chạy/top dishes theo chi nhánh. Ctrl+F: getTopDishes */
  async getTopDishes(req, res) {
    try {
      const branchId = resolveBranchId(req, req.query.branchId, 1);
      const data = await dashboardService.getTopDishes(branchId);
      const role = req.userRole || req.user?.role;
      res.json(filterTopDishesForRole(role, data));
    } catch (error) {
      console.error('❌ Lỗi getTopDishes:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  /** [DASHBOARD] Số bàn theo trạng thái để vẽ card/table-status. Ctrl+F: getTableStatus */
  async getTableStatus(req, res) {
    try {
      const branchId = resolveBranchId(req, req.query.branchId, 1);
      const data = await dashboardService.getTableStatus(branchId);
      res.json({
        ...data,
        availableTables: data.empty,
        occupiedTables: data.occupied ?? data.serving,
        reservedTables: data.reserved,
        cleaningTables: data.cleaning ?? 0,
      });
    } catch (error) {
      console.error('❌ Lỗi getTableStatus:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  /** [DASHBOARD] Khung giờ cao điểm theo số order. Ctrl+F: getPeakHours */
  async getPeakHours(req, res) {
    try {
      const branchId = resolveBranchId(req, req.query.branchId, 1);
      const data = await dashboardService.getPeakHours(branchId);
      res.json(data);
    } catch (error) {
      console.error('❌ Lỗi getPeakHours:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },
};

module.exports = dashboardController;