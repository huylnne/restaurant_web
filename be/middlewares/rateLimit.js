const rateLimit = require('express-rate-limit');

const jsonMessage = (message) => ({ message });

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.'),
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Quá nhiều lần đăng ký từ địa chỉ này. Vui lòng thử lại sau 1 giờ.'),
});

const checkPhoneLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Quá nhiều yêu cầu kiểm tra số điện thoại. Thử lại sau.'),
});

const captchaChallengeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Quá nhiều yêu cầu CAPTCHA. Thử lại sau.'),
});

const reservationCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Quá nhiều yêu cầu đặt bàn. Vui lòng thử lại sau 1 giờ.'),
});

module.exports = {
  loginLimiter,
  registerLimiter,
  checkPhoneLimiter,
  captchaChallengeLimiter,
  reservationCreateLimiter,
};
