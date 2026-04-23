const dashboardService = require('../../services/admin/dashboard.service');
const { resolveBranchId } = require('../../utils/branchScope');
const {
  filterSummaryForRole,
  filterTopDishesForRole,
  filterWeeklyRevenueForRole,
} = require('../../utils/roleResponse');

const dashboardController = {
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

  async getTableStatus(req, res) {
    try {
      const branchId = resolveBranchId(req, req.query.branchId, 1);
      const data = await dashboardService.getTableStatus(branchId);
      res.json({
        ...data,
        availableTables: data.empty,
        occupiedTables: data.occupied ?? data.serving,
        reservedTables: data.reserved,
      });
    } catch (error) {
      console.error('❌ Lỗi getTableStatus:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

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