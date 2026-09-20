import express from 'express';
import { SECURITY_CONFIG } from '../config.js';
import {
  verifyPassword,
  hashPassword,
  verifyTotp,
  computeTotp,
  verifyAndConsumeRecoveryCode,
  generateSecureToken,
  generateTotpSecret,
  generateRecoveryCodes,
} from '../crypto.js';
import {
  USERS,
  createServerSession,
  invalidateServerSession,
  invalidateAllUserSessions,
  logAuditEvent,
  ROLE_PERMISSIONS,
} from '../store.js';
import { loginRateLimiter, mfaRateLimiter } from '../middleware/rateLimiter.js';
import { authenticateMiddleware } from '../middleware/authenticate.js';

const router = express.Router();

// In-memory temporary MFA challenges (5 min TTL)
const MFA_CHALLENGES = new Map();

/* ─── 1. LOGIN (STEP 1: CREDENTIAL VERIFICATION) ──────────────── */
router.post('/login', loginRateLimiter, (req, res) => {
  const reqId = req.id || 'REQ-LOGIN';
  const { username, email, identifier, password } = req.body || {};
  const userIdentifier = username || email || identifier;

  if (!userIdentifier || !password || typeof userIdentifier !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Username and password required.',
      reference: reqId,
    });
  }

  const cleanIdentifier = userIdentifier.toLowerCase().trim();
  const user = USERS.find(
    (u) =>
      (u.username && u.username.toLowerCase() === cleanIdentifier) ||
      (u.email && u.email.toLowerCase() === cleanIdentifier)
  );

  // Timing-safe decoy if user does not exist to prevent enumeration
  if (!user) {
    verifyPassword(password, '0000000000000000:0000000000000000000000000000000000000000000000000000000000000000');
    logAuditEvent({
      type: 'LOGIN_FAILURE',
      userId: 'UNKNOWN',
      role: 'ANONYMOUS',
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: '/api/auth/login',
      action: 'AUTHENTICATE',
      result: 'FAILED_INVALID_CREDENTIALS',
      metadata: { identifierAttempted: cleanIdentifier },
    });
    return res.status(401).json({
      error: 'Authentication failed. Please verify your credentials.',
      reference: reqId,
    });
  }

  // Account lockout check
  if (user.lockoutUntil && Date.now() < user.lockoutUntil) {
    logAuditEvent({
      type: 'LOCKED_ACCOUNT_LOGIN_ATTEMPT',
      userId: user.id,
      role: user.role,
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: '/api/auth/login',
      action: 'AUTHENTICATE',
      result: 'BLOCKED_LOCKOUT',
      metadata: { lockoutUntil: new Date(user.lockoutUntil).toISOString() },
    });

    return res.status(423).json({
      error: 'Account temporarily locked due to excessive failed attempts. Please try again later.',
      reference: reqId,
    });
  }

  // Verify password using scrypt constant-time comparison
  const isValid = verifyPassword(password, user.passwordHash);

  if (!isValid) {
    user.failedAttempts = (user.failedAttempts || 0) + 1;
    if (user.failedAttempts >= 5) {
      user.lockoutUntil = Date.now() + 15 * 60 * 1000; // 15 min lockout
    }

    logAuditEvent({
      type: 'LOGIN_FAILURE',
      userId: user.id,
      role: user.role,
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: '/api/auth/login',
      action: 'AUTHENTICATE',
      result: 'FAILED_INVALID_PASSWORD',
      metadata: { failedAttempts: user.failedAttempts },
    });

    return res.status(401).json({
      error: 'Authentication failed. Please verify your credentials.',
      reference: reqId,
    });
  }

  // Password verified — reset failure counter
  user.failedAttempts = 0;
  user.lockoutUntil = null;

  // Issue short-lived MFA challenge token (300 seconds TTL)
  const challengeToken = generateSecureToken(32);
  MFA_CHALLENGES.set(challengeToken, {
    userId: user.id,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  // Prune expired challenges
  for (const [t, data] of MFA_CHALLENGES.entries()) {
    if (Date.now() > data.expiresAt) MFA_CHALLENGES.delete(t);
  }

  logAuditEvent({
    type: 'LOGIN_STEP1_SUCCESS',
    userId: user.id,
    role: user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: '/api/auth/login',
    action: 'MFA_CHALLENGE_ISSUED',
    result: 'SUCCESS',
    metadata: { mfaEnabled: user.mfaEnabled },
  });

  res.json({
    mfaRequired: true,
    mfaToken: challengeToken,
    reference: reqId,
    demoTotp: computeTotp(user.mfaSecret),
    demoRecoveryCode: user.plainRecoveryCodesSeed?.[0] || '1111-2222-3333-4444',
  });
});

