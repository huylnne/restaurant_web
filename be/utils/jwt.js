const jwt = require('jsonwebtoken');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).trim().length < 16) {
    throw new Error(
      'JWT_SECRET chưa cấu hình hoặc quá ngắn (tối thiểu 16 ký tự). Thêm vào file .env.'
    );
  }
  return secret;
}

function assertJwtSecretConfigured() {
  getJwtSecret();
}

function signAccessToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  JWT_EXPIRES_IN,
  assertJwtSecretConfigured,
  signAccessToken,
  verifyAccessToken,
};
