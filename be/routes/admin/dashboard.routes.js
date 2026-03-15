const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboard.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');

// Admin, waiter (kitchen chỉ dùng tab Bếp, không gọi dashboard)
router.use(verifyToken, authorizeRole('admin', 'waiter'));

router.get('/summary', dashboardController.getSummary);
router.get('/weekly-revenue', dashboardController.getWeeklyRevenue);
router.get('/top-dishes', dashboardController.getTopDishes);
router.get('/table-status', dashboardController.getTableStatus);
router.get('/peak-hours', dashboardController.getPeakHours);

module.exports = router;