const { verifyRegistrationCaptcha } = require('../services/captcha.service');

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

const verifyRegisterCaptcha = (req, res, next) =>
  verifyCaptchaPayload(req, res, next, 'verifyRegisterCaptcha');

const verifyReservationCaptcha = (req, res, next) =>
  verifyCaptchaPayload(req, res, next, 'verifyReservationCaptcha');

module.exports = { verifyRegisterCaptcha, verifyReservationCaptcha };
