/**
 * ROUTES ADMIN REPORT — API báo cáo doanh thu, món bán chạy, khách hàng, xuất Excel/PDF.
 * Ctrl+F: report routes, /reports, export, revenue-by-day, top-selling
 * Luồng demo: Phần 5 — Bước 5.6 Admin xem báo cáo & thống kê.
 */
const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/admin/report.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

// [PHÂN QUYỀN CHI NHÁNH] Manager chỉ được xem đúng branch của mình (không override branchId qua query).
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

// [BÁO CÁO] Báo cáo tài chính: admin + manager, kèm scope chi nhánh.
router.use(verifyToken, authorizeRole('admin', 'manager'), enforceReportBranchScope);

// [BÁO CÁO] Xuất Excel/PDF theo filter ngày/chi nhánh.
router.get(
  '/export',
  auditLog({
    action: 'REPORT_EXPORT',
    module: 'reports',
    description: (req) =>
      `Xuất báo cáo ${String(req.query.format || 'xlsx').toUpperCase()}`,
    metadata: (req) => ({
      format: req.query.format || 'xlsx',
      branchId: req.query.branchId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    }),
  }),
  reportController.exportReport
);

// [BÁO CÁO] Thống kê tổng quan doanh thu/đơn/khách.
router.get('/overview', reportController.getOverviewStats);

// [BÁO CÁO] Doanh thu theo ngày.
router.get('/revenue-by-day', reportController.getRevenueByDay);

// [BÁO CÁO] Món bán chạy nhất.
router.get('/top-selling', reportController.getTopSellingItems);

// [BÁO CÁO] Doanh thu theo danh mục món.
router.get('/revenue-by-category', reportController.getRevenueByCategory);

// [BÁO CÁO] Thống kê số đơn theo giờ.
router.get('/orders-by-hour', reportController.getOrdersByHour);

// [BÁO CÁO] Khách hàng thân thiết/top customers.
router.get('/top-customers', reportController.getTopCustomers);

// [BÁO CÁO] Hiệu suất/số liệu theo bàn.
router.get('/table-stats', reportController.getTableStats);

// [BÁO CÁO] Doanh thu theo tháng.
router.get('/monthly-revenue', reportController.getMonthlyRevenue);

module.exports = router;