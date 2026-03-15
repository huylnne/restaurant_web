const reportService = require('../../services/admin/report.service');

exports.getOverviewStats = async (req, res) => {
  try {
    const { branchId = 1, startDate, endDate } = req.query;
    const stats = await reportService.getOverviewStats(branchId, startDate, endDate);
    res.json(stats);
  } catch (error) {
    console.error('Lỗi getOverviewStats:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê tổng quan', error: error.message });
  }
};

exports.getRevenueByDay = async (req, res) => {
  try {
    const { branchId = 1, days = 7 } = req.query;
    const data = await reportService.getRevenueByDay(branchId, days);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getRevenueByDay:', error);
    res.status(500).json({ message: 'Lỗi lấy doanh thu theo ngày', error: error.message });
  }
};

exports.getTopSellingItems = async (req, res) => {
  try {
    const { branchId = 1, limit = 10 } = req.query;
    const data = await reportService.getTopSellingItems(branchId, limit);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getTopSellingItems:', error);
    res.status(500).json({ message: 'Lỗi lấy món bán chạy', error: error.message });
  }
};

exports.getRevenueByCategory = async (req, res) => {
  try {
    const { branchId = 1 } = req.query;
    const data = await reportService.getRevenueByCategory(branchId);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getRevenueByCategory:', error);
    res.status(500).json({ message: 'Lỗi lấy doanh thu theo danh mục', error: error.message });
  }
};

exports.getOrdersByHour = async (req, res) => {
  try {
    const { branchId = 1 } = req.query;
    const data = await reportService.getOrdersByHour(branchId);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getOrdersByHour:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê theo giờ', error: error.message });
  }
};

exports.getTopCustomers = async (req, res) => {
  try {
    const { branchId = 1, limit = 10 } = req.query;
    const data = await reportService.getTopCustomers(branchId, limit);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getTopCustomers:', error);
    res.status(500).json({ message: 'Lỗi lấy khách hàng thân thiết', error: error.message });
  }
};

exports.getTableStats = async (req, res) => {
  try {
    const { branchId = 1 } = req.query;
    const data = await reportService.getTableStats(branchId);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getTableStats:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê bàn', error: error.message });
  }
};

exports.getMonthlyRevenue = async (req, res) => {
  try {
    const { branchId = 1, months = 6 } = req.query;
    const data = await reportService.getMonthlyRevenue(branchId, months);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getMonthlyRevenue:', error);
    res.status(500).json({ message: 'Lỗi lấy doanh thu theo tháng', error: error.message });
  }
};