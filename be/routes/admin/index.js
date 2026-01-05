// be/routes/admin/index.js
const express = require('express');
const router = express.Router();

// Import các routes
const menuRoutes = require('./menu.routes');
const dashboardRoutes = require('./dashboard.routes');
const tableRoutes = require('./table.routes')
const employeeRoutes = require('./employee.routes')
// Các routes khác

// Register routes
router.use('/menu', menuRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/table', tableRoutes);
router.use('/employees', employeeRoutes);
// Các routes khác

module.exports = router;