/**
 * ROUTES ADMIN TABLE — API sơ đồ bàn, summary, CRUD bàn cho admin/phục vụ.
 * Ctrl+F: table routes, /admin/tables, sơ đồ bàn, table summary
 * Luồng demo: Phần 3 — /admin/tables xem trạng thái bàn và check-in.
 */
const express = require('express');
const router = express.Router();
const tableController = require('../../controllers/admin/table.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

// [SƠ ĐỒ BÀN] Danh sách bàn + order active + QR token + doanh thu tạm tính.
router.get('/', verifyToken, authorizeRole('admin', 'waiter'), tableController.getTables);
// [SƠ ĐỒ BÀN] Tổng số bàn theo trạng thái cho dashboard mini.
router.get('/summary', verifyToken, authorizeRole('admin', 'waiter'), tableController.getTableSummary);
// [SƠ ĐỒ BÀN] Hoạt động gần đây của bàn/order.
router.get('/activity', verifyToken, authorizeRole('admin', 'waiter'), tableController.getTableActivities);

// [QUẢN LÝ BÀN] Admin tạo bàn mới trong chi nhánh.
router.post(
  '/',
  verifyToken,
  authorizeRole('admin'),
  auditLog({ action: 'TABLE_CREATE', module: 'tables', description: 'Thêm bàn', entityType: 'table' }),
  tableController.createTable
);

// [QUẢN LÝ BÀN] Admin cập nhật số bàn/sức chứa/trạng thái.
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

// [QUẢN LÝ BÀN] Admin xóa bàn khi không còn ràng buộc nghiệp vụ.
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