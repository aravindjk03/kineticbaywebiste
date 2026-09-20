import { SECURITY_CONFIG } from '../config.js';
import { logAuditEvent } from '../store.js';

/**
 * High-performance Token Bucket implementation.
 * Uses continuous mathematical replenishment to avoid timer overhead.
 */
export class TokenBucket {
  constructor({ capacity, refillRatePerSec, initialTokens }) {
    this.capacity = capacity;
    this.refillRatePerSec = refillRatePerSec;
    this.tokens = initialTokens !== undefined ? initialTokens : capacity;
    this.lastRefill = Date.now();
  }

  refill() {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    if (elapsedSec > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillRatePerSec);
      this.lastRefill = now;
    }
  }

  tryConsume(cost = 1) {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  getAvailableTokens() {
    this.refill();
    return Math.floor(this.tokens);
  }

  getResetTimeSec() {
    this.refill();
    if (this.tokens >= 1) return 0;
    const needed = 1 - this.tokens;
    return Math.max(1, Math.ceil(needed / this.refillRatePerSec));
  }

  reset() {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

/**
 * Multi-Tiered Request Bucket List (Defense-in-Depth anti-DoS / anti-DDoS architecture)
 * Tiers:
 * 1. IP Penalty Jail (Anti-Abuse Auto-Banning on repeated offenses)
 * 2. Global Circuit Breaker (System-wide volumetric saturation defense)
 * 3. Client IP Burst Bucket (Sub-second / rapid burst throttling)
 * 4. Client IP Sustained Window (Resource depletion / quota limiting)
 * 5. Target Fingerprint Bucket (Anti-distributed proxy rotation targeting victim emails)
 */
export class HierarchicalRequestBucketList {
  constructor(options = {}) {
    this.name = options.name || 'BUCKET_LIMITER';
    this.burstCapacity = options.burstCapacity || 10;
    this.burstRefillPerSec = options.burstRefillPerSec || 1.0;
    this.sustainedMax = options.sustainedMax || 20;
    this.sustainedWindowMs = options.sustainedWindowMs || 15 * 60 * 1000;
    this.fingerprintCapacity = options.fingerprintCapacity || 8;
    this.fingerprintRefillPerSec = options.fingerprintRefillPerSec || 0.1;
    this.globalCapacity = options.globalCapacity || 250;
    this.globalRefillPerSec = options.globalRefillPerSec || 5.0;
    this.jailDurationMs = options.jailDurationMs || 10 * 60 * 1000; // 10 minutes
    this.maxViolationsBeforeJail = options.maxViolationsBeforeJail || 3;
    this.extractFingerprint = options.extractFingerprint || null;
    this.errorMessage = options.errorMessage || 'Too many requests. Please wait before retrying.';

    this.globalBucket = new TokenBucket({
      capacity: this.globalCapacity,
      refillRatePerSec: this.globalRefillPerSec,
    });

    this.ipBurstBuckets = new Map(); // ip -> TokenBucket
    this.ipSustainedHits = new Map(); // ip -> [timestamps]
    this.fingerprintBuckets = new Map(); // fingerprint -> TokenBucket
    this.jailedIps = new Map(); // ip -> unjailTimestamp
    this.violationCounts = new Map(); // ip -> { count, windowStart }
  }

  recordViolation(ip) {
    const now = Date.now();
    let record = this.violationCounts.get(ip);
    if (!record || now - record.windowStart > 10 * 60 * 1000) {
      record = { count: 1, windowStart: now };
    } else {
      record.count += 1;
    }
    this.violationCounts.set(ip, record);

    if (record.count >= this.maxViolationsBeforeJail) {
      const unjailAt = now + this.jailDurationMs;
      this.jailedIps.set(ip, unjailAt);
      logAuditEvent({
        type: 'DOS_PENALTY_JAIL_TRIGGERED',
        userId: 'ANONYMOUS',
        role: 'ANONYMOUS',
        reqId: 'SYSTEM',
        ip,
        target: this.name,
        action: 'AUTO_JAIL',
        result: 'BANNED',
        metadata: { violations: record.count, jailDurationMs: this.jailDurationMs, unjailAt: new Date(unjailAt).toISOString() },
      });
    }
  }

  isJailed(ip) {
    const unjailAt = this.jailedIps.get(ip);
    if (!unjailAt) return false;
    if (Date.now() > unjailAt) {
      this.jailedIps.delete(ip);
      this.violationCounts.delete(ip);
      return false;
    }
    return true;
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const now = Date.now();

      // ─── TIER 1: IP PENALTY JAIL ──────────────────────────────
      if (this.isJailed(ip)) {
        const unjailAt = this.jailedIps.get(ip);
        const retryAfter = Math.max(1, Math.ceil((unjailAt - now) / 1000));

        res.setHeader('Retry-After', String(retryAfter));
        res.setHeader('X-RateLimit-Limit', '0');
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', String(retryAfter));

        logAuditEvent({
          type: 'DOS_JAIL_BLOCKED',
          userId: req.user ? req.user.id : 'ANONYMOUS',
          role: req.user ? req.user.role : 'ANONYMOUS',
          reqId: req.id || 'N/A',
          ip,
          userAgent: req.headers['user-agent'] || 'UNKNOWN',
          target: req.originalUrl,
          action: req.method,
          result: 'BLOCKED_JAILED',
          metadata: { limitType: this.name, retryAfter },
        });

        return res.status(429).json({
          error: 'IP address temporarily restricted due to repetitive DoS traffic spikes. Please wait before retrying.',
          reference: req.id,
          retryAfter,
          limitType: 'PENALTY_JAIL',
        });
      }

      // ─── TIER 2: GLOBAL CIRCUIT BREAKER (DDoS MITIGATION) ────
      if (!this.globalBucket.tryConsume(1)) {
        const retryAfter = this.globalBucket.getResetTimeSec() || 2;
        res.setHeader('Retry-After', String(retryAfter));

        logAuditEvent({
          type: 'GLOBAL_CIRCUIT_BREAKER_TRIGGERED',
          userId: req.user ? req.user.id : 'ANONYMOUS',
          role: req.user ? req.user.role : 'ANONYMOUS',
          reqId: req.id || 'N/A',
          ip,
          target: req.originalUrl,
          action: req.method,
          result: 'BLOCKED_GLOBAL',
          metadata: { limitType: this.name, retryAfter },
        });

        return res.status(429).json({
          error: 'Platform is receiving unusually high traffic volume. Please retry momentarily.',
          reference: req.id,
          retryAfter,
          limitType: 'GLOBAL_BREAKER',
        });
      }

      // ─── TIER 3: CLIENT IP BURST BUCKET ──────────────────────
      let burstBucket = this.ipBurstBuckets.get(ip);
      if (!burstBucket) {
        burstBucket = new TokenBucket({
          capacity: this.burstCapacity,
          refillRatePerSec: this.burstRefillPerSec,
        });
        this.ipBurstBuckets.set(ip, burstBucket);
      }

      if (!burstBucket.tryConsume(1)) {
        this.recordViolation(ip);
        const retryAfter = burstBucket.getResetTimeSec() || 2;
        res.setHeader('Retry-After', String(retryAfter));
        res.setHeader('X-RateLimit-Limit', String(this.burstCapacity));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', String(retryAfter));

        logAuditEvent({
          type: 'BURST_BUCKET_EXHAUSTED',
          userId: req.user ? req.user.id : 'ANONYMOUS',
          role: req.user ? req.user.role : 'ANONYMOUS',
          reqId: req.id || 'N/A',
          ip,
          target: req.originalUrl,
          action: req.method,
          result: 'BLOCKED_BURST',
          metadata: { limitType: this.name, retryAfter },
        });

        return res.status(429).json({
          error: 'Too many rapid requests. Burst rate limit exceeded. Please wait a moment.',
          reference: req.id,
          retryAfter,
          limitType: 'BURST_BUCKET',
        });
      }

      // ─── TIER 4: CLIENT IP SUSTAINED WINDOW ──────────────────
      const cutoff = now - this.sustainedWindowMs;
      let timestamps = this.ipSustainedHits.get(ip) || [];
      timestamps = timestamps.filter((t) => t > cutoff);

      if (timestamps.length >= this.sustainedMax) {
        this.recordViolation(ip);
        const retryAfter = Math.max(1, Math.ceil((timestamps[0] + this.sustainedWindowMs - now) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        res.setHeader('X-RateLimit-Limit', String(this.sustainedMax));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', String(retryAfter));

        logAuditEvent({
          type: 'SUSTAINED_BUCKET_EXHAUSTED',
          userId: req.user ? req.user.id : 'ANONYMOUS',
          role: req.user ? req.user.role : 'ANONYMOUS',
          reqId: req.id || 'N/A',
          ip,
          target: req.originalUrl,
          action: req.method,
          result: 'BLOCKED_SUSTAINED',
          metadata: { limitType: this.name, count: timestamps.length, max: this.sustainedMax, retryAfter },
        });

        return res.status(429).json({
          error: this.errorMessage,
          reference: req.id,
          retryAfter,
          limitType: 'SUSTAINED_QUOTA',
        });
      }

      // ─── TIER 5: TARGET FINGERPRINT BUCKET (ANTI-DISTRIBUTED DoS)
      if (this.extractFingerprint) {
        const fp = this.extractFingerprint(req);
        if (fp) {
          let fpBucket = this.fingerprintBuckets.get(fp);
          if (!fpBucket) {
            fpBucket = new TokenBucket({
              capacity: this.fingerprintCapacity,
              refillRatePerSec: this.fingerprintRefillPerSec,
            });
            this.fingerprintBuckets.set(fp, fpBucket);
          }

          if (!fpBucket.tryConsume(1)) {
            const retryAfter = fpBucket.getResetTimeSec() || 15;
            res.setHeader('Retry-After', String(retryAfter));

            logAuditEvent({
              type: 'FINGERPRINT_BUCKET_EXHAUSTED',
              userId: req.user ? req.user.id : 'ANONYMOUS',
              role: req.user ? req.user.role : 'ANONYMOUS',
              reqId: req.id || 'N/A',
              ip,
              target: req.originalUrl,
              action: req.method,
              result: 'BLOCKED_FINGERPRINT',
              metadata: { limitType: this.name, fingerprint: fp, retryAfter },
            });

            return res.status(429).json({
              error: 'Too many requests targeting this account or email. Please wait before retrying.',
              reference: req.id,
              retryAfter,
              limitType: 'TARGET_FINGERPRINT',
            });
          }
        }
      }

      // Record successful consumption into sustained window
      timestamps.push(now);
      this.ipSustainedHits.set(ip, timestamps);

      // Populate RFC rate limit headers
      res.setHeader('X-RateLimit-Limit', String(this.sustainedMax));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, burstBucket.getAvailableTokens())));
      res.setHeader('X-RateLimit-Reset', String(burstBucket.getResetTimeSec()));

      next();
    };
  }

  resetAll() {
    this.ipBurstBuckets.clear();
    this.ipSustainedHits.clear();
    this.fingerprintBuckets.clear();
    this.jailedIps.clear();
    this.violationCounts.clear();
    this.globalBucket.reset();
  }
}

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
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const now = Date.now();
      const cutoff = now - this.windowMs;

      let timestamps = this.hits.get(ip) || [];
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

