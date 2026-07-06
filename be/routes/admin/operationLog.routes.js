/**
 * ROUTES OPERATION LOG — API xem nhật ký thao tác hệ thống.
 * Ctrl+F: operation log routes, /admin/operation-logs, audit
 * Luồng demo: Phần 5 — Bước 5.8 xem đăng ký/đặt bàn/check-in/thanh toán.
 */
const express = require('express');
const router = express.Router();
const operationLogController = require('../../controllers/admin/operationLog.controller');
const { verifyToken, authorizeRole } = require('../../middlewares/auth');

// [PHÂN QUYỀN] Admin/manager được xem log; filter chi nhánh xử lý trong service/controller.
router.use(verifyToken, authorizeRole('admin', 'manager'));

// [NHẬT KÝ] Danh sách log có filter action/module/time/user.
router.get('/', operationLogController.list);

module.exports = router;
