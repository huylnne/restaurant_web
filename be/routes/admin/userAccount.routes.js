/**
 * ROUTES ADMIN USER ACCOUNT — API quản lý tài khoản khách hàng.
 * Ctrl+F: user account routes, /admin/customer-accounts, khóa tài khoản
 * Luồng demo: Phần 5 — Bước 5.2 tìm demo_khach01.
 */
const express = require('express');
const router = express.Router();
const userAccountController = require('../../controllers/admin/userAccount.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

// [PHÂN QUYỀN] Chỉ admin được xem/khóa/mở tài khoản khách.
router.use(verifyToken, isAdmin);

// [TÀI KHOẢN KHÁCH] Summary số lượng active/locked/inactive.
router.get('/stats/summary', userAccountController.getSummary);
// [TÀI KHOẢN KHÁCH] Danh sách/search khách hàng.
router.get('/', userAccountController.listUsers);
// [TÀI KHOẢN KHÁCH] Chi tiết một khách.
router.get('/:id', userAccountController.getUserById);

// [TÀI KHOẢN KHÁCH] Khóa/mở/vô hiệu hóa tài khoản khách.
router.patch(
  '/:id/account-status',
  auditLog({
    action: 'USER_ACCOUNT_STATUS',
    module: 'users',
    description: (req) => `Đổi trạng thái tài khoản #${req.params.id}`,
    entityType: 'user',
  }),
  userAccountController.updateAccountStatus
);

module.exports = router;
