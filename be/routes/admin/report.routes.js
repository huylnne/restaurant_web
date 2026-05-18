const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/admin/report.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');

// Manager chỉ được xem đúng branch của mình (không được override branchId qua query)
const enforceReportBranchScope = (req, res, next) => {
  const role = req.userRole || req.user?.role;
  if (role !== 'manager') return next();

  const userBranchId = parseInt(req.user?.branch_id, 10);
  if (!Number.isFinite(userBranchId)) {
    return res
      .status(403)
      .json({ message: 'Tài khoản manager chưa được gán chi nhánh' });
  }

  const requestedRaw = req.query.branchId;
  if (requestedRaw !== undefined) {
    const requestedBranchId = parseInt(requestedRaw, 10);
    if (Number.isFinite(requestedBranchId) && requestedBranchId !== userBranchId) {
      return res
        .status(403)
        .json({ message: 'Manager chỉ được xem báo cáo của chi nhánh được phân công' });
    }
  }

  req.query.branchId = String(userBranchId);
  return next();
};

// Báo cáo tài chính: admin + manager
router.use(verifyToken, authorizeRole('admin', 'manager'), enforceReportBranchScope);

// Xuất Excel / PDF
router.get('/export', reportController.exportReport);

// Thống kê tổng quan
router.get('/overview', reportController.getOverviewStats);

// Doanh thu theo ngày
router.get('/revenue-by-day', reportController.getRevenueByDay);

// Món bán chạy nhất
router.get('/top-selling', reportController.getTopSellingItems);

// Doanh thu theo danh mục
router.get('/revenue-by-category', reportController.getRevenueByCategory);

// Thống kê theo giờ
router.get('/orders-by-hour', reportController.getOrdersByHour);

// Khách hàng thân thiết
router.get('/top-customers', reportController.getTopCustomers);

// Thống kê bàn
router.get('/table-stats', reportController.getTableStats);

// Doanh thu theo tháng
router.get('/monthly-revenue', reportController.getMonthlyRevenue);

module.exports = router;