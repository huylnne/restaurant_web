/**
 * ROUTES USER — API hồ sơ khách, dashboard/lịch sử, bàn hiện tại, bill, đánh giá.
 * Ctrl+F: user routes, /me/current-table, /reservations, /reviews
 * Luồng demo: Phần 1 profile, Phần 2 dashboard, Phần 4 bàn của tôi/đánh giá.
 */
const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user/user.controller');
const { verifyToken } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

// [HỒ SƠ] Lấy thông tin khách đang đăng nhập.
router.get('/me', verifyToken, userController.getProfile);
// [HỒ SƠ] Cập nhật tên/SĐT/avatar.
router.put(
  '/profile',
  verifyToken,
  auditLog({
    action: 'USER_PROFILE_UPDATE',
    module: 'users',
    description: 'Cập nhật hồ sơ cá nhân',
    entityType: 'user',
    entityId: (req) => req.userId,
  }),
  userController.updateProfile
);
// [HỒ SƠ] Đổi mật khẩu, skipBody để không lưu password vào audit.
router.post(
  '/change-password',
  verifyToken,
  auditLog({
    action: 'USER_PASSWORD_CHANGE',
    module: 'users',
    description: 'Đổi mật khẩu',
    entityType: 'user',
    entityId: (req) => req.userId,
    skipBody: true,
  }),
  userController.changePassword
);
// [DASHBOARD] Chi tiết bill của một lượt đặt bàn.
router.get('/reservations/:orderId/bill', verifyToken, userController.getReservationBill);
// [DASHBOARD] Lịch sử đặt bàn + món + thanh toán.
router.get('/reservations', verifyToken, userController.getReservationsWithOrders);
// [BÀN CỦA TÔI] Phiên đang phục vụ của khách.
router.get('/me/current-table', verifyToken, userController.getCurrentTableSession);
// [BÀN CỦA TÔI] Bill tạm tính hiện tại.
router.get('/me/current-bill', verifyToken, userController.getCurrentBill);
// [ĐÁNH GIÁ] Kiểm tra có order vừa ăn xong cần review không.
router.get('/me/pending-review', verifyToken, userController.getPendingReview);
// [ĐÁNH GIÁ] Gửi review từ dashboard.
router.post(
  '/reviews',
  verifyToken,
  auditLog({
    action: 'REVIEW_CREATE',
    module: 'reviews',
    description: 'Khách gửi đánh giá',
    entityType: 'review',
  }),
  userController.createReview
);

module.exports = router;