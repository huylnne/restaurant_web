const PHONE_REGEX = /^0\d{9}$/;
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
const PASSWORD_MIN_LEN = 8;
const PASSWORD_MAX_LEN = 32;
const FULL_NAME_MAX_LEN = 50;

function rejectUnexpectedKeys(body, allowedKeys) {
  const extra = Object.keys(body || {}).filter((k) => !allowedKeys.includes(k));
  if (extra.length > 0) {
    return `Trường không hợp lệ: ${extra.join(', ')}`;
  }
  return null;
}

const REGISTER_CAPTCHA_KEYS = ['captcha_id', 'captcha_answer'];

const validateRegisterBody = (req, res, next) => {
  const allowed = ['username', 'password', 'full_name', 'phone', ...REGISTER_CAPTCHA_KEYS];
  const extraErr = rejectUnexpectedKeys(req.body, allowed);
  if (extraErr) return res.status(400).json({ message: extraErr });

  const username = String(req.body.username || '').trim().toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const full_name = String(req.body.full_name || '').trim();
  const phone = String(req.body.phone || '').trim();

  if (!username) {
    return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập' });
  }
  if (!USERNAME_REGEX.test(username)) {
    return res.status(400).json({
      message: 'Tên đăng nhập chỉ gồm chữ thường, số, gạch dưới (3–30 ký tự)',
    });
  }
  if (password.length < PASSWORD_MIN_LEN || password.length > PASSWORD_MAX_LEN) {
    return res.status(400).json({
      message: `Mật khẩu phải có độ dài từ ${PASSWORD_MIN_LEN} đến ${PASSWORD_MAX_LEN} ký tự`,
    });
  }
  if (!full_name || full_name.length > FULL_NAME_MAX_LEN) {
    return res.status(400).json({
      message: full_name
        ? `Họ tên tối đa ${FULL_NAME_MAX_LEN} ký tự`
        : 'Vui lòng nhập họ tên',
    });
  }
  if (!PHONE_REGEX.test(phone)) {
    return res.status(400).json({
      message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0',
    });
  }

  req.body.username = username;
  req.body.password = password;
  req.body.full_name = full_name;
  req.body.phone = phone;
  next();
};

const validateLoginBody = (req, res, next) => {
  const allowed = ['username', 'password'];
  const extraErr = rejectUnexpectedKeys(req.body, allowed);
  if (extraErr) return res.status(400).json({ message: extraErr });

  const username = String(req.body.username || '').trim().toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!username || !USERNAME_REGEX.test(username)) {
    return res.status(400).json({ message: 'Tên đăng nhập không hợp lệ' });
  }
  if (!password || password.length > PASSWORD_MAX_LEN) {
    return res.status(400).json({ message: 'Mật khẩu không hợp lệ' });
  }

  req.body.username = username;
  req.body.password = password;
  next();
};

module.exports = {
  validateRegisterBody,
  validateLoginBody,
  PHONE_REGEX,
};