// ─── ADMINISTRATIVE / AUTHENTICATION LIMITERS ───────────────────
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

// ─── TICKET SYSTEM REQUEST BUCKET LISTS ─────────────────────────

// Ticket Submission Bucket (POST /api/public/tickets)
// Burst capacity: 6 tokens, Refill: 0.5/sec; Sustained: 15 per 15 min; Fingerprint: 4 per email
export const ticketSubmissionBucketManager = new HierarchicalRequestBucketList({
  name: 'TICKET_SUBMISSION',
  burstCapacity: 6,
  burstRefillPerSec: 0.5,
  sustainedMax: 15,
  sustainedWindowMs: 15 * 60 * 1000,
  fingerprintCapacity: 4,
  fingerprintRefillPerSec: 0.05,
  globalCapacity: 120,
  globalRefillPerSec: 2.0,
  jailDurationMs: 10 * 60 * 1000,
  maxViolationsBeforeJail: 3,
  errorMessage: 'Too many ticket submissions from this origin. Please wait before submitting another ticket.',
  extractFingerprint: (req) => {
    const email = req.body?.email;
    return email && typeof email === 'string' ? `ticket_email:${email.trim().toLowerCase()}` : null;
  },
});
export const ticketSubmissionBucket = ticketSubmissionBucketManager.middleware();

