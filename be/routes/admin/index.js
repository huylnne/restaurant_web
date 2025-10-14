// be/routes/admin/index.js
const express = require('express');
const router = express.Router();

// Import các routes
const menuRoutes = require('./menu.routes');
const dashboardRoutes = require('./dashboard.routes');
// Các routes khác

// Register routes
router.use('/menu', menuRoutes);
router.use('/dashboard', dashboardRoutes);
// Các routes khác

module.exports = router;