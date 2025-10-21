const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboard.controller');
const { verifyAdmin } = require('../../middlewares/auth');  
//  Áp dụng middleware cho tất cả routes
router.use(verifyAdmin);

// Routes
router.get('/summary', dashboardController.getSummary);
router.get('/weekly-revenue', dashboardController.getWeeklyRevenue);
router.get('/top-dishes', dashboardController.getTopDishes);
router.get('/table-status', dashboardController.getTableStatus);
router.get('/peak-hours', dashboardController.getPeakHours);

module.exports = router;