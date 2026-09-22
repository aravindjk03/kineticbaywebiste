/**
 * Edge crypto helpers (WebCrypto only — runs in Cloudflare Workers and Node 20+).
 * - PBKDF2-SHA256 password hashing
 * - HMAC-SHA256 signed session tokens
 * - RFC 6238 TOTP verification
 */

const enc = new TextEncoder();

export function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export function randomToken(bytes = 24) {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** Constant-time string comparison. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/* ─── Passwords ─────────────────────────────────────────── */

// Workers cap PBKDF2 at 100k iterations.
const PBKDF2_ITERATIONS = 100000;

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64url(salt)}$${b64url(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.startsWith('pbkdf2$')) return false;
  const [, iter, saltB64, hashB64] = stored.split('$');
  const hash = await pbkdf2(password, fromB64url(saltB64), Number(iter));
  return safeEqual(b64url(hash), hashB64);
}

/** Strength policy shared by user creation and password changes. */
export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 12) return 'Password must be at least 12 characters.';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return 'Password must mix upper-case, lower-case letters and numbers.';
  return null;
}

/* ─── Signed tokens ─────────────────────────────────────── */

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function hmac(secret, message) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(message));
  return b64url(sig);
}

/** `kind.payloadB64.sig` — payload is JSON with an `exp` (ms). */
export async function signToken(secret, kind, payload) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await hmac(secret, `${kind}.${body}`);
  return `${kind}.${body}.${sig}`;
}

export async function verifyToken(secret, kind, token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== kind) return null;
  const expected = await hmac(secret, `${kind}.${parts[1]}`);
  if (!safeEqual(parts[2], expected)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ─── TOTP (RFC 6238, SHA-1, 30 s, 6 digits) ────────────── */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(input) {
  const clean = input.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export function base32Encode(bytes) {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function newTotpSecret() {
  return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}

async function hotp(secretBytes, counter) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const off = mac[mac.length - 1] & 15;
  const code = ((mac[off] & 127) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(code % 1e6).padStart(6, '0');
}

/**
 * Returns the matched time-step (for replay protection) or null.
 * Accepts one step of clock drift either side.
 */
export async function verifyTotp(secret, code, now = Date.now()) {
  if (!/^\d{6}$/.test(code || '')) return null;
  const bytes = base32Decode(secret);
  const step = Math.floor(now / 30000);
  for (const s of [step, step - 1, step + 1]) {
    if (safeEqual(await hotp(bytes, s), code)) return s;
  }
  return null;
}

export function otpauthUrl(secret, account) {
  return `otpauth://totp/${encodeURIComponent('KB NEXUS')}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent('KB NEXUS')}&algorithm=SHA1&digits=6&period=30`;
}

export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
