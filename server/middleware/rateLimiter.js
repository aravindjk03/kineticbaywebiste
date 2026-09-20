import { SECURITY_CONFIG } from '../config.js';
import { logAuditEvent } from '../store.js';

class SlidingWindowRateLimiter {
  constructor(windowMs, max, errorMessage, eventType) {
    this.windowMs = windowMs;
    this.max = max;
    this.errorMessage = errorMessage;
    this.eventType = eventType;
    this.hits = new Map(); // ip -> [timestamps]
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const now = Date.now();
      const cutoff = now - this.windowMs;

      let timestamps = this.hits.get(ip) || [];
      // Filter timestamps within window
      timestamps = timestamps.filter((t) => t > cutoff);

      if (timestamps.length >= this.max) {
        logAuditEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          userId: req.user ? req.user.id : 'ANONYMOUS',
          role: req.user ? req.user.role : 'ANONYMOUS',
          reqId: req.id || 'N/A',
          ip,
          userAgent: req.headers['user-agent'] || 'UNKNOWN',
          target: req.originalUrl,
          action: req.method,
          result: 'BLOCKED',
          metadata: { limitType: this.eventType, count: timestamps.length, max: this.max },
        });

        res.setHeader('Retry-After', Math.ceil(this.windowMs / 1000));
        return res.status(429).json({
          error: this.errorMessage,
          reference: req.id,
        });
      }

      timestamps.push(now);
      this.hits.set(ip, timestamps);
      next();
    };
  }
  resetHits() {
    this.hits.clear();
  }
}

export const loginLimiterInstance = new SlidingWindowRateLimiter(
  SECURITY_CONFIG.RATE_LIMITS.LOGIN.windowMs,
  SECURITY_CONFIG.RATE_LIMITS.LOGIN.max,
  SECURITY_CONFIG.RATE_LIMITS.LOGIN.message,
  'LOGIN'
);
export const loginRateLimiter = loginLimiterInstance.middleware();

export const mfaLimiterInstance = new SlidingWindowRateLimiter(
  SECURITY_CONFIG.RATE_LIMITS.MFA.windowMs,
  SECURITY_CONFIG.RATE_LIMITS.MFA.max,
  SECURITY_CONFIG.RATE_LIMITS.MFA.message,
  'MFA'
);
export const mfaRateLimiter = mfaLimiterInstance.middleware();

export const apiLimiterInstance = new SlidingWindowRateLimiter(
  SECURITY_CONFIG.RATE_LIMITS.API.windowMs,
  SECURITY_CONFIG.RATE_LIMITS.API.max,
  SECURITY_CONFIG.RATE_LIMITS.API.message,
  'API'
);
export const apiRateLimiter = apiLimiterInstance.middleware();

export const sensitiveOpsLimiterInstance = new SlidingWindowRateLimiter(
  SECURITY_CONFIG.RATE_LIMITS.SENSITIVE_OPS.windowMs,
  SECURITY_CONFIG.RATE_LIMITS.SENSITIVE_OPS.max,
  SECURITY_CONFIG.RATE_LIMITS.SENSITIVE_OPS.message,
  'SENSITIVE_OPS'
);
export const sensitiveOpsRateLimiter = sensitiveOpsLimiterInstance.middleware();

export const ticketTrackingLimiterInstance = new SlidingWindowRateLimiter(
  15 * 60 * 1000,
  15,
  'Too many ticket status requests. Please wait before retrying.',
  'TICKET_TRACKING'
);
export const ticketTrackingRateLimiter = ticketTrackingLimiterInstance.middleware();

export const publicSubmissionLimiterInstance = new SlidingWindowRateLimiter(
  15 * 60 * 1000,
  20,
  'Too many ticket or enquiry submissions from this IP. Please try again later.',
  'PUBLIC_SUBMISSION'
);
export const publicSubmissionRateLimiter = publicSubmissionLimiterInstance.middleware();

export function resetAllRateLimiters() {
  loginLimiterInstance.resetHits();
  mfaLimiterInstance.resetHits();
  apiLimiterInstance.resetHits();
  sensitiveOpsLimiterInstance.resetHits();
  ticketTrackingLimiterInstance.resetHits();
  publicSubmissionLimiterInstance.resetHits();
}