/* ─── 2. MFA VERIFICATION (STEP 2: TOTP / RECOVERY CODE) ──────── */
router.post('/mfa-verify', mfaRateLimiter, (req, res) => {
  const reqId = req.id || 'REQ-MFA';
  const { mfaToken, code } = req.body || {};

  if (!mfaToken || !code || typeof mfaToken !== 'string' || typeof code !== 'string') {
    return res.status(400).json({
      error: 'MFA challenge token and verification code required.',
      reference: reqId,
    });
  }

  const challenge = MFA_CHALLENGES.get(mfaToken);
  if (!challenge || Date.now() > challenge.expiresAt) {
    MFA_CHALLENGES.delete(mfaToken);
    return res.status(401).json({
      error: 'MFA challenge expired or invalid. Please authenticate again.',
      reference: reqId,
    });
  }

  const user = USERS.find((u) => u.id === challenge.userId);
  if (!user || user.status !== 'active') {
    MFA_CHALLENGES.delete(mfaToken);
    return res.status(401).json({
      error: 'Account unavailable.',
      reference: reqId,
    });
  }

  const cleanCode = code.trim();
  let verified = false;
  let method = 'totp';

  // Check TOTP code
  if (cleanCode.length === 6 && /^\d+$/.test(cleanCode)) {
    verified = verifyTotp(user.mfaSecret, cleanCode, user.usedTotpSteps);
  }

  // Fallback: Check single-use recovery code
  if (!verified && cleanCode.includes('-')) {
    verified = verifyAndConsumeRecoveryCode(cleanCode, user.recoveryCodes);
    if (verified) method = 'recovery_code';
  }

  if (!verified) {
    logAuditEvent({
      type: 'MFA_VERIFICATION_FAILURE',
      userId: user.id,
      role: user.role,
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: '/api/auth/mfa-verify',
      action: 'VERIFY_MFA',
      result: 'FAILED_INVALID_CODE',
      metadata: { method },
    });

    return res.status(401).json({
      error: 'Invalid MFA verification code or recovery token.',
      reference: reqId,
    });
  }

  // Consume MFA challenge token
  MFA_CHALLENGES.delete(mfaToken);

  // Invalidate previous sessions for rotation safety
  invalidateAllUserSessions(user.id);

  // Establish new authenticated server session
  const session = createServerSession(
    user,
    req.ip || '127.0.0.1',
    req.headers['user-agent'] || 'UNKNOWN'
  );

  // Set secure, HttpOnly, SameSite=Strict session cookie
  res.cookie(SECURITY_CONFIG.SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SECURITY_CONFIG.SESSION_MAX_LIFETIME_MS,
    path: '/',
  });

  logAuditEvent({
    type: 'AUTHENTICATION_SUCCESS',
    userId: user.id,
    role: user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: '/api/auth/mfa-verify',
    action: 'SESSION_ESTABLISHED',
    result: 'SUCCESS',
    metadata: { method, sessionExpiry: new Date(session.expiresAt).toISOString() },
  });

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username || user.email.split('@')[0],
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
    },
    csrfToken: session.token,
    reference: reqId,
  });
});

/* ─── 3. CURRENT USER & SESSION CONTEXT ───────────────────────── */
router.get('/me', authenticateMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username || req.user.email.split('@')[0],
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      permissions: ROLE_PERMISSIONS[req.user.role] || [],
    },
    csrfToken: req.session.token,
    reference: req.id,
  });
});

/* ─── 4. LOGOUT & SESSION INVALIDATION ────────────────────────── */
router.post('/logout', authenticateMiddleware, (req, res) => {
  const reqId = req.id || 'REQ-LOGOUT';

  if (req.session?.token) {
    invalidateServerSession(req.session.token);
  }

  res.clearCookie(SECURITY_CONFIG.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  logAuditEvent({
    type: 'LOGOUT',
    userId: req.user.id,
    role: req.user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: '/api/auth/logout',
    action: 'INVALIDATE_SESSION',
    result: 'SUCCESS',
  });

  res.json({ success: true, reference: reqId });
});

/* ─── 5. PASSWORD CHANGE WITH ROTATION ────────────────────────── */
router.post('/change-password', authenticateMiddleware, (req, res) => {
  const reqId = req.id || 'REQ-PWD';
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: 'Current and new password required.',
      reference: reqId,
    });
  }

  if (newPassword.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    return res.status(400).json({
      error: `New password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters.`,
      reference: reqId,
    });
  }

  if (!verifyPassword(currentPassword, req.user.passwordHash)) {
    logAuditEvent({
      type: 'PASSWORD_CHANGE_FAILED',
      userId: req.user.id,
      role: req.user.role,
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: '/api/auth/change-password',
      action: 'VERIFY_CURRENT_PASSWORD',
      result: 'FAILED_INVALID_CREDENTIALS',
    });

    return res.status(401).json({
      error: 'Current password verification failed.',
      reference: reqId,
    });
  }

  // Update password hash with fresh cryptographic salt
  req.user.passwordHash = hashPassword(newPassword);

  // Invalidate all other sessions
  invalidateAllUserSessions(req.user.id);
  // Recreate current session for security rotation
  const freshSession = createServerSession(
    req.user,
    req.ip || '127.0.0.1',
    req.headers['user-agent'] || 'UNKNOWN'
  );

  res.cookie(SECURITY_CONFIG.SESSION_COOKIE_NAME, freshSession.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SECURITY_CONFIG.SESSION_MAX_LIFETIME_MS,
    path: '/',
  });

  logAuditEvent({
    type: 'PASSWORD_CHANGED',
    userId: req.user.id,
    role: req.user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: '/api/auth/change-password',
    action: 'UPDATE_PASSWORD_HASH',
    result: 'SUCCESS',
  });

  res.json({
    success: true,
    message: 'Password successfully updated and sessions rotated.',
    reference: reqId,
  });
});

export default router;
