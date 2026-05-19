const express = require('express');
const router = express.Router();
const authController = require('../../controllers/user/auth.controller');
const { auditLog } = require('../../middlewares/operationLog');

router.post(
  '/register',
  auditLog({
    action: 'AUTH_REGISTER',
    module: 'auth',
    description: 'Đăng ký tài khoản khách',
    entityType: 'user',
    skipBody: true,
  }),
  authController.register
);

router.post(
  '/login',
  auditLog({
    action: 'AUTH_LOGIN',
    module: 'auth',
    description: 'Đăng nhập',
    entityType: 'user',
    skipBody: true,
  }),
  authController.login
);

//  Kiểm tra SĐT đã được đăng ký chưa (dùng cho realtime check ở form đăng ký)
router.get('/check-phone', authController.checkPhone);

module.exports = router;