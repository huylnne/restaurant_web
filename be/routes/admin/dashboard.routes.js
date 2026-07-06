/**
 * ROUTES ADMIN DASHBOARD — API số liệu tổng quan vận hành trong trang /admin.
 * Ctrl+F: dashboard routes, summary, weekly-revenue, top-dishes, peak-hours
 * Luồng demo: Phần 5 — Bước 5.1 Admin xem dashboard toàn chuỗi/chi nhánh.
 */
const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboard.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');

// [PHÂN QUYỀN] Admin/waiter xem dashboard; kitchen chỉ dùng màn Bếp.
router.use(verifyToken, authorizeRole('admin', 'waiter'));

// [DASHBOARD] Tổng quan đơn/khách/món/doanh thu (lọc theo role).
router.get('/summary', dashboardController.getSummary);
// [DASHBOARD] Doanh thu 7 ngày gần nhất.
router.get('/weekly-revenue', dashboardController.getWeeklyRevenue);
// [DASHBOARD] Món bán chạy.
router.get('/top-dishes', dashboardController.getTopDishes);
// [DASHBOARD] Số bàn theo trạng thái.
router.get('/table-status', dashboardController.getTableStatus);
// [DASHBOARD] Khung giờ cao điểm.
router.get('/peak-hours', dashboardController.getPeakHours);

module.exports = router;