const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user/user.controller');
const { verifyToken } = require('../../middlewares/auth');
const { auditLog } = require('../../middlewares/operationLog');

router.get('/me', verifyToken, userController.getProfile);
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
router.get('/reservations/:orderId/bill', verifyToken, userController.getReservationBill);
router.get('/reservations', verifyToken, userController.getReservationsWithOrders);
router.get('/me/current-table', verifyToken, userController.getCurrentTableSession);
router.get('/me/current-bill', verifyToken, userController.getCurrentBill);
router.get('/me/pending-review', verifyToken, userController.getPendingReview);
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