/**
 * MIDDLEWARE VALIDATE ĐĂNG KÝ / ĐĂNG NHẬP — lọc input trước khi vào auth.controller.
 * Ctrl+F: validate auth, validateRegisterBody, validateLoginBody, PHONE_REGEX
 * Luồng demo: Phần 1 — form đăng ký username/password/SĐT/CAPTCHA.
 */
const PHONE_REGEX = /^0\d{9}$/; // SĐT VN: bắt đầu bằng 0 + đúng 9 chữ số (tổng 10 số)
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/; // chỉ chữ thường/số/gạch dưới, dài 3–30 ký tự
const PASSWORD_MIN_LEN = 8;
const PASSWORD_MAX_LEN = 32;
const FULL_NAME_MAX_LEN = 50;

/** [BẢO MẬT INPUT] Từ chối field lạ để tránh client gửi thừa role/is_active/branch_id. Ctrl+F: rejectUnexpectedKeys */
function rejectUnexpectedKeys(body, allowedKeys) {
  const extra = Object.keys(body || {}).filter((k) => !allowedKeys.includes(k));
  if (extra.length > 0) {
    return `Trường không hợp lệ: ${extra.join(', ')}`;
  }
  return null;
}

/** [CAPTCHA] Các field CAPTCHA bắt buộc đi cùng request đăng ký. Ctrl+F: REGISTER_CAPTCHA_KEYS */
const REGISTER_CAPTCHA_KEYS = ['captcha_id', 'captcha_answer'];

/**
 * [ĐĂNG KÝ] Validate body: username chữ thường/số/gạch dưới, password 8-32, SĐT 10 số bắt đầu 0.
 * Sau validate sẽ chuẩn hóa req.body.username/full_name/phone để controller dùng trực tiếp.
 * Ctrl+F: validateRegisterBody, đăng ký validate
 */
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

  // Ghi lại giá trị đã chuẩn hóa (trim/lowercase) vào req.body để controller dùng trực tiếp, không phải chuẩn hóa lại.
  req.body.username = username;
  req.body.password = password;
  req.body.full_name = full_name;
  req.body.phone = phone;
  next();
};

/**
 * [ĐĂNG NHẬP] Validate body login, chuẩn hóa username về lowercase để login không phân biệt hoa thường.
 * Ctrl+F: validateLoginBody, login validate
 */
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
