const express = require('express');
const router = express.Router();
const tableController = require('../../controllers/admin/table.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

router.get('/', verifyToken, authorizeRole('admin', 'waiter'), tableController.getTables);
router.get('/summary', verifyToken, authorizeRole('admin', 'waiter'), tableController.getTableSummary);
router.get('/activity', verifyToken, authorizeRole('admin', 'waiter'), tableController.getTableActivities);

router.post(
  '/',
  verifyToken,
  authorizeRole('admin'),
  auditLog({ action: 'TABLE_CREATE', module: 'tables', description: 'Thêm bàn', entityType: 'table' }),
  tableController.createTable
);

router.put(
  '/:id',
  verifyToken,
  authorizeRole('admin'),
  auditLog({
    action: 'TABLE_UPDATE',
    module: 'tables',
    description: (req) => `Cập nhật bàn #${req.params.id}`,
    entityType: 'table',
  }),
  tableController.updateTable
);

router.delete(
  '/:id',
  verifyToken,
  authorizeRole('admin'),
  auditLog({
    action: 'TABLE_DELETE',
    module: 'tables',
    description: (req) => `Xóa bàn #${req.params.id}`,
    entityType: 'table',
  }),
  tableController.deleteTable
);

module.exports = router;