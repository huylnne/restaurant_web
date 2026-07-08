/**
 * SERVICE CAPTCHA — sinh/verify CAPTCHA nội bộ cho form đăng ký/đặt bàn.
 * Ctrl+F: captcha service, createCodeChallenge, verifyRegistrationCaptcha, CAPTCHA
 * Luồng demo: Phần 1 — đăng ký khách có CAPTCHA chống spam.
 */
const crypto = require('crypto');

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const challengeStore = new Map();
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** [CAPTCHA] Dọn challenge hết hạn khỏi memory store. Ctrl+F: pruneChallengeStore */
function pruneChallengeStore() {
  const now = Date.now();
  for (const [id, entry] of challengeStore.entries()) {
    if (entry.expiresAt <= now) challengeStore.delete(id);
  }
}

/** [CAPTCHA] Provider hiện tại là code nội bộ, giữ hook nếu sau này đổi reCAPTCHA. Ctrl+F: detectProvider */
function detectProvider() {
  return 'code';
}

/** [CAPTCHA] Config public để frontend biết cần render CAPTCHA. Ctrl+F: getPublicConfig */
function getPublicConfig() {
  return { provider: 'code', siteKey: null, enabled: true };
}

/** [CAPTCHA] Sinh mã ký tự dễ đọc, bỏ các ký tự dễ nhầm. Ctrl+F: createCaptchaCode */
function createCaptchaCode(length = 5) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CAPTCHA_CHARS[crypto.randomInt(0, CAPTCHA_CHARS.length)];
  }
  return code;
}

/** [CAPTCHA] Vẽ SVG base64 có noise/rotate để chống bot đơn giản. Ctrl+F: createCaptchaSvg */
function createCaptchaSvg(code) {
  const width = 150;
  const height = 48;
  const noise = Array.from({ length: 10 }, () => {
    const x1 = crypto.randomInt(0, width);
    const y1 = crypto.randomInt(0, height);
    const x2 = crypto.randomInt(0, width);
    const y2 = crypto.randomInt(0, height);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c9c9c9" stroke-width="1"/>`;
  }).join('');
  const chars = code
    .split('')
    .map((char, index) => {
      const x = 18 + index * 24;
      const y = 32 + crypto.randomInt(-4, 5);
      const rotate = crypto.randomInt(-14, 15);
      return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
    })
    .join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" rx="8" fill="#f6f1e8"/>
  ${noise}
  <g font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#4b2e1f" letter-spacing="3">
    ${chars}
  </g>
</svg>`.trim();
}

/** [CAPTCHA] Tạo challenge dạng ảnh SVG + captchaId, lưu đáp án 10 phút. Ctrl+F: createCodeChallenge */
function createCodeChallenge() {
  pruneChallengeStore();
  const code = createCaptchaCode();
  const captchaId = crypto.randomBytes(16).toString('hex');
  challengeStore.set(captchaId, {
    answer: code,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  const svg = createCaptchaSvg(code);
  return {
    captchaId,
    imageData: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    expiresInSeconds: Math.floor(CHALLENGE_TTL_MS / 1000),
  };
}

/** [CAPTCHA] Challenge toán học dự phòng nếu cần đổi UI. Ctrl+F: createMathChallenge */
function createMathChallenge() {
  pruneChallengeStore();
  const a = crypto.randomInt(2, 12);
  const b = crypto.randomInt(2, 12);
  const captchaId = crypto.randomBytes(16).toString('hex');
  const answer = String(a + b);
  challengeStore.set(captchaId, {
    answer,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return {
    captchaId,
    question: `${a} + ${b} = ?`,
    expiresInSeconds: Math.floor(CHALLENGE_TTL_MS / 1000),
  };
}

/** [CAPTCHA] Verify một lần rồi xóa challenge để tránh reuse. Ctrl+F: verifyStoredChallenge */
function verifyStoredChallenge(captchaId, captchaAnswer) {
  // Dọn các challenge hết hạn trước.
  pruneChallengeStore();
  // Tra đáp án đã lưu theo captchaId; không có (hết hạn/sai id) → báo lỗi.
  const entry = challengeStore.get(String(captchaId || ''));
  if (!entry) {
    return { ok: false, message: 'CAPTCHA đã hết hạn. Vui lòng tải lại.' };
  }
  // Xóa NGAY sau khi lấy → mỗi mã chỉ dùng được 1 lần (chống dùng lại cùng captcha).
  challengeStore.delete(String(captchaId));

  // Chuẩn hóa đáp án người dùng: bỏ khoảng trắng, viết hoa để so khớp không phân biệt hoa/thường.
  const normalizedAnswer = String(captchaAnswer ?? '').trim().replace(/\s+/g, '').toUpperCase();
  if (!normalizedAnswer || normalizedAnswer !== String(entry.answer).toUpperCase()) {
    return { ok: false, message: 'Mã CAPTCHA không đúng' };
  }
  return { ok: true };
}

/** [ĐĂNG KÝ] Verify CAPTCHA trong request register. Ctrl+F: verifyRegistrationCaptcha */
async function verifyRegistrationCaptcha(payload) {
  return verifyStoredChallenge(payload.captcha_id, payload.captcha_answer);
}

module.exports = {
  detectProvider,
  getPublicConfig,
  createCodeChallenge,
  createMathChallenge,
  verifyRegistrationCaptcha,
};
