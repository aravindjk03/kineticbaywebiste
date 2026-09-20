import express from 'express';
import {
  USERS,
  PERMISSIONS,
  ROLES,
  logAuditEvent,
  invalidateAllUserSessions,
} from '../store.js';
import { hashPassword, generateTotpSecret, generateRecoveryCodes } from '../crypto.js';
import { authenticateMiddleware } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';

const router = express.Router();

function sanitizeUserRecord(u) {
  return {
    id: u.id,
    username: u.username || u.email.split('@')[0],
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    mfaEnabled: u.mfaEnabled,
    createdAt: u.createdAt,
  };
}

/* ─── 1. LIST USERS ───────────────────────────────────────────── */
router.get('/', authenticateMiddleware, requirePermission(PERMISSIONS.USERS_READ), (req, res) => {
  res.json({
    users: USERS.map(sanitizeUserRecord),
    reference: req.id,
  });
});

/* ─── 2. CREATE NEW USER ──────────────────────────────────────── */
router.post('/', authenticateMiddleware, requirePermission(PERMISSIONS.USERS_CREATE), (req, res) => {
  const reqId = req.id || 'REQ-USR-NEW';
  const { username, email, name, role, initialPassword } = req.body || {};

  const cleanUsername = (username || (email ? email.split('@')[0] : '')).toLowerCase().trim();
  const cleanEmail = (email || `${cleanUsername}@kineticbay.internal`).toLowerCase().trim();

  if (!cleanUsername || !name || !role || !initialPassword) {
    return res.status(400).json({ error: 'Username, name, role, and initial password required.', reference: reqId });
  }

  // Privilege escalation check: Only Super Admin can create Admin or Super Admin
  if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role) && req.user.role !== ROLES.SUPER_ADMIN) {
    logAuditEvent({
      type: 'PRIVILEGE_ESCALATION_ATTEMPT',
      userId: req.user.id,
      role: req.user.role,
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: '/api/users',
      action: 'CREATE_PRIVILEGED_USER',
      result: 'DENIED',
      metadata: { targetRole: role },
    });

    return res.status(403).json({
      error: 'Forbidden: You do not have authority to create elevated accounts.',
      reference: reqId,
    });
  }

  if (USERS.some((u) => u.username === cleanUsername || u.email === cleanEmail)) {
    return res.status(409).json({ error: 'User with this username or email already exists.', reference: reqId });
  }

  const totpSecret = generateTotpSecret();
  const recovery = generateRecoveryCodes();

  const newUser = {
    id: 'usr_' + Date.now(),
    username: cleanUsername,
    email: cleanEmail,
    name,
    role,
    passwordHash: hashPassword(initialPassword),
    mfaEnabled: true,
    mfaSecret: totpSecret,
    recoveryCodes: recovery.hashedCodes,
    status: 'active',
    failedAttempts: 0,
    lockoutUntil: null,
    usedTotpSteps: new Set(),
    createdAt: new Date().toISOString(),
  };

  USERS.push(newUser);

  logAuditEvent({
    type: 'USER_CREATED',
    userId: req.user.id,
    role: req.user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: `/api/users/${newUser.id}`,
    action: 'CREATE_USER',
    result: 'SUCCESS',
    metadata: { createdUserId: newUser.id, role },
  });

  res.status(201).json({
    user: sanitizeUserRecord(newUser),
    initialRecoveryCodes: recovery.plainCodes,
    reference: reqId,
  });
});

