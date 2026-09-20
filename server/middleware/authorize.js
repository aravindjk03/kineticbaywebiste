import { ROLE_PERMISSIONS, logAuditEvent } from '../store.js';

export function requirePermission(permission) {
  return (req, res, next) => {
    const reqId = req.id || 'REQ-AUTHZ';

    if (!req.user || !req.session) {
      return res.status(401).json({
        error: 'Authentication context required.',
        reference: reqId,
      });
    }

    const userRole = req.user.role;
    const allowedPermissions = ROLE_PERMISSIONS[userRole] || [];

    // Explicit check — Fail closed (Default DENY)
    if (!allowedPermissions.includes(permission)) {
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
        metadata: {
          requiredPermission: permission,
          userRole,
        },
      });

      return res.status(403).json({
        error: 'Access denied: insufficient permission to execute this operation.',
        reference: reqId,
      });
    }

    next();
  };
}

export function requireRole(allowedRoles) {
  const rolesList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    const reqId = req.id || 'REQ-AUTHZ';

    if (!req.user || !req.session) {
      return res.status(401).json({
        error: 'Authentication context required.',
        reference: reqId,
      });
    }

    if (!rolesList.includes(req.user.role)) {
      logAuditEvent({
        type: 'ROLE_DENIED',
        userId: req.user.id,
        role: req.user.role,
        reqId,
        ip: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'UNKNOWN',
        target: req.originalUrl,
        action: req.method,
        result: 'DENIED',
        metadata: {
          requiredRoles: rolesList,
          actualRole: req.user.role,
        },
      });

      return res.status(403).json({
        error: 'Access denied: role not authorized.',
        reference: reqId,
      });
    }

    next();
  };
}
