// be/controllers/admin/dashboard.controller.js
const { dashboardService } = require("../../services/admin/dashboard.service.js");

const dashboardController = {
  // Lấy tổng quan dashboard
  async getOverview(req, res) {
    try {
      const overview = await dashboardService.getOverview();
      return res.status(200).json(overview);
    } catch (error) {
      console.error("Dashboard overview error:", error);
      return res.status(500).json({ message: "Lỗi khi lấy dữ liệu tổng quan" });
    }
  },
  
  // Có thể thêm các API endpoints khác ở đây như:
  // - Thống kê theo khoảng thời gian
  // - Thống kê món ăn bán chạy
  // - Doanh thu theo tuần/tháng
};

module.exports = dashboardController;