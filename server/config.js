import crypto from 'node:crypto';

// Environment-backed security configuration with cryptographically secure fallbacks
export const SECURITY_CONFIG = {
  // Session Configuration
  SESSION_COOKIE_NAME: 'kb_sec_session',
  CSRF_HEADER_NAME: 'x-csrf-token',
  SESSION_IDLE_TIMEOUT_MS: 15 * 60 * 1000, // 15 minutes idle timeout
  SESSION_MAX_LIFETIME_MS: 8 * 60 * 60 * 1000, // 8 hours absolute max session
  COOKIE_SECRET: process.env.CMS_COOKIE_SECRET || crypto.randomBytes(32).toString('hex'),

  // Password Policy
  PASSWORD_MIN_LENGTH: 12,
  SCRYPT_COST: 16384, // N: CPU/memory cost parameter (OWASP recommended)
  SCRYPT_BLOCK_SIZE: 8, // r
  SCRYPT_PARALLELIZATION: 1, // p
  SCRYPT_KEY_LEN: 64,

  // MFA / TOTP Configuration (RFC 6238)
  TOTP_STEP_SECONDS: 30,
  TOTP_WINDOW_STEPS: 1, // Allow +/- 1 step for clock drift
  TOTP_CODE_LENGTH: 6,

  // Rate Limiting (Sliding Window in Milliseconds)
  RATE_LIMITS: {
    LOGIN: { windowMs: 15 * 60 * 1000, max: 5, message: 'Too many authentication attempts. Please try again later.' },
    MFA: { windowMs: 10 * 60 * 1000, max: 5, message: 'Too many MFA verification attempts. Please try again later.' },
    API: { windowMs: 60 * 1000, max: 120, message: 'Rate limit exceeded. Please throttle requests.' },
    SENSITIVE_OPS: { windowMs: 15 * 60 * 1000, max: 10, message: 'Too many sensitive operations requested.' },
  },

  // Security Headers
  CSP_POLICY: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://images.pexels.com", // unsafe-inline scoped for Three.js/Vite chunk loader
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://images.pexels.com",
    "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com",
    "frame-ancestors 'none'", // Block clickjacking/framing
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),

  // CMS Route Obfuscation
  // Initial cryptographically random route identifier (128-bit entropy = 16 bytes = 32 hex chars)
  INITIAL_CMS_ROUTE: process.env.INITIAL_CMS_ROUTE || 'cms_e2b9c7a104f6d5e8237b1c4a9f8e0d35',
};
