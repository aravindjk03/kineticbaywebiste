import { SECURITY_CONFIG } from '../config.js';
import { getServerSession, USERS, logAuditEvent } from '../store.js';

export function authenticateMiddleware(req, res, next) {
  const reqId = req.id || 'REQ-AUTH';
  
  // Extract session token from HttpOnly cookie or Authorization header
  let sessionToken = req.cookies?.[SECURITY_CONFIG.SESSION_COOKIE_NAME];
  if (!sessionToken && req.headers.authorization?.startsWith('Bearer ')) {
    sessionToken = req.headers.authorization.slice(7).trim();
  }

  if (!sessionToken) {
    return res.status(401).json({
      error: 'Authentication credentials required to access this resource.',
      reference: reqId,
    });
  }

  const session = getServerSession(sessionToken);
  if (!session) {
    return res.status(401).json({
      error: 'Invalid, expired, or terminated session.',
      reference: reqId,
    });
  }

  // Account status validation
  const user = USERS.find((u) => u.id === session.userId);
  if (!user || user.status !== 'active') {
    logAuditEvent({
      type: 'INACTIVE_ACCOUNT_ACCESS_ATTEMPT',
      userId: session.userId,
      role: session.role,
      reqId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'UNKNOWN',
      target: req.originalUrl,
      action: req.method,
      result: 'DENIED',
      metadata: { accountStatus: user ? user.status : 'NOT_FOUND' },
    });

    return res.status(403).json({
      error: 'Account access has been suspended or revoked.',
      reference: reqId,
    });
  }

  req.user = user;
  req.session = session;
  next();
}