/* ─── 3. UPDATE USER ROLE (STRICT PRIVILEGE ESCALATION RULES) ──── */
router.patch('/:id/role', authenticateMiddleware, (req, res) => {
  const reqId = req.id || 'REQ-ROLE-UPD';
  const userRole = req.user.role;

  // Role modification requires Admin or Super Admin role
  if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(userRole)) {
    logAuditEvent({
      type: 'PERMISSION_DENIED',
      userId: req.user.id,
      role: userRole,
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: req.originalUrl,
      action: req.method,
      result: 'DENIED',
      metadata: { requiredRoles: [ROLES.ADMIN, ROLES.SUPER_ADMIN], actualRole: userRole },
    });

    return res.status(403).json({
      error: 'Access denied: insufficient permission to modify user roles.',
      reference: reqId,
    });
  }

  const targetUser = USERS.find((u) => u.id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.', reference: reqId });
  }

  const { newRole } = req.body || {};
  if (!Object.values(ROLES).includes(newRole)) {
    return res.status(400).json({ error: 'Invalid role specified.', reference: reqId });
  }

  // Self-privilege escalation check: User cannot modify their own role
  if (targetUser.id === req.user.id) {
    logAuditEvent({
      type: 'SELF_PRIVILEGE_MODIFICATION_ATTEMPT',
      userId: req.user.id,
      role: req.user.role,
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: `/api/users/${targetUser.id}/role`,
      action: 'SELF_ROLE_CHANGE',
      result: 'DENIED',
    });

    return res.status(403).json({
      error: 'Forbidden: Self-role modification is strictly prohibited.',
      reference: reqId,
    });
  }

  // Privilege escalation check: Non-superadmin cannot assign or revoke superadmin
  if ((newRole === ROLES.SUPER_ADMIN || targetUser.role === ROLES.SUPER_ADMIN) && req.user.role !== ROLES.SUPER_ADMIN) {
    logAuditEvent({
      type: 'PRIVILEGE_ESCALATION_ATTEMPT',
      userId: req.user.id,
      role: req.user.role,
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: `/api/users/${targetUser.id}/role`,
      action: 'MODIFY_SUPERADMIN_ROLE',
      result: 'DENIED',
      metadata: { targetRole: newRole },
    });

    return res.status(403).json({
      error: 'Forbidden: Only a Super Admin can modify or assign Super Admin privileges.',
      reference: reqId,
    });
  }

  const previousRole = targetUser.role;
  targetUser.role = newRole;

  // Invalidate target user's sessions so privilege change takes effect immediately
  invalidateAllUserSessions(targetUser.id);

  logAuditEvent({
    type: 'USER_ROLE_CHANGED',
    userId: req.user.id,
    role: req.user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: `/api/users/${targetUser.id}`,
    action: 'CHANGE_ROLE',
    result: 'SUCCESS',
    metadata: { previousRole, newRole, targetUserId: targetUser.id },
  });

  res.json({
    success: true,
    user: sanitizeUserRecord(targetUser),
    reference: reqId,
  });
});

/* ─── 4. DISABLE / ENABLE USER ACCOUNT ────────────────────────── */
router.patch('/:id/status', authenticateMiddleware, requirePermission(PERMISSIONS.USERS_DISABLE), (req, res) => {
  const reqId = req.id || 'REQ-STAT-UPD';
  const targetUser = USERS.find((u) => u.id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.', reference: reqId });
  }

  // Cannot disable self
  if (targetUser.id === req.user.id) {
    return res.status(403).json({ error: 'Cannot disable your own account.', reference: reqId });
  }

  const { status } = req.body || {};
  if (!['active', 'disabled'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active or disabled.', reference: reqId });
  }

  targetUser.status = status;

  // If disabled, immediately terminate all active sessions
  if (status === 'disabled') {
    invalidateAllUserSessions(targetUser.id);
  }

  logAuditEvent({
    type: status === 'disabled' ? 'USER_ACCOUNT_DISABLED' : 'USER_ACCOUNT_ENABLED',
    userId: req.user.id,
    role: req.user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: `/api/users/${targetUser.id}`,
    action: 'CHANGE_STATUS',
    result: 'SUCCESS',
    metadata: { status, targetUserId: targetUser.id },
  });

  res.json({
    success: true,
    user: sanitizeUserRecord(targetUser),
    reference: reqId,
  });
});

export default router;
