/**
 * MIDDLEWARE VERIFY CAPTCHA — dùng chung cho đăng ký và đặt bàn để chống spam.
 * Ctrl+F: verifyCaptcha middleware, verifyRegisterCaptcha, verifyReservationCaptcha
 * Luồng demo: Phần 1 đăng ký có CAPTCHA, Phần 2 đặt bàn có thể dùng CAPTCHA.
 */
const { verifyRegistrationCaptcha } = require('../services/captcha.service');

/** [CAPTCHA] Verify payload captcha_id/captcha_answer rồi cho request đi tiếp. Ctrl+F: verifyCaptchaPayload */
async function verifyCaptchaPayload(req, res, next, logLabel) {
  try {
    const result = await verifyRegistrationCaptcha(req.body, req.ip);
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }
    next();
  } catch (err) {
    console.error(`${logLabel}:`, err);
    res.status(500).json({ message: 'Không thể xác minh CAPTCHA' });
  }
}

/** [ĐĂNG KÝ] Middleware CAPTCHA cho POST /api/auth/register. Ctrl+F: verifyRegisterCaptcha */
const verifyRegisterCaptcha = (req, res, next) =>
  verifyCaptchaPayload(req, res, next, 'verifyRegisterCaptcha');

/** [ĐẶT BÀN] Middleware CAPTCHA cho POST /api/reservations nếu bật ở route. Ctrl+F: verifyReservationCaptcha */
const verifyReservationCaptcha = (req, res, next) =>
  verifyCaptchaPayload(req, res, next, 'verifyReservationCaptcha');

module.exports = { verifyRegisterCaptcha, verifyReservationCaptcha };
