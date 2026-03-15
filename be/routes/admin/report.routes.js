const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/admin/report.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth');

// Báo cáo tài chính: chỉ admin
router.use(verifyToken, isAdmin);

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