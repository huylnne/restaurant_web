// be/routes/admin/dashboard.routes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../../controllers/admin/dashboard.controller");
const { verifyAdmin } = require("../../middlewares/auth");

// Lấy tổng quan dashboard
router.get("/overview", verifyAdmin, dashboardController.getOverview);

// Có thể thêm các routes khác

module.exports = router;