// Ticket Status Tracking Bucket (POST /api/public/ticket-status)
// Configured to allow 15 status lookups (matching test requirements) with fast refill
export const ticketTrackingBucketManager = new HierarchicalRequestBucketList({
  name: 'TICKET_TRACKING',
  burstCapacity: 15,
  burstRefillPerSec: 1.0,
  sustainedMax: 15,
  sustainedWindowMs: 15 * 60 * 1000,
  fingerprintCapacity: 15,
  fingerprintRefillPerSec: 1.0,
  globalCapacity: 300,
  globalRefillPerSec: 10.0,
  jailDurationMs: 10 * 60 * 1000,
  maxViolationsBeforeJail: 4,
  errorMessage: 'Too many ticket status requests. Please wait before retrying.',
  extractFingerprint: (req) => {
    const id = req.body?.ticketId || req.body?.ticket_id;
    return id && typeof id === 'string' ? `ticket_track:${id.trim().toUpperCase()}` : null;
  },
});
export const ticketTrackingRateLimiter = ticketTrackingBucketManager.middleware();

// ─── MESSAGE / ENQUIRY SYSTEM REQUEST BUCKET LIST ───────────────

// Message & Enquiry Submission Bucket (POST /api/public/enquiries)
// Burst capacity: 5 tokens, Refill: 0.5/sec; Sustained: 15 per 15 min; Fingerprint: 4 per email
export const messageSubmissionBucketManager = new HierarchicalRequestBucketList({
  name: 'MESSAGE_SUBMISSION',
  burstCapacity: 5,
  burstRefillPerSec: 0.5,
  sustainedMax: 15,
  sustainedWindowMs: 15 * 60 * 1000,
  fingerprintCapacity: 4,
  fingerprintRefillPerSec: 0.05,
  globalCapacity: 120,
  globalRefillPerSec: 2.0,
  jailDurationMs: 10 * 60 * 1000,
  maxViolationsBeforeJail: 3,
  errorMessage: 'Too many message submissions from this origin. Please wait before submitting another enquiry.',
  extractFingerprint: (req) => {
    const email = req.body?.email;
    return email && typeof email === 'string' ? `msg_email:${email.trim().toLowerCase()}` : null;
  },
});
export const messageSubmissionBucket = messageSubmissionBucketManager.middleware();

// Backward-compatible alias for existing imports
export const publicSubmissionRateLimiter = ticketSubmissionBucket;

export function resetAllRateLimiters() {
  loginLimiterInstance.resetHits();
  mfaLimiterInstance.resetHits();
  apiLimiterInstance.resetHits();
  sensitiveOpsLimiterInstance.resetHits();
  ticketTrackingBucketManager.resetAll();
  ticketSubmissionBucketManager.resetAll();
  messageSubmissionBucketManager.resetAll();
}

