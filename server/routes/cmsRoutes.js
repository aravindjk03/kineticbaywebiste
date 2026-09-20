import express from 'express';
import {
  getActiveCmsRoute,
  isOldCmsRoute,
  rotateCmsRoute,
  AUDIT_LOGS,
  logAuditEvent,
  PERMISSIONS,
  getNoSqlDatabaseStats,
} from '../store.js';
import { generateRandomRouteIdentifier, verifyPassword } from '../crypto.js';
import { authenticateMiddleware } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { sensitiveOpsRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/* ─── 1. ROUTE RESOLUTION ENDPOINT ────────────────────────────── */
// Publicly reachable to verify whether a requested path segment is the valid active CMS gateway
// NEVER reveals what the active route is!
router.post('/resolve-route', (req, res) => {
  const reqId = req.id || 'REQ-ROUTE';
  const { pathSegment } = req.body || {};

  if (!pathSegment || typeof pathSegment !== 'string') {
    return res.status(400).json({ valid: false, reference: reqId });
  }

  const cleanSegment = pathSegment.replace(/^\//, '').trim();

  // Check if attacker is probing previously used/invalidated route
  if (isOldCmsRoute(cleanSegment)) {
    logAuditEvent({
      type: 'PROBE_INVALIDATED_CMS_ROUTE',
      userId: 'ANONYMOUS',
      role: 'ANONYMOUS',
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: `/api/security/resolve-route`,
      action: 'RESOLVE_ROUTE',
      result: 'REJECTED_EXPIRED_ROUTE',
      metadata: { probedSegment: cleanSegment },
    });

    return res.status(404).json({
      valid: false,
      error: 'Route unavailable or expired.',
      reference: reqId,
    });
  }

  // Check against active secret route
  const active = getActiveCmsRoute();
  if (cleanSegment === active) {
    return res.json({
      valid: true,
      requiresAuth: true,
      reference: reqId,
    });
  }

  // Probe against non-existent route
  return res.status(404).json({
    valid: false,
    reference: reqId,
  });
});

/* ─── 2. ROTATE CMS ROUTE (SUPER ADMIN ONLY + STEP-UP AUTH) ───── */
router.post(
  '/rotate-cms-route',
  authenticateMiddleware,
  requirePermission(PERMISSIONS.CMS_ROUTE_UPDATE),
  sensitiveOpsRateLimiter,
  (req, res) => {
    const reqId = req.id || 'REQ-ROTATE';
    const { confirmationPassword, reason } = req.body || {};

    if (!confirmationPassword) {
      return res.status(400).json({
        error: 'Step-up authentication required: please confirm your password.',
        reference: reqId,
      });
    }

    if (!verifyPassword(confirmationPassword, req.user.passwordHash)) {
      logAuditEvent({
        type: 'STEPUP_AUTH_FAILURE',
        userId: req.user.id,
        role: req.user.role,
        reqId,
        ip: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'UNKNOWN',
        target: '/api/security/rotate-cms-route',
        action: 'ROTATE_ROUTE',
        result: 'FAILED_STEPUP_PASSWORD',
      });

      return res.status(401).json({
        error: 'Step-up authentication failed: incorrect confirmation password.',
        reference: reqId,
      });
    }

    // Generate fresh cryptographically secure random route (128+ bits entropy)
    const oldRoute = getActiveCmsRoute();
    const newRoute = generateRandomRouteIdentifier();
    rotateCmsRoute(newRoute);

    logAuditEvent({
      type: 'CMS_ROUTE_ROTATED',
      userId: req.user.id,
      role: req.user.role,
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: '/api/security/rotate-cms-route',
      action: 'ROTATE_CMS_ROUTE',
      result: 'SUCCESS',
      metadata: {
        oldRouteIdentifier: oldRoute,
        reason: reason || 'Scheduled cryptographic route rotation',
      },
    });

    res.json({
      success: true,
      newRouteIdentifier: newRoute,
      newRoutePath: `/${newRoute}`,
      message: 'CMS access route has been rotated. The old route has been permanently invalidated.',
      reference: reqId,
    });
  }
);

/* ─── 3. AUDIT LOGS RETRIEVAL ─────────────────────────────────── */
router.get(
  '/audit-logs',
  authenticateMiddleware,
  requirePermission(PERMISSIONS.AUDIT_READ),
  (req, res) => {
    // Return structured audit logs without sensitive secrets
    res.json({
      logs: AUDIT_LOGS,
      reference: req.id,
    });
  }
);

/* ─── 4. SECURITY TELEMETRY ───────────────────────────────────── */
router.get(
  '/telemetry',
  authenticateMiddleware,
  requirePermission(PERMISSIONS.SECURITY_READ),
  (req, res) => {
    res.json({
      telemetry: {
        activeRouteIdentifier: req.user.role === 'super_admin' ? getActiveCmsRoute() : 'RESTRICTED',
        mfaEnforcedRoles: ['marketing', 'admin', 'super_admin'],
        sessionTimeoutMinutes: 15,
        hashingAlgorithm: 'scrypt (N=16384, r=8, p=1)',
        auditLogEntries: AUDIT_LOGS.length,
      },
      reference: req.id,
    });
  }
);

/* ─── 5. NOSQL DATABASE DIAGNOSTICS ────────────────────────── */
router.get(
  '/database',
  authenticateMiddleware,
  requirePermission(PERMISSIONS.SECURITY_READ),
  (req, res) => {
    res.json({
      database: getNoSqlDatabaseStats(),
      reference: req.id,
    });
  }
);

export default router;
