/**
 * MIDDLEWARE GIỚI HẠN TẦN SUẤT — chống spam đăng nhập, đăng ký, CAPTCHA, đặt bàn, gọi món QR.
 * Ctrl+F: rate limit, chống spam, loginLimiter, registerLimiter, tableQrOrderLimiter
 * Luồng demo: Phần 1 nêu CAPTCHA + giới hạn tần suất, Phần 2 đặt bàn, Phần 4 gọi món QR.
 */
const rateLimit = require('express-rate-limit');

/** [RATE LIMIT] Chuẩn hóa response JSON cho mọi limiter để frontend chỉ cần đọc message. Ctrl+F: jsonMessage */
const jsonMessage = (message) => ({ message });

/** [ĐĂNG NHẬP] Chặn dò mật khẩu/brute force: tối đa 10 lần/15 phút/IP. Ctrl+F: loginLimiter */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.'),
});

/** [ĐĂNG KÝ] Chống tạo hàng loạt tài khoản demo/rác: tối đa 5 lần/1 giờ/IP. Ctrl+F: registerLimiter */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Quá nhiều lần đăng ký từ địa chỉ này. Vui lòng thử lại sau 1 giờ.'),
});

/** [ĐĂNG KÝ] Chống spam API kiểm tra trùng SĐT khi người dùng gõ form. Ctrl+F: checkPhoneLimiter */
const checkPhoneLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Quá nhiều yêu cầu kiểm tra số điện thoại. Thử lại sau.'),
});

/** [CAPTCHA] Giới hạn số lần xin mã CAPTCHA để tránh spam tạo challenge. Ctrl+F: captchaChallengeLimiter */
const captchaChallengeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Quá nhiều yêu cầu CAPTCHA. Thử lại sau.'),
});

/** [ĐẶT BÀN] Giới hạn request tạo đặt bàn để tránh giữ bàn ảo hàng loạt. Ctrl+F: reservationCreateLimiter */
const reservationCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Quá nhiều yêu cầu đặt bàn. Vui lòng thử lại sau 1 giờ.'),
});

/**
 * [QR GỌI MÓN] Giới hạn gọi món theo IP + token bàn, tránh khách bấm gửi món liên tục.
 * Ctrl+F: tableQrOrderLimiter, gọi món QR, /t/{token}
 */
const tableQrOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip || "unknown"}:${req.params?.token || ""}`,
  message: jsonMessage('Quá nhiều lần gọi món. Vui lòng thử lại sau một phút.'),
});

module.exports = {
  loginLimiter,
  registerLimiter,
  checkPhoneLimiter,
  captchaChallengeLimiter,
  reservationCreateLimiter,
  tableQrOrderLimiter,
};
