import crypto from 'node:crypto';
import { SECURITY_CONFIG } from './config.js';

/* ─── BASE32 UTILS FOR TOTP (RFC 3548 / RFC 6238) ─────────────── */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input) {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/* ─── PASSWORD HASHING (SCRYPT + SALT) ────────────────────────── */
export function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(
    plainPassword,
    salt,
    SECURITY_CONFIG.SCRYPT_KEY_LEN,
    {
      N: SECURITY_CONFIG.SCRYPT_COST,
      r: SECURITY_CONFIG.SCRYPT_BLOCK_SIZE,
      p: SECURITY_CONFIG.SCRYPT_PARALLELIZATION,
    }
  );
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(plainPassword, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  const storedKeyBuffer = Buffer.from(keyHex, 'hex');

  const derivedKey = crypto.scryptSync(
    plainPassword,
    salt,
    SECURITY_CONFIG.SCRYPT_KEY_LEN,
    {
      N: SECURITY_CONFIG.SCRYPT_COST,
      r: SECURITY_CONFIG.SCRYPT_BLOCK_SIZE,
      p: SECURITY_CONFIG.SCRYPT_PARALLELIZATION,
    }
  );

  if (storedKeyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedKeyBuffer, derivedKey);
}

/* ─── RFC 6238 TOTP GENERATION & VERIFICATION ─────────────────── */
export function generateTotpSecret() {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

export function computeTotp(secretBase32, timeStepOffset = 0) {
  const key = base32Decode(secretBase32);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / SECURITY_CONFIG.TOTP_STEP_SECONDS) + timeStepOffset;

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(SECURITY_CONFIG.TOTP_CODE_LENGTH, '0');
}

export function verifyTotp(secretBase32, userCode, usedStepsTracker = new Set()) {
  if (!userCode || userCode.length !== SECURITY_CONFIG.TOTP_CODE_LENGTH) return false;
  const currentStep = Math.floor(Math.floor(Date.now() / 1000) / SECURITY_CONFIG.TOTP_STEP_SECONDS);

  for (let offset = -SECURITY_CONFIG.TOTP_WINDOW_STEPS; offset <= SECURITY_CONFIG.TOTP_WINDOW_STEPS; offset++) {
    const step = currentStep + offset;
    // Prevent replay attacks on the same time-step
    if (usedStepsTracker.has(step)) continue;

    const validCode = computeTotp(secretBase32, offset);
    if (crypto.timingSafeEqual(Buffer.from(validCode), Buffer.from(userCode))) {
      usedStepsTracker.add(step);
      // Prune old steps
      for (const s of usedStepsTracker) {
        if (s < currentStep - 5) usedStepsTracker.delete(s);
      }
      return true;
    }
  }
  return false;
}

/* ─── RECOVERY CODES ──────────────────────────────────────────── */
export function generateRecoveryCodes(count = 8) {
  const plainCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < count; i++) {
    // 4 groups of 4 alphanumeric chars = 16 chars
    const code = crypto.randomBytes(8).toString('hex').toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`;
    plainCodes.push(formatted);
    hashedCodes.push(hashPassword(formatted));
  }

  return { plainCodes, hashedCodes };
}

export function verifyAndConsumeRecoveryCode(plainCode, hashedCodesList) {
  const formattedInput = plainCode.trim().toUpperCase();
  for (let i = 0; i < hashedCodesList.length; i++) {
    if (verifyPassword(formattedInput, hashedCodesList[i])) {
      // Remove used recovery code (single use)
      hashedCodesList.splice(i, 1);
      return true;
    }
  }
  return false;
}

/* ─── CRYPTOGRAPHIC RANDOM TOKENS & IDENTIFIERS ───────────────── */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateRandomRouteIdentifier() {
  // Minimum 128 bits of entropy (16 bytes) represented as clean URL-safe base64url or hex
  return 'cms_' + crypto.randomBytes(16).toString('hex');
}

/* ─── XSS SANITIZATION (SERVER BOUNDARY) ──────────────────────── */
export function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/javascript:[^\s"'>]+/gi, '') // Remove javascript: pseudo-protocols
    .replace(/on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '') // Remove onerror=, onclick= handlers
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframes
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, ''); // Remove objects
}

export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/* ─── PUBLIC TICKET & ENQUIRY REFERENCE GENERATION ───────────── */
const TICKET_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generatePublicTicketId() {
  const bytes = crypto.randomBytes(8);
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += TICKET_ALPHABET[bytes[i] % TICKET_ALPHABET.length];
  }
  return `KB-${id}`;
}

export function generateEnquiryReference() {
  const bytes = crypto.randomBytes(6);
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += TICKET_ALPHABET[bytes[i] % TICKET_ALPHABET.length];
  }
  return `ENQ-${id}`;
}
