// v2 PWA auth: single shared password (APP_PASSWORD) exchanged for a signed
// bearer token (HMAC-SHA256 with AUTH_TOKEN_SECRET). No sessions, no DB.
const crypto = require('crypto');

const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days, then re-login

function b64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function hmac(data, secret) {
  const digest = crypto.createHmac('sha256', secret).update(data).digest('base64');
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function createToken(secret) {
  const payload = b64url(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS }));
  return `${payload}.${hmac(payload, secret)}`;
}

function verifyToken(token, secret) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = hmac(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return typeof exp === 'number' && Date.now() < exp;
  } catch {
    return false;
  }
}

// Constant-time string comparison for the password check
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

module.exports = { createToken, verifyToken, safeEqual };
