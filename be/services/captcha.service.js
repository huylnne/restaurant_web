const crypto = require('crypto');
const axios = require('axios');

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const mathStore = new Map();

function pruneMathStore() {
  const now = Date.now();
  for (const [id, entry] of mathStore.entries()) {
    if (entry.expiresAt <= now) mathStore.delete(id);
  }
}

function detectProvider() {
  const forced = String(process.env.CAPTCHA_PROVIDER || '').trim().toLowerCase();
  if (['math', 'recaptcha', 'turnstile'].includes(forced)) return forced;
  if (process.env.RECAPTCHA_SECRET_KEY) return 'recaptcha';
  if (process.env.TURNSTILE_SECRET_KEY) return 'turnstile';
  return 'math';
}

function getPublicConfig() {
  const provider = detectProvider();
  if (provider === 'recaptcha') {
    return {
      provider,
      siteKey: process.env.RECAPTCHA_SITE_KEY || '',
      enabled: !!(process.env.RECAPTCHA_SITE_KEY && process.env.RECAPTCHA_SECRET_KEY),
    };
  }
  if (provider === 'turnstile') {
    return {
      provider,
      siteKey: process.env.TURNSTILE_SITE_KEY || '',
      enabled: !!(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY),
    };
  }
  return { provider: 'math', siteKey: null, enabled: true };
}

function createMathChallenge() {
  pruneMathStore();
  const a = crypto.randomInt(2, 12);
  const b = crypto.randomInt(2, 12);
  const captchaId = crypto.randomBytes(16).toString('hex');
  const answer = a + b;
  mathStore.set(captchaId, {
    answer,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return {
    captchaId,
    question: `${a} + ${b} = ?`,
    expiresInSeconds: Math.floor(CHALLENGE_TTL_MS / 1000),
  };
}

async function verifyRecaptcha(token, remoteIp) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { ok: false, message: 'reCAPTCHA chưa được cấu hình trên server' };

  const params = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp) params.append('remoteip', remoteIp);

  const { data } = await axios.post(
    'https://www.google.com/recaptcha/api/siteverify',
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
  );

  if (!data.success) {
    return { ok: false, message: 'Xác minh reCAPTCHA thất bại. Vui lòng thử lại.' };
  }
  return { ok: true };
}

async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, message: 'Turnstile chưa được cấu hình trên server' };

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp) body.append('remoteip', remoteIp);

  const { data } = await axios.post(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    body.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
  );

  if (!data.success) {
    return { ok: false, message: 'Xác minh CAPTCHA thất bại. Vui lòng thử lại.' };
  }
  return { ok: true };
}

function verifyMathChallenge(captchaId, captchaAnswer) {
  pruneMathStore();
  const entry = mathStore.get(String(captchaId || ''));
  if (!entry) {
    return { ok: false, message: 'CAPTCHA đã hết hạn. Vui lòng tải lại.' };
  }
  mathStore.delete(String(captchaId));

  const parsed = Number(String(captchaAnswer ?? '').trim());
  if (!Number.isFinite(parsed) || parsed !== entry.answer) {
    return { ok: false, message: 'Kết quả CAPTCHA không đúng' };
  }
  return { ok: true };
}

async function verifyRegistrationCaptcha(payload, remoteIp) {
  const provider = detectProvider();

  if (provider === 'recaptcha') {
    const token = payload.captcha_token;
    if (!token) return { ok: false, message: 'Vui lòng hoàn thành reCAPTCHA' };
    return verifyRecaptcha(token, remoteIp);
  }

  if (provider === 'turnstile') {
    const token = payload.captcha_token;
    if (!token) return { ok: false, message: 'Vui lòng hoàn thành xác minh CAPTCHA' };
    return verifyTurnstile(token, remoteIp);
  }

  return verifyMathChallenge(payload.captcha_id, payload.captcha_answer);
}

module.exports = {
  detectProvider,
  getPublicConfig,
  createMathChallenge,
  verifyRegistrationCaptcha,
};
