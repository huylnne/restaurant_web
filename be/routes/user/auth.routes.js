const express = require('express');
const router = express.Router();
const authController = require('../../controllers/user/auth.controller');
const { auditLog } = require('../../middlewares/operationLog');
const {
  loginLimiter,
  registerLimiter,
  checkPhoneLimiter,
  captchaChallengeLimiter,
} = require('../../middlewares/rateLimit');
const {
  validateRegisterBody,
  validateLoginBody,
} = require('../../middlewares/validateAuthInput');
const { verifyRegisterCaptcha } = require('../../middlewares/verifyCaptcha');

router.get('/captcha-config', authController.getCaptchaConfig);
router.get('/captcha-challenge', captchaChallengeLimiter, authController.getCaptchaChallenge);

router.post(
  '/register',
  registerLimiter,
  validateRegisterBody,
  verifyRegisterCaptcha,
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
  loginLimiter,
  validateLoginBody,
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
router.get('/check-phone', checkPhoneLimiter, authController.checkPhone);

module.exports = router;