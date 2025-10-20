const dashboardService = require('../../services/admin/dashboard.service');

const dashboardController = {
  // ✅ 1. Tổng quan
  async getSummary(req, res) {
    try {
      const data = await dashboardService.getSummary();
      res.json(data);
    } catch (error) {
      console.error('❌ Lỗi getSummary:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // 📊 2. Doanh thu theo tuần
  async getWeeklyRevenue(req, res) {
    try {
      const data = await dashboardService.getWeeklyRevenue();
      res.json(data);
    } catch (error) {
      console.error('❌ Lỗi getWeeklyRevenue:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // 🍽 3. Top món ăn bán chạy
  async getTopDishes(req, res) {
    try {
      const data = await dashboardService.getTopDishes();
      res.json(data);
    } catch (error) {
      console.error('❌ Lỗi getTopDishes:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // 🪑 4. Tình trạng bàn ăn
  async getTableStatus(req, res) {
    try {
      const data = await dashboardService.getTableStatus();
      res.json(data);
    } catch (error) {
      console.error('❌ Lỗi getTableStatus:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  // ⏰ 5. Thời gian phục vụ cao điểm
  async getPeakHours(req, res) {
    try {
      const data = await dashboardService.getPeakHours();
      res.json(data);
    } catch (error) {
      console.error('❌ Lỗi getPeakHours:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },
};

module.exports = dashboardController;