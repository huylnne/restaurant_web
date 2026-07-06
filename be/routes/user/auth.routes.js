/**
 * ROUTES AUTH — API đăng ký/đăng nhập/CAPTCHA/kiểm tra SĐT cho khách hàng.
 * Ctrl+F: auth routes, /register, /login, /captcha-challenge, /check-phone
 * Luồng demo: Phần 1 — tạo tài khoản khách mới và đăng nhập.
 */
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

// [CAPTCHA] FE hỏi hệ thống đang dùng CAPTCHA kiểu nào để render form đăng ký.
router.get('/captcha-config', authController.getCaptchaConfig);
// [CAPTCHA] Tạo challenge mới, có rate limit để chống spam.
router.get('/captcha-challenge', captchaChallengeLimiter, authController.getCaptchaChallenge);

// [ĐĂNG KÝ] Validate input + verify CAPTCHA + ghi audit trước khi tạo user role=user.
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

// [ĐĂNG NHẬP] Validate input + rate limit + ghi audit, trả JWT cho user/admin/nhân viên.
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

// [ĐĂNG KÝ] Kiểm tra SĐT đã được đăng ký chưa (realtime check ở form đăng ký).
router.get('/check-phone', checkPhoneLimiter, authController.checkPhone);

module.exports = router;