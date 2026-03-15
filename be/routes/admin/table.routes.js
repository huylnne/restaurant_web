const express = require('express');
const router = express.Router();
const tableController = require('../../controllers/admin/table.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');

// GET: admin, waiter (kitchen chỉ dùng API bếp)
router.get('/', verifyToken, authorizeRole('admin', 'waiter'), tableController.getTables);
router.get('/summary', verifyToken, authorizeRole('admin', 'waiter'), tableController.getTableSummary);
router.get('/activity', verifyToken, authorizeRole('admin', 'waiter'), tableController.getTableActivities);

// POST/PUT/DELETE: chỉ admin
router.post('/', verifyToken, authorizeRole('admin'), tableController.createTable);
router.put('/:id', verifyToken, authorizeRole('admin'), tableController.updateTable);
router.delete('/:id', verifyToken, authorizeRole('admin'), tableController.deleteTable);

module.exports = router;