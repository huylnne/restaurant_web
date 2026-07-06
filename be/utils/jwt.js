/**
 * UTIL JWT — ký/verify access token cho user/admin/waiter/kitchen.
 * Ctrl+F: jwt util, signAccessToken, verifyAccessToken, JWT_SECRET
 * Dùng bởi: auth.controller login/register, middlewares/auth.js, QR access.
 */
const jwt = require('jsonwebtoken');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

/** [BẢO MẬT] Lấy JWT_SECRET từ env và bắt buộc đủ dài để tránh secret yếu khi demo/deploy. Ctrl+F: getJwtSecret */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).trim().length < 16) {
    throw new Error(
      'JWT_SECRET chưa cấu hình hoặc quá ngắn (tối thiểu 16 ký tự). Thêm vào file .env.'
    );
  }
  return secret;
}

/** [KHỞI ĐỘNG SERVER] Kiểm tra JWT_SECRET sớm khi app start. Ctrl+F: assertJwtSecretConfigured */
function assertJwtSecretConfigured() {
  getJwtSecret();
}

/** [ĐĂNG NHẬP] Ký access token chứa user_id/username/role/branch_id. Ctrl+F: signAccessToken */
function signAccessToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/** [AUTH] Verify token từ Authorization Bearer trước khi vào route bảo vệ. Ctrl+F: verifyAccessToken */
function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  JWT_EXPIRES_IN,
  assertJwtSecretConfigured,
  signAccessToken,
  verifyAccessToken,
};
