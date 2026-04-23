const reportService = require('../../services/admin/report.service');
const reportExportService = require('../../services/admin/reportExport.service');
const { resolveBranchId } = require('../../utils/branchScope');

exports.getOverviewStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const stats = await reportService.getOverviewStats(branchId, startDate, endDate);
    res.json(stats);
  } catch (error) {
    console.error('Lỗi getOverviewStats:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê tổng quan', error: error.message });
  }
};

exports.getRevenueByDay = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const data = await reportService.getRevenueByDay(branchId, days);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getRevenueByDay:', error);
    res.status(500).json({ message: 'Lỗi lấy doanh thu theo ngày', error: error.message });
  }
};

exports.getTopSellingItems = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const data = await reportService.getTopSellingItems(branchId, limit);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getTopSellingItems:', error);
    res.status(500).json({ message: 'Lỗi lấy món bán chạy', error: error.message });
  }
};

exports.getRevenueByCategory = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const data = await reportService.getRevenueByCategory(branchId);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getRevenueByCategory:', error);
    res.status(500).json({ message: 'Lỗi lấy doanh thu theo danh mục', error: error.message });
  }
};

exports.getOrdersByHour = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const data = await reportService.getOrdersByHour(branchId);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getOrdersByHour:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê theo giờ', error: error.message });
  }
};

exports.getTopCustomers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const data = await reportService.getTopCustomers(branchId, limit);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getTopCustomers:', error);
    res.status(500).json({ message: 'Lỗi lấy khách hàng thân thiết', error: error.message });
  }
};

exports.getTableStats = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const data = await reportService.getTableStats(branchId);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getTableStats:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê bàn', error: error.message });
  }
};

exports.getMonthlyRevenue = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const data = await reportService.getMonthlyRevenue(branchId, months);
    res.json(data);
  } catch (error) {
    console.error('Lỗi getMonthlyRevenue:', error);
    res.status(500).json({ message: 'Lỗi lấy doanh thu theo tháng', error: error.message });
  }
};

/** GET /export?format=xlsx|pdf&branchId=&startDate=&endDate=&days=&months=&limit= */
exports.exportReport = async (req, res) => {
  try {
    const format = String(req.query.format || 'xlsx').toLowerCase();
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const days = parseInt(req.query.days, 10) || 7;
    const months = parseInt(req.query.months, 10) || 6;
    const limit = parseInt(req.query.limit, 10) || 10;

    const data = await reportExportService.gatherReportData({
      branchId,
      startDate,
      endDate,
      days,
      months,
      limit,
    });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (format === 'xlsx') {
      const buffer = await reportExportService.buildExcel(data);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="bao-cao-chi-nhanh-${branchId}-${stamp}.xlsx"`
      );
      return res.send(buffer);
    }
    if (format === 'pdf') {
      const buffer = await reportExportService.buildPdf(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="bao-cao-chi-nhanh-${branchId}-${stamp}.pdf"`
      );
      return res.send(buffer);
    }
    return res.status(400).json({ message: 'Tham số format phải là xlsx hoặc pdf' });
  } catch (error) {
    console.error('Lỗi exportReport:', error);
    res.status(500).json({ message: 'Không thể xuất báo cáo', error: error.message });
  }
};