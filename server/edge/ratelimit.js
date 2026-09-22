/** In-memory, per-isolate request buckets (anti-DoS / anti-brute-force). */

// ─── EDGE TOKEN BUCKET & ANTI-DOS REQUEST BUCKET LIST ─────────
export class EdgeTokenBucket {
  constructor(capacity, refillRatePerSec, initialTokens) {
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

export class EdgeRequestBucketManager {
  constructor(options = {}) {
    this.name = options.name || 'EDGE_BUCKET';
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
    this.errorMessage = options.errorMessage || 'Too many requests. Please wait before retrying.';

    this.globalBucket = new EdgeTokenBucket(this.globalCapacity, this.globalRefillPerSec);
    this.ipBurstBuckets = new Map();
    this.ipSustainedHits = new Map();
    this.fingerprintBuckets = new Map();
    this.jailedIps = new Map();
    this.violationCounts = new Map();
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
      this.jailedIps.set(ip, now + this.jailDurationMs);
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

  checkLimit(ip, fingerprint) {
    const now = Date.now();

    // 1. IP Penalty Jail
    if (this.isJailed(ip)) {
      const unjailAt = this.jailedIps.get(ip);
      const retryAfter = Math.max(1, Math.ceil((unjailAt - now) / 1000));
      return {
        allowed: false,
        status: 429,
        error: 'IP address temporarily restricted due to repetitive DoS traffic spikes. Please wait before retrying.',
        limitType: 'PENALTY_JAIL',
        retryAfter,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': '0',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(retryAfter),
        }
      };
    }

    // 2. Global Circuit Breaker (System Volumetric Defense)
    if (!this.globalBucket.tryConsume(1)) {
      const retryAfter = this.globalBucket.getResetTimeSec() || 2;
      return {
        allowed: false,
        status: 429,
        error: 'Platform is receiving unusually high traffic volume. Please retry momentarily.',
        limitType: 'GLOBAL_BREAKER',
        retryAfter,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(this.globalCapacity),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(retryAfter),
        }
      };
    }

    // 3. Client IP Burst Token Bucket (Sub-second burst throttling)
    let burstBucket = this.ipBurstBuckets.get(ip);
    if (!burstBucket) {
      burstBucket = new EdgeTokenBucket(this.burstCapacity, this.burstRefillPerSec);
      this.ipBurstBuckets.set(ip, burstBucket);
    }

    if (!burstBucket.tryConsume(1)) {
      this.recordViolation(ip);
      const retryAfter = burstBucket.getResetTimeSec() || 2;
      return {
        allowed: false,
        status: 429,
        error: 'Too many rapid requests. Burst rate limit exceeded. Please wait a moment.',
        limitType: 'BURST_BUCKET',
        retryAfter,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(this.burstCapacity),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(retryAfter),
        }
      };
    }

    // 4. Client IP Sustained Window (Resource depletion / quota limiting)
    const cutoff = now - this.sustainedWindowMs;
    let timestamps = this.ipSustainedHits.get(ip) || [];
    timestamps = timestamps.filter((t) => t > cutoff);

    if (timestamps.length >= this.sustainedMax) {
      this.recordViolation(ip);
      const retryAfter = Math.max(1, Math.ceil((timestamps[0] + this.sustainedWindowMs - now) / 1000));
      return {
        allowed: false,
        status: 429,
        error: this.errorMessage,
        limitType: 'SUSTAINED_QUOTA',
        retryAfter,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(this.sustainedMax),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(retryAfter),
        }
      };
    }

    // 5. Target Fingerprint Bucket (Anti-Distributed DDoS)
    if (fingerprint) {
      let fpBucket = this.fingerprintBuckets.get(fingerprint);
      if (!fpBucket) {
        fpBucket = new EdgeTokenBucket(this.fingerprintCapacity, this.fingerprintRefillPerSec);
        this.fingerprintBuckets.set(fingerprint, fpBucket);
      }

      if (!fpBucket.tryConsume(1)) {
        const retryAfter = fpBucket.getResetTimeSec() || 15;
        return {
          allowed: false,
          status: 429,
          error: 'Too many requests targeting this account or email. Please wait before retrying.',
          limitType: 'TARGET_FINGERPRINT',
          retryAfter,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(this.fingerprintCapacity),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(retryAfter),
          }
        };
      }
    }

    // Record usage
    timestamps.push(now);
    this.ipSustainedHits.set(ip, timestamps);

    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': String(this.sustainedMax),
        'X-RateLimit-Remaining': String(Math.max(0, burstBucket.getAvailableTokens())),
        'X-RateLimit-Reset': String(burstBucket.getResetTimeSec()),
      }
    };
  }
}

// Edge Bucket Managers for Tickets and Messages
export const edgeTicketSubmissionBucket = new EdgeRequestBucketManager({
  name: 'EDGE_TICKET_SUBMISSION',
  burstCapacity: 6,
  burstRefillPerSec: 0.5,
  sustainedMax: 15,
  sustainedWindowMs: 15 * 60 * 1000,
  fingerprintCapacity: 4,
  fingerprintRefillPerSec: 0.05,
  globalCapacity: 120,
  globalRefillPerSec: 2.0,
  errorMessage: 'Too many ticket submissions from this origin. Please wait before submitting another ticket.',
});

export const edgeTicketTrackingBucket = new EdgeRequestBucketManager({
  name: 'EDGE_TICKET_TRACKING',
  burstCapacity: 15,
  burstRefillPerSec: 1.0,
  sustainedMax: 15,
  sustainedWindowMs: 15 * 60 * 1000,
  fingerprintCapacity: 15,
  fingerprintRefillPerSec: 1.0,
  globalCapacity: 300,
  globalRefillPerSec: 10.0,
  errorMessage: 'Too many ticket status requests. Please wait before retrying.',
});

export const edgeMessageSubmissionBucket = new EdgeRequestBucketManager({
  name: 'EDGE_MESSAGE_SUBMISSION',
  burstCapacity: 5,
  burstRefillPerSec: 0.5,
  sustainedMax: 15,
  sustainedWindowMs: 15 * 60 * 1000,
  fingerprintCapacity: 4,
  fingerprintRefillPerSec: 0.05,
  globalCapacity: 100,
  globalRefillPerSec: 2.0,
  errorMessage: 'Too many enquiries from this origin. Please wait before submitting another message.',
});

// Login brute-force protection: per-IP bursts plus a per-username fingerprint bucket.
export const edgeLoginBucket = new EdgeRequestBucketManager({
  name: 'EDGE_LOGIN',
  burstCapacity: 5,
  burstRefillPerSec: 0.2,
  sustainedMax: 20,
  sustainedWindowMs: 15 * 60 * 1000,
  fingerprintCapacity: 6,
  fingerprintRefillPerSec: 0.02,
  globalCapacity: 200,
  globalRefillPerSec: 3.0,
  maxViolationsBeforeJail: 3,
  errorMessage: 'Too many sign-in attempts. Please wait before trying again.',
});

