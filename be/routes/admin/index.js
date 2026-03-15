const express = require('express');
const router = express.Router();

const dashboardRoutes = require('./dashboard.routes');
const employeeRoutes = require('./employee.routes');
const menuRoutes = require('./menu.routes');
const reportRoutes = require('./report.routes');
const tableRoutes = require('./table.routes');

// thêm 2 route mới
const kitchenRoutes = require('./kitchen.routes');
const waiterRoutes = require('./waiter.routes');

router.use('/dashboard', dashboardRoutes);
router.use('/employees', employeeRoutes);
router.use('/menu', menuRoutes);
router.use('/reports', reportRoutes);
router.use('/tables', tableRoutes);

// mount waiter & kitchen under /admin
router.use('/kitchen', kitchenRoutes);
router.use('/waiter', waiterRoutes);

module.exports = router;