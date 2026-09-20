import crypto from 'node:crypto';
import { sanitizeObject } from '../crypto.js';
import { logAuditEvent } from '../store.js';

export function requestValidatorMiddleware(req, res, next) {
  // Assign correlation request ID
  req.id = 'REQ-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  res.setHeader('X-Request-ID', req.id);

  // Validate Content-Type for mutation methods
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'] || '';
    if (req.body && Object.keys(req.body).length > 0 && !contentType.includes('application/json')) {
      return res.status(415).json({
        error: 'Unsupported Media Type. application/json is required.',
        reference: req.id,
      });
    }

    // XSS Sanitization pass
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
  }

  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeObject(req.query[key]);
      }
    }
  }

  next();
}

export function secureErrorHandler(err, req, res, _next) {
  const reqId = req.id || 'REQ-UNKNOWN';
  console.error(`[SEC-ERR ${reqId}] Unhandled exception:`, err);

  logAuditEvent({
    type: 'SERVER_EXCEPTION',
    userId: req.user ? req.user.id : 'ANONYMOUS',
    role: req.user ? req.user.role : 'ANONYMOUS',
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: req.originalUrl,
    action: req.method,
    result: 'EXCEPTION',
    metadata: {
      errorMessage: err.message,
      errorName: err.name,
    },
  });

  res.status(500).json({
    error: 'A system condition prevented execution of this request.',
    reference: reqId,
  });
}
