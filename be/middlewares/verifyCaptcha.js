const { verifyRegistrationCaptcha } = require('../services/captcha.service');

const verifyRegisterCaptcha = async (req, res, next) => {
  try {
    const result = await verifyRegistrationCaptcha(req.body, req.ip);
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }
    next();
  } catch (err) {
    console.error('verifyRegisterCaptcha:', err);
    res.status(500).json({ message: 'Không thể xác minh CAPTCHA' });
  }
};

module.exports = { verifyRegisterCaptcha };
