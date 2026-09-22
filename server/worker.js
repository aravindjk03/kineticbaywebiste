/**
 * Cloudflare Worker for Kinetic Bay / KB NEXUS
 *
 * Serves the SPA (ASSETS) and every /api/* endpoint. All state lives in the
 * DB_KV namespace; nothing sensitive lives in source code.
 *
 * Required configuration (see scripts/cms-bootstrap.mjs and wrangler.jsonc):
 *   SESSION_SECRET  (secret) — HMAC key for sessions, MFA challenges and CSRF tokens
 *   BREVO_API_KEY   (secret) — transactional email (optional; mail is skipped without it)
 *   MAIL_FROM, MAIL_NOTIFY_TO, SITE_URL, CMS_ROUTE (vars)
 * CMS accounts are provisioned into KV by `npm run cms:bootstrap`.
 */

import {
  hashPassword, verifyPassword, passwordProblem, signToken, verifyToken, hmac,
  verifyTotp, newTotpSecret, otpauthUrl, sha256Hex, randomToken, safeEqual,
} from './edge/crypto.js';
import {
  edgeTicketSubmissionBucket, edgeTicketTrackingBucket, edgeMessageSubmissionBucket, edgeLoginBucket,
} from './edge/ratelimit.js';
import {
  notifyStaffNewTicket, notifyCustomerTicketReceived, notifyCustomerTicketUpdate, notifyCustomerTicketStatus,
  notifyStaffNewEnquiry, sendTestEmail, mailConfigured, internalAddress,
} from './edge/email.js';

/* ═══════════════════════════════════════════════════════════
   Roles & permissions
═══════════════════════════════════════════════════════════ */

const ROLE_PERMISSIONS = {
  super_admin: [
    'content:read', 'content:create', 'content:update', 'content:delete', 'content:publish', 'content:submit',
    'users:read', 'users:create', 'users:update', 'users:disable', 'security:read', 'security:update',
    'cms-route:update', 'tickets:read', 'tickets:create', 'tickets:update', 'tickets:assign', 'tickets:delete',
    'enquiries:read', 'enquiries:update', 'enquiries:delete', 'analytics:read', 'audit:read', 'settings:update',
  ],
  admin: [
    'content:read', 'content:create', 'content:update', 'content:delete', 'content:publish', 'content:submit',
    'users:read', 'users:create', 'users:update', 'security:read', 'tickets:read', 'tickets:create',
    'tickets:update', 'tickets:assign', 'tickets:delete', 'enquiries:read', 'enquiries:update', 'enquiries:delete',
    'analytics:read', 'audit:read', 'settings:update',
  ],
  marketing: [
    'content:read', 'content:create', 'content:update', 'content:submit',
    'tickets:read', 'tickets:create', 'tickets:update', 'enquiries:read', 'enquiries:update', 'analytics:read',
  ],
};
const ROLES = Object.keys(ROLE_PERMISSIONS);

const TICKET_STATUSES = ['NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent', 'critical'];
const TICKET_CATEGORIES = ['technical_support', 'project_enquiry', 'consultation', 'bug_report', 'billing', 'feature_request', 'integration', 'general_inquiry', 'security'];
const ENQUIRY_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST'];
const CONTENT_STATUSES = ['draft', 'submitted', 'review', 'approved', 'published'];

const DEFAULT_CMS_ROUTE = 'cms_e2b9c7a104f6d5e8237b1c4a9f8e0d35';
const SESSION_TTL = 8 * 60 * 60 * 1000;
const MFA_TTL = 5 * 60 * 1000;

// Demo records the old worker seeded into KV; they are dropped on read.
const LEGACY_SEED_IDS = new Set(['tkt_seed_01', 'enq_seed_01']);

/* ═══════════════════════════════════════════════════════════
   KV storage
═══════════════════════════════════════════════════════════ */

const KEYS = {
  users: 'kb_users_v2',
  tickets: 'kb_tickets_v1',
  enquiries: 'kb_enquiries_v1',
  content: 'kb_content_v1',
  team: 'kb_team_v1',
  audit: 'kb_audit_v1',
  settings: 'kb_settings_v1',
  analytics: 'kb_analytics_v1',
};

async function kvGet(env, key, fallback) {
  if (!env.DB_KV) return fallback;
  const raw = await env.DB_KV.get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

async function kvPut(env, key, value) {
  if (!env.DB_KV) throw new Error('Storage unavailable (DB_KV binding missing).');
  await env.DB_KV.put(key, JSON.stringify(value));
}

const getUsers = (env) => kvGet(env, KEYS.users, []);
const saveUsers = (env, users) => kvPut(env, KEYS.users, users);

async function getTickets(env) {
  const list = await kvGet(env, KEYS.tickets, []);
  return Array.isArray(list) ? list.filter((t) => !LEGACY_SEED_IDS.has(t.id)) : [];
}
const saveTickets = (env, list) => kvPut(env, KEYS.tickets, list);

async function getEnquiries(env) {
  const list = await kvGet(env, KEYS.enquiries, []);
  return Array.isArray(list) ? list.filter((e) => !LEGACY_SEED_IDS.has(e.id)) : [];
}
const saveEnquiries = (env, list) => kvPut(env, KEYS.enquiries, list);

async function getSettings(env) {
  const s = await kvGet(env, KEYS.settings, {});
  return { cmsRoute: s.cmsRoute || env.CMS_ROUTE || DEFAULT_CMS_ROUTE, ...s };
}

/* ═══════════════════════════════════════════════════════════
   HTTP helpers
═══════════════════════════════════════════════════════════ */

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...API_HEADERS, ...headers } });
}

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((c) => {
    const i = c.indexOf('=');
    if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}

const clientIp = (req) => req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '127.0.0.1';

async function readJson(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const text = await req.text();
  if (!text) return {};
  if (text.length > 64 * 1024) throw new HttpError(413, 'Request body too large.');
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'Malformed JSON body.'); }
}

const str = (v, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isEmail = (v) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(v || '');
const nowIso = () => new Date().toISOString();
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${randomToken(6)}`;

function publicUser(u) {
  return {
    id: u.id, username: u.username, email: u.email, name: u.name, role: u.role,
    status: u.status, mfaEnabled: Boolean(u.totpSecret), createdAt: u.createdAt,
  };
}

function sessionUser(u) {
  return { id: u.id, username: u.username, email: u.email, name: u.name, role: u.role, permissions: ROLE_PERMISSIONS[u.role] || [] };
}

/* ═══════════════════════════════════════════════════════════
   Request context: auth, CSRF, audit
═══════════════════════════════════════════════════════════ */

function requireSecret(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    throw new HttpError(503, 'CMS authentication is not configured on the server (SESSION_SECRET missing).');
  }
  return env.SESSION_SECRET;
}

function sessionCookie(req, token, maxAgeSec) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `kb_cms_sess=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secure}`;
}

async function issueSession(req, env, user) {
  const secret = requireSecret(env);
  const token = await signToken(secret, 'sess', { u: user.id, sv: user.sessionVersion || 0, exp: Date.now() + SESSION_TTL });
  const csrfToken = await hmac(secret, `csrf.${token}`);
  return { cookie: sessionCookie(req, token, SESSION_TTL / 1000), csrfToken };
}

async function loadSession(req, env) {
  const token = parseCookies(req.headers.get('cookie')).kb_cms_sess;
  if (!token || !env.SESSION_SECRET) return null;
  const payload = await verifyToken(env.SESSION_SECRET, 'sess', token);
  if (!payload) return null;
  const users = await getUsers(env);
  const user = users.find((u) => u.id === payload.u);
  // disabled accounts and password changes invalidate existing sessions immediately
  if (!user || user.status !== 'active' || (user.sessionVersion || 0) !== payload.sv) return null;
  return { user, token };
}

function makeCtx(req, env, ctx) {
  const reqId = 'REQ-' + randomToken(6).toUpperCase();
  const c = {
    req, env, ctx, reqId,
    ip: clientIp(req),
    ua: (req.headers.get('user-agent') || '').slice(0, 200),
    session: null,
    async auth(permission) {
      if (!c.session) c.session = await loadSession(req, env);
      if (!c.session) throw new HttpError(401, 'Authentication required. Please sign in again.');
      const perms = ROLE_PERMISSIONS[c.session.user.role] || [];
      if (permission && !perms.includes(permission)) {
        await c.audit('ACCESS_DENIED', permission, 'DENIED');
        throw new HttpError(403, 'You do not have permission to perform this action.');
      }
      // CSRF: every state-changing call must echo the token bound to this session
      if (!['GET', 'HEAD'].includes(req.method)) {
        const expected = await hmac(env.SESSION_SECRET, `csrf.${c.session.token}`);
        if (!safeEqual(req.headers.get('x-csrf-token') || '', expected)) {
          throw new HttpError(403, 'Security token expired. Please refresh the page.');
        }
      }
      return c.session.user;
    },
    async audit(type, target, result = 'SUCCESS', metadata = {}) {
      const u = c.session && c.session.user;
      const entry = {
        id: newId('aud'), type, timestamp: nowIso(), userId: u ? u.username : (metadata.username || 'anonymous'),
        role: u ? u.role : 'public', reqId, ip: c.ip, userAgent: c.ua, target: String(target || ''), action: type, result, metadata,
      };
      try {
        const logs = await kvGet(env, KEYS.audit, []);
        logs.unshift(entry);
        await kvPut(env, KEYS.audit, logs.slice(0, 500));
      } catch { /* auditing must never break the request */ }
    },
    // run work after the response is sent (emails, audit of async results)
    later(promise) {
      if (ctx && ctx.waitUntil) ctx.waitUntil(promise);
    },
  };
  return c;
}

/** Fire an email in the background and audit the outcome. */
function mail(c, label, target, sendPromiseFactory) {
  if (!mailConfigured(c.env)) return;
  c.later((async () => {
    const r = await sendPromiseFactory();
    await c.audit(r.ok ? 'EMAIL_SENT' : 'EMAIL_FAILED', target, r.ok ? 'SUCCESS' : 'FAILED', { label, status: r.status, error: r.error });
  })());
}

function limited(check) {
  if (check.allowed) return null;
  return json({ error: check.error, retryAfter: check.retryAfter, limitType: check.limitType }, 429, check.headers);
}

/* ═══════════════════════════════════════════════════════════
   Analytics (buffered per isolate to respect KV write limits)
═══════════════════════════════════════════════════════════ */

const emptyAnalytics = () => ({ totalVisits: 0, uniqueVisitors: 0, pageViews: {}, dailyVisits: [], deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 }, recentVisits: [], since: nowIso() });
let pendingVisits = [];
let lastFlush = 0;

async function flushAnalytics(env) {
  if (!pendingVisits.length) return;
  const batch = pendingVisits;
  pendingVisits = [];
  lastFlush = Date.now();
  const a = await kvGet(env, KEYS.analytics, emptyAnalytics());
  for (const v of batch) {
    a.totalVisits += 1;
    if (v.isNew) a.uniqueVisitors += 1;
    a.pageViews[v.path] = (a.pageViews[v.path] || 0) + 1;
    const day = v.timestamp.slice(0, 10);
    const d = a.dailyVisits.find((x) => x.date === day);
    if (d) d.count += 1; else a.dailyVisits.push({ date: day, count: 1 });
    a.deviceBreakdown[v.deviceType] = (a.deviceBreakdown[v.deviceType] || 0) + 1;
    a.recentVisits.unshift(v);
  }
  a.dailyVisits = a.dailyVisits.sort((x, y) => x.date.localeCompare(y.date)).slice(-60);
  a.recentVisits = a.recentVisits.slice(0, 50);
  // cap the number of distinct paths so junk URLs cannot bloat the record
  const paths = Object.entries(a.pageViews).sort((x, y) => y[1] - x[1]).slice(0, 80);
  a.pageViews = Object.fromEntries(paths);
  await kvPut(env, KEYS.analytics, a);
}

/* ═══════════════════════════════════════════════════════════
   Route handlers
═══════════════════════════════════════════════════════════ */

async function handleApi(c) {
  const { req, env } = c;
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = req.method;
  const seg = path.split('/').filter(Boolean).slice(1); // drop "api"
  const body = await readJson(req);

  /* ─── CMS route resolution ─────────────────────────── */
  if (path === '/api/security/resolve-route' && method === 'POST') {
    const settings = await getSettings(env);
    const segment = str(body.pathSegment, 200).replace(/^\//, '');
    return json({ valid: Boolean(segment) && safeEqual(segment, settings.cmsRoute), requiresAuth: true });
  }

  /* ─── Authentication ───────────────────────────────── */
  if (path === '/api/auth/login' && method === 'POST') {
    const secret = requireSecret(env);
    const username = str(body.username || body.email, 190).toLowerCase();
    const blocked = limited(edgeLoginBucket.checkLimit(c.ip, username ? `login:${username}` : null));
    if (blocked) return blocked;
    const users = await getUsers(env);
    if (!users.length) throw new HttpError(503, 'No CMS accounts are provisioned yet. Run the bootstrap script.');
    const user = users.find((u) => u.username === username || u.email.toLowerCase() === username);
    const ok = user && user.status === 'active' && await verifyPassword(String(body.password || ''), user.passwordHash);
    if (!ok) {
      await c.audit('LOGIN_FAILED', username || 'unknown', 'FAILED', { username });
      throw new HttpError(401, 'Invalid username or password.');
    }
    const mfaToken = await signToken(secret, 'mfa', { u: user.id, exp: Date.now() + MFA_TTL });
    return json({ mfaRequired: true, mfaToken, user: { username: user.username, role: user.role } });
  }

  if (path === '/api/auth/mfa-verify' && method === 'POST') {
    const secret = requireSecret(env);
    const blocked = limited(edgeLoginBucket.checkLimit(c.ip, null));
    if (blocked) return blocked;
    const challenge = await verifyToken(secret, 'mfa', str(body.mfaToken, 2000));
    if (!challenge) throw new HttpError(401, 'Sign-in challenge expired. Please enter your password again.');
    const users = await getUsers(env);
    const user = users.find((u) => u.id === challenge.u);
    if (!user || user.status !== 'active') throw new HttpError(401, 'Account unavailable.');

    const code = str(body.code, 40).replace(/\s/g, '');
    let method2 = null;
    const step = user.totpSecret ? await verifyTotp(user.totpSecret, code) : null;
    if (step !== null && step > (user.lastTotpStep || 0)) {
      user.lastTotpStep = step;
      method2 = 'totp';
    } else if (/^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(code)) {
      const h = await sha256Hex(code.toUpperCase().replace('-', ''));
      const idx = (user.recoveryHashes || []).indexOf(h);
      if (idx >= 0) {
        user.recoveryHashes.splice(idx, 1); // single use
        method2 = 'recovery';
      }
    }
    if (!method2) {
      await c.audit('MFA_FAILED', user.username, 'FAILED', { username: user.username });
      throw new HttpError(401, 'Invalid authenticator or recovery code.');
    }
    user.lastLoginAt = nowIso();
    await saveUsers(env, users);
    const { cookie, csrfToken } = await issueSession(req, env, user);
    c.session = { user, token: '' };
    await c.audit('LOGIN_SUCCESS', user.username, 'SUCCESS', { method: method2, recoveryCodesLeft: (user.recoveryHashes || []).length });
    return json({ success: true, user: sessionUser(user), csrfToken, recoveryCodesLeft: (user.recoveryHashes || []).length }, 200, { 'Set-Cookie': cookie });
  }

  if (path === '/api/auth/me' && method === 'GET') {
    const s = await loadSession(req, env);
    if (!s) return json({ error: 'Not signed in.' }, 401);
    const csrfToken = await hmac(env.SESSION_SECRET, `csrf.${s.token}`);
    return json({ user: sessionUser(s.user), csrfToken });
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    const s = await loadSession(req, env);
    if (s) { c.session = s; await c.audit('LOGOUT', s.user.username); }
    return json({ success: true }, 200, { 'Set-Cookie': sessionCookie(req, '', 0) });
  }

  if (path === '/api/auth/change-password' && method === 'POST') {
    const me = await c.auth();
    const users = await getUsers(env);
    const user = users.find((u) => u.id === me.id);
    if (!await verifyPassword(String(body.currentPassword || ''), user.passwordHash)) {
      await c.audit('PASSWORD_CHANGE', me.username, 'FAILED');
      throw new HttpError(401, 'Current password is incorrect.');
    }
    const problem = passwordProblem(body.newPassword);
    if (problem) throw new HttpError(400, problem);
    user.passwordHash = await hashPassword(body.newPassword);
    user.sessionVersion = (user.sessionVersion || 0) + 1; // sign out every other session
    await saveUsers(env, users);
    const { cookie, csrfToken } = await issueSession(req, env, user);
    await c.audit('PASSWORD_CHANGE', me.username);
    return json({ success: true, csrfToken }, 200, { 'Set-Cookie': cookie });
  }

  /* ─── Users & staff ────────────────────────────────── */
  if (path === '/api/staff' && method === 'GET') {
    await c.auth('tickets:read');
    const users = await getUsers(env);
    return json({ staff: users.filter((u) => u.status === 'active').map((u) => ({ id: u.id, name: u.name, role: u.role })) });
  }

  if (seg[0] === 'users') {
    if (seg.length === 1 && method === 'GET') {
      await c.auth('users:read');
      return json({ users: (await getUsers(env)).map(publicUser) });
    }
    if (seg.length === 1 && method === 'POST') {
      const me = await c.auth('users:create');
      const username = str(body.username, 40).toLowerCase();
      const email = str(body.email, 190).toLowerCase();
      const name = str(body.name, 80);
      const role = str(body.role, 20);
      if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new HttpError(400, 'Username must be 3–40 characters: letters, numbers, dot, dash or underscore.');
      if (!isEmail(email)) throw new HttpError(400, 'A valid email is required.');
      if (!name) throw new HttpError(400, 'Name is required.');
      if (!ROLES.includes(role)) throw new HttpError(400, 'Unknown role.');
      if (role === 'super_admin' && me.role !== 'super_admin') throw new HttpError(403, 'Only a Super Admin can create another Super Admin.');
      const problem = passwordProblem(body.initialPassword);
      if (problem) throw new HttpError(400, problem);
      const users = await getUsers(env);
      if (users.some((u) => u.username === username || u.email === email)) throw new HttpError(409, 'That username or email already exists.');
      const totpSecret = newTotpSecret();
      const recovery = Array.from({ length: 6 }, () => randomToken(6).replace(/[^A-Za-z0-9]/g, 'X').slice(0, 8).toUpperCase());
      const user = {
        id: newId('usr'), username, email, name, role, status: 'active',
        passwordHash: await hashPassword(body.initialPassword), totpSecret,
        recoveryHashes: await Promise.all(recovery.map((r) => sha256Hex(r))), sessionVersion: 0, createdAt: nowIso(),
      };
      users.push(user);
      await saveUsers(env, users);
      await c.audit('USER_CREATED', username, 'SUCCESS', { role });
      return json({
        success: true, user: publicUser(user),
        mfaSetup: { secret: totpSecret, otpauthUrl: otpauthUrl(totpSecret, username) },
        recoveryCodes: recovery.map((r) => `${r.slice(0, 4)}-${r.slice(4)}`),
      }, 201);
    }
    if (seg.length === 3 && method === 'PATCH') {
      const users = await getUsers(env);
      const target = users.find((u) => u.id === seg[1]);
      if (!target) throw new HttpError(404, 'User not found.');
      if (seg[2] === 'role') {
        const me = await c.auth('users:update');
        const role = str(body.newRole || body.role, 20);
        if (!ROLES.includes(role)) throw new HttpError(400, 'Unknown role.');
        if (target.id === me.id) throw new HttpError(400, 'You cannot change your own role.');
        if ((role === 'super_admin' || target.role === 'super_admin') && me.role !== 'super_admin') throw new HttpError(403, 'Only a Super Admin can change Super Admin roles.');
        target.role = role;
        target.sessionVersion = (target.sessionVersion || 0) + 1;
        await saveUsers(env, users);
        await c.audit('USER_ROLE_CHANGED', target.username, 'SUCCESS', { role });
        return json({ success: true, user: publicUser(target) });
      }
      if (seg[2] === 'status') {
        const me = await c.auth('users:update');
        const status = str(body.status, 10);
        if (!['active', 'disabled'].includes(status)) throw new HttpError(400, 'Status must be active or disabled.');
        if (target.id === me.id) throw new HttpError(400, 'You cannot disable your own account.');
        if (target.role === 'super_admin' && me.role !== 'super_admin') throw new HttpError(403, 'Only a Super Admin can disable a Super Admin.');
        if (status === 'disabled' && target.role === 'super_admin' && users.filter((u) => u.role === 'super_admin' && u.status === 'active').length <= 1) {
          throw new HttpError(400, 'At least one active Super Admin must remain.');
        }
        target.status = status;
        target.sessionVersion = (target.sessionVersion || 0) + 1;
        await saveUsers(env, users);
        await c.audit('USER_STATUS_CHANGED', target.username, 'SUCCESS', { status });
        return json({ success: true, user: publicUser(target) });
      }
    }
  }

  /* ─── Content workflow ─────────────────────────────── */
  if (seg[0] === 'content') {
    const items = await kvGet(env, KEYS.content, []);
    if (seg.length === 1 && method === 'GET') {
      await c.auth('content:read');
      const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
      return json({ items: includeDeleted ? items : items.filter((i) => !i.deleted_at) });
    }
    if (seg.length === 1 && method === 'POST') {
      const me = await c.auth('content:create');
      const title = str(body.title, 160);
      const slug = str(body.slug, 80).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
      if (!title || !slug) throw new HttpError(400, 'Title and slug are required.');
      if (items.some((i) => i.slug === slug && !i.deleted_at)) throw new HttpError(409, 'That slug is already in use.');
      const item = {
        id: newId('cnt'), title, slug, category: str(body.category, 40) || 'homepage', status: 'draft',
        content: str(body.content, 20000), version: 1, authorId: me.id, reviewerId: null,
        deleted_at: null, deleted_by: null, deletion_reason: null, created_at: nowIso(), updated_at: nowIso(),
      };
      items.unshift(item);
      await kvPut(env, KEYS.content, items);
      await c.audit('CONTENT_CREATED', slug);
      return json({ success: true, item }, 201);
    }
    const item = items.find((i) => i.id === seg[1]);
    if (seg[1] && !item) throw new HttpError(404, 'Content item not found.');
    if (seg.length === 2 && method === 'PUT') {
      await c.auth('content:update');
      if (item.deleted_at) throw new HttpError(400, 'Restore this item before editing it.');
      if (body.title !== undefined) item.title = str(body.title, 160) || item.title;
      if (body.category !== undefined) item.category = str(body.category, 40) || item.category;
      if (body.content !== undefined) item.content = str(body.content, 20000);
      item.version += 1;
      if (item.status === 'published' || item.status === 'approved') item.status = 'draft'; // edits need re-approval
      item.updated_at = nowIso();
      await kvPut(env, KEYS.content, items);
      await c.audit('CONTENT_UPDATED', item.slug, 'SUCCESS', { version: item.version });
      return json({ success: true, item });
    }
    if (seg.length === 3 && seg[2] === 'transition' && method === 'POST') {
      const target = str(body.targetStatus, 20);
      if (!CONTENT_STATUSES.includes(target)) throw new HttpError(400, 'Unknown workflow status.');
      const needs = target === 'submitted' ? 'content:submit' : target === 'draft' ? 'content:update' : 'content:publish';
      const me = await c.auth(needs);
      const allowed = { draft: ['submitted'], submitted: ['review', 'draft'], review: ['approved', 'draft'], approved: ['published', 'draft'], published: ['draft'] };
      if (!(allowed[item.status] || []).includes(target)) throw new HttpError(400, `Cannot move from ${item.status} to ${target}.`);
      if (target === 'approved' && item.authorId === me.id && me.role !== 'super_admin') throw new HttpError(403, 'Authors cannot approve their own content.');
      item.status = target;
      if (target === 'review' || target === 'approved') item.reviewerId = me.id;
      item.updated_at = nowIso();
      await kvPut(env, KEYS.content, items);
      await c.audit('CONTENT_TRANSITION', item.slug, 'SUCCESS', { to: target });
      return json({ success: true, item });
    }
    if (seg.length === 2 && method === 'DELETE') {
      const me = await c.auth('content:delete');
      item.deleted_at = nowIso();
      item.deleted_by = me.id;
      item.deletion_reason = str(body.reason, 300) || null;
      await kvPut(env, KEYS.content, items);
      await c.audit('CONTENT_DELETED', item.slug);
      return json({ success: true });
    }
    if (seg.length === 3 && seg[2] === 'restore' && method === 'POST') {
      await c.auth('content:delete');
      item.deleted_at = null; item.deleted_by = null; item.deletion_reason = null; item.updated_at = nowIso();
      await kvPut(env, KEYS.content, items);
      await c.audit('CONTENT_RESTORED', item.slug);
      return json({ success: true, item });
    }
  }

  if (path === '/api/public/content' && method === 'GET') {
    const items = await kvGet(env, KEYS.content, []);
    return json({ items: items.filter((i) => i.status === 'published' && !i.deleted_at).map(({ id, title, slug, category, content, updated_at }) => ({ id, title, slug, category, content, updated_at })) }, 200, { 'Cache-Control': 'public, max-age=60' });
  }

  /* ─── Team (server-side so it is shared, not per-browser) ─ */
  if (seg[0] === 'team') {
    const team = await kvGet(env, KEYS.team, []);
    if (seg.length === 1 && method === 'GET') {
      await c.auth('content:read');
      return json({ team });
    }
    if (seg.length === 1 && method === 'POST') {
      await c.auth('content:update');
      const name = str(body.name, 80), role = str(body.role, 80);
      if (!name || !role) throw new HttpError(400, 'Name and role are required.');
      const member = {
        id: newId('team'), name, role, bio: str(body.bio, 600), image: str(body.image, 500), linkedin: str(body.linkedin, 300),
        order: team.length + 1, visible: body.visible !== false, updated_at: nowIso(),
      };
      team.push(member);
      await kvPut(env, KEYS.team, team);
      await c.audit('TEAM_MEMBER_ADDED', name);
      return json({ success: true, member }, 201);
    }
    const member = team.find((m) => m.id === seg[1]);
    if (seg[1] && !member) throw new HttpError(404, 'Team member not found.');
    if (seg.length === 2 && method === 'PUT') {
      await c.auth('content:update');
      for (const k of ['name', 'role', 'bio', 'image', 'linkedin']) if (body[k] !== undefined) member[k] = str(body[k], k === 'bio' ? 600 : 500);
      if (typeof body.visible === 'boolean') member.visible = body.visible;
      member.updated_at = nowIso();
      await kvPut(env, KEYS.team, team);
      await c.audit('TEAM_MEMBER_UPDATED', member.name);
      return json({ success: true, member });
    }
    if (seg.length === 2 && method === 'DELETE') {
      await c.auth('content:delete');
      await kvPut(env, KEYS.team, team.filter((m) => m.id !== member.id));
      await c.audit('TEAM_MEMBER_REMOVED', member.name);
      return json({ success: true });
    }
  }

  if (path === '/api/public/team' && method === 'GET') {
    const team = await kvGet(env, KEYS.team, []);
    return json({ team: team.filter((m) => m.visible !== false).map(({ id, name, role, bio, image, linkedin }) => ({ id, name, role, bio, image, linkedin })) }, 200, { 'Cache-Control': 'public, max-age=60' });
  }

  /* ─── Public tickets ───────────────────────────────── */
  if (path === '/api/public/tickets' && method === 'POST') {
    const email = str(body.email, 190).toLowerCase();
    const blocked = limited(edgeTicketSubmissionBucket.checkLimit(c.ip, email ? `ticket_email:${email}` : null));
    if (blocked) return blocked;
    const name = str(body.name, 100), subject = str(body.subject, 200), description = str(body.description, 5000);
    if (!name || !subject || !description) throw new HttpError(400, 'Name, email, subject and description are required.');
    if (!isEmail(email)) throw new HttpError(400, 'Please provide a valid email address.');
    const now = nowIso();
    const ticket = {
      id: newId('tkt'), public_id: 'KB-' + randomToken(9).replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase().padEnd(8, '7'),
      requester_name: name, requester_email: email,
      category: TICKET_CATEGORIES.includes(body.category) ? body.category : 'technical_support',
      priority: TICKET_PRIORITIES.includes(body.priority) ? body.priority : 'medium',
      subject, description, status: 'NEW', assigned_to: null, source: 'chatbot',
      created_at: now, updated_at: now, deleted_at: null, deleted_by: null, deletion_reason: null,
      internal_notes: [], customer_updates: [{ id: newId('upd'), message: 'Ticket received and logged into our service queue.', created_at: now }],
    };
    const tickets = await getTickets(env);
    tickets.unshift(ticket);
    await saveTickets(env, tickets);
    await c.audit('TICKET_CREATED_PUBLIC', ticket.public_id, 'SUCCESS', { username: email });
    mail(c, 'staff:new-ticket', ticket.public_id, () => notifyStaffNewTicket(env, ticket, 'Website chatbot'));
    mail(c, 'customer:ticket-received', ticket.public_id, () => notifyCustomerTicketReceived(env, ticket));
    return json({
      success: true,
      message: 'Ticket submitted. Please save your Ticket Reference ID for tracking.',
      emailNotification: mailConfigured(env),
      ticket: {
        public_id: ticket.public_id, requester_email: email, subject, category: ticket.category, priority: ticket.priority,
        status: ticket.status, created_at: now, updated_at: now, customer_updates: ticket.customer_updates,
      },
    }, 201);
  }

  if (path === '/api/public/ticket-status' && method === 'POST') {
    const id = str(body.ticketId || body.ticket_id, 20).toUpperCase();
    const email = str(body.email, 190).toLowerCase();
    const blocked = limited(edgeTicketTrackingBucket.checkLimit(c.ip, id ? `ticket_track:${id}` : null));
    if (blocked) return blocked;
    if (!id || !email) throw new HttpError(400, 'Both the ticket reference and the email used to raise it are required.');
    const t = (await getTickets(env)).find((x) => x.public_id === id && !x.deleted_at);
    if (!t || t.requester_email !== email) throw new HttpError(404, 'No ticket matches that reference and email address.');
    return json({ success: true, ticket: { public_id: t.public_id, subject: t.subject, category: t.category, priority: t.priority, status: t.status, created_at: t.created_at, updated_at: t.updated_at, customer_updates: t.customer_updates || [] } });
  }

  /* ─── CMS tickets ──────────────────────────────────── */
  if (seg[0] === 'tickets') {
    const tickets = await getTickets(env);
    if (seg.length === 1 && method === 'GET') {
      await c.auth('tickets:read');
      const p = url.searchParams;
      const q = (p.get('search') || '').toLowerCase();
      let list = p.get('includeDeleted') === 'true' ? tickets : tickets.filter((t) => !t.deleted_at);
      for (const k of ['status', 'priority', 'category']) {
        const v = p.get(k);
        if (v && v !== 'all') list = list.filter((t) => t[k] === v);
      }
      if (q) list = list.filter((t) => [t.public_id, t.subject, t.requester_name, t.requester_email].some((f) => (f || '').toLowerCase().includes(q)));
      return json({ success: true, count: list.length, tickets: list });
    }
    if (seg.length === 1 && method === 'POST') {
      const me = await c.auth('tickets:create');
      const subject = str(body.subject, 200);
      if (!subject) throw new HttpError(400, 'Ticket subject is required.');
      const email = str(body.email, 190).toLowerCase() || 'customer@kineticbay.internal';
      if (!isEmail(email)) throw new HttpError(400, 'Requester email is not valid.');
      const assignedTo = str(body.assignedTo || body.assigned_to, 60) || null;
      const now = nowIso();
      const note = str(body.initialNote, 3000);
      const ticket = {
        id: newId('tkt'), public_id: 'KB-' + randomToken(9).replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase().padEnd(8, '7'),
        requester_name: str(body.name, 100) || 'Valued Customer', requester_email: email,
        category: TICKET_CATEGORIES.includes(body.category) ? body.category : 'technical_support',
        priority: TICKET_PRIORITIES.includes(body.priority) ? body.priority : 'medium',
        subject, description: str(body.description, 5000) || 'Ticket created from the CMS Service Desk.',
        status: TICKET_STATUSES.includes(body.status) ? body.status : (assignedTo ? 'ASSIGNED' : 'NEW'),
        assigned_to: assignedTo, source: 'cms', created_at: now, updated_at: now, deleted_at: null, deleted_by: null, deletion_reason: null,
        internal_notes: note ? [{ id: newId('note'), author_id: me.id, author_name: me.name, note, created_at: now }] : [],
        customer_updates: [{ id: newId('upd'), message: 'Ticket created and registered in our service queue.', created_at: now }],
      };
      tickets.unshift(ticket);
      await saveTickets(env, tickets);
      await c.audit('TICKET_CREATED', ticket.public_id);
      if (!internalAddress(email)) mail(c, 'customer:ticket-received', ticket.public_id, () => notifyCustomerTicketReceived(env, ticket));
      return json({ success: true, message: `Ticket ${ticket.public_id} created.`, ticket }, 201);
    }

    const key = decodeURIComponent(seg[1] || '').toUpperCase();
    const ticket = tickets.find((t) => t.id.toUpperCase() === key || t.public_id === key);
    if (!ticket) throw new HttpError(404, 'Ticket not found.');
    const action = seg[2] || '';
    const prevStatus = ticket.status;
    const touch = async (auditType, meta = {}) => {
      ticket.updated_at = nowIso();
      await saveTickets(env, tickets);
      await c.audit(auditType, ticket.public_id, 'SUCCESS', meta);
      // tell the customer when their ticket is resolved or closed
      if (ticket.status !== prevStatus && ['RESOLVED', 'CLOSED'].includes(ticket.status) && !internalAddress(ticket.requester_email)) {
        mail(c, 'customer:ticket-status', ticket.public_id, () => notifyCustomerTicketStatus(env, ticket));
      }
    };

    if (!action && method === 'GET') {
      await c.auth('tickets:read');
      return json({ success: true, ticket });
    }
    if ((!action || action === 'update') && (method === 'PATCH' || method === 'PUT')) {
      await c.auth('tickets:update');
      if (str(body.subject, 200)) ticket.subject = str(body.subject, 200);
      if (str(body.description, 5000)) ticket.description = str(body.description, 5000);
      if (TICKET_CATEGORIES.includes(body.category)) ticket.category = body.category;
      if (TICKET_PRIORITIES.includes(body.priority)) ticket.priority = body.priority;
      if (TICKET_STATUSES.includes(body.status)) ticket.status = body.status;
      if ('assignedTo' in body || 'assigned_to' in body) {
        ticket.assigned_to = str(body.assignedTo ?? body.assigned_to, 60) || null;
        if (ticket.status === 'NEW' && ticket.assigned_to) ticket.status = 'ASSIGNED';
      }
      if (str(body.requester_name, 100)) ticket.requester_name = str(body.requester_name, 100);
      if (body.requester_email !== undefined) {
        const e = str(body.requester_email, 190).toLowerCase();
        if (!isEmail(e)) throw new HttpError(400, 'Requester email is not valid.');
        ticket.requester_email = e;
      }
      await touch('TICKET_UPDATED');
      return json({ success: true, message: 'Ticket updated.', ticket });
    }
    if (action === 'status' && method === 'PATCH') {
      await c.auth('tickets:update');
      if (!TICKET_STATUSES.includes(body.status)) throw new HttpError(400, 'Unknown ticket status.');
      ticket.status = body.status;
      await touch('TICKET_STATUS_CHANGED', { from: prevStatus, to: ticket.status });
      return json({ success: true, ticket });
    }
    if (action === 'assign' && method === 'PATCH') {
      await c.auth('tickets:assign');
      const assignee = str(body.assignedTo, 60) || null;
      if (assignee && !(await getUsers(env)).some((u) => u.id === assignee && u.status === 'active')) throw new HttpError(400, 'Assignee is not an active staff member.');
      ticket.assigned_to = assignee;
      if (ticket.status === 'NEW' && assignee) ticket.status = 'ASSIGNED';
      await touch('TICKET_ASSIGNED', { to: assignee });
      return json({ success: true, ticket });
    }
    if (action === 'notes' && method === 'POST') {
      const me = await c.auth('tickets:update');
      const note = str(body.note, 3000);
      if (!note) throw new HttpError(400, 'Note cannot be empty.');
      const n = { id: newId('note'), author_id: me.id, author_name: me.name, note, created_at: nowIso() };
      (ticket.internal_notes = ticket.internal_notes || []).push(n);
      await touch('TICKET_NOTE_ADDED');
      return json({ success: true, note: n });
    }
    if (action === 'customer-update' && method === 'POST') {
      await c.auth('tickets:update');
      const message = str(body.message, 3000);
      if (!message) throw new HttpError(400, 'Update cannot be empty.');
      const u = { id: newId('upd'), message, created_at: nowIso() };
      (ticket.customer_updates = ticket.customer_updates || []).push(u);
      await touch('TICKET_CUSTOMER_UPDATE');
      if (!internalAddress(ticket.requester_email)) mail(c, 'customer:ticket-update', ticket.public_id, () => notifyCustomerTicketUpdate(env, ticket, message));
      return json({ success: true, update: u, emailed: mailConfigured(env) && !internalAddress(ticket.requester_email) });
    }
    if (!action && method === 'DELETE') {
      const me = await c.auth('tickets:delete');
      ticket.deleted_at = nowIso();
      ticket.deleted_by = me.id;
      ticket.deletion_reason = str(body.reason, 300) || null;
      await touch('TICKET_DELETED');
      return json({ success: true, message: 'Ticket archived.' });
    }
    if (action === 'restore' && method === 'POST') {
      await c.auth('tickets:delete');
      ticket.deleted_at = null; ticket.deleted_by = null; ticket.deletion_reason = null;
      await touch('TICKET_RESTORED');
      return json({ success: true, message: 'Ticket restored.' });
    }
  }

  /* ─── Enquiries ────────────────────────────────────── */
  if (path === '/api/public/enquiries' && method === 'POST') {
    const email = str(body.email, 190).toLowerCase();
    const blocked = limited(edgeMessageSubmissionBucket.checkLimit(c.ip, email ? `msg_email:${email}` : null));
    if (blocked) return blocked;
    const name = str(body.name, 100);
    if (!name) throw new HttpError(400, 'Name is required.');
    if (!isEmail(email)) throw new HttpError(400, 'Please provide a valid email address.');
    const now = nowIso();
    const enq = {
      id: newId('enq'), reference_id: 'ENQ-' + randomToken(6).replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase().padEnd(6, '7'),
      name, email, company: str(body.company, 120), service_slug: str(body.service_slug, 80), service_name: str(body.service_slug, 80) || 'General',
      budget_range: str(body.budget_range, 60) || 'Not specified', timeline: str(body.timeline, 60) || 'Not specified',
      message: str(body.message, 5000) || '(no message)', status: 'NEW', notes: '', created_at: now, updated_at: now, deleted_at: null,
    };
    const list = await getEnquiries(env);
    list.unshift(enq);
    await saveEnquiries(env, list);
    mail(c, 'staff:new-enquiry', enq.reference_id, () => notifyStaffNewEnquiry(env, enq));
    return json({ success: true, message: 'Your enquiry has been received. We will respond within 24 hours.', reference_id: enq.reference_id, status: 'NEW' }, 201);
  }

  if (seg[0] === 'enquiries') {
    const list = await getEnquiries(env);
    if (seg.length === 1 && method === 'GET') {
      await c.auth('enquiries:read');
      const p = url.searchParams;
      const q = (p.get('search') || '').toLowerCase();
      let out = p.get('includeDeleted') === 'true' ? list : list.filter((e) => !e.deleted_at);
      const status = p.get('status');
      if (status && status !== 'all') out = out.filter((e) => e.status === status);
      if (q) out = out.filter((e) => [e.name, e.email, e.company, e.reference_id].some((f) => (f || '').toLowerCase().includes(q)));
      return json({ success: true, count: out.length, enquiries: out });
    }
    const enq = list.find((e) => e.id === seg[1] || e.reference_id === seg[1]);
    if (!enq) throw new HttpError(404, 'Enquiry not found.');
    if (seg[2] === 'status' && method === 'PATCH') {
      await c.auth('enquiries:update');
      if (body.status !== undefined) {
        if (!ENQUIRY_STATUSES.includes(body.status)) throw new HttpError(400, 'Unknown enquiry status.');
        enq.status = body.status;
      }
      if (body.notes !== undefined) enq.notes = str(body.notes, 3000);
      enq.updated_at = nowIso();
      await saveEnquiries(env, list);
      await c.audit('ENQUIRY_UPDATED', enq.reference_id, 'SUCCESS', { status: enq.status });
      return json({ success: true, enquiry: enq });
    }
    if (!seg[2] && method === 'DELETE') {
      await c.auth('enquiries:delete');
      enq.deleted_at = nowIso();
      enq.updated_at = nowIso();
      await saveEnquiries(env, list);
      await c.audit('ENQUIRY_DELETED', enq.reference_id);
      return json({ success: true });
    }
  }

  /* ─── Analytics ────────────────────────────────────── */
  if (path === '/api/public/analytics/visit' && method === 'POST') {
    const p = str(body.path, 200);
    if (!p.startsWith('/') || p.startsWith('/api') || /cms/i.test(p)) return json({ recorded: false });
    const device = ['desktop', 'mobile', 'tablet'].includes(body.device) ? body.device : 'desktop';
    pendingVisits.push({ id: newId('v'), path: p, deviceType: device, referrer: str(body.referrer, 200) || 'direct', isNew: body.isNew === true, timestamp: nowIso() });
    if (Date.now() - lastFlush > 60000 || pendingVisits.length >= 25) c.later(flushAnalytics(env));
    return json({ recorded: true });
  }

  if (path === '/api/analytics' && method === 'GET') {
    await c.auth('analytics:read');
    await flushAnalytics(env);
    return json({ analytics: await kvGet(env, KEYS.analytics, emptyAnalytics()) });
  }

  if (path === '/api/analytics/reset' && method === 'POST') {
    await c.auth('settings:update');
    pendingVisits = [];
    const fresh = emptyAnalytics();
    await kvPut(env, KEYS.analytics, fresh);
    await c.audit('ANALYTICS_RESET', 'analytics');
    return json({ success: true, analytics: fresh });
  }

  /* ─── Security, audit, settings ────────────────────── */
  if (path === '/api/security/audit-logs' && method === 'GET') {
    await c.auth('audit:read');
    return json({ logs: await kvGet(env, KEYS.audit, []) });
  }

  if (path === '/api/security/rotate-cms-route' && method === 'POST') {
    const me = await c.auth('cms-route:update');
    const users = await getUsers(env);
    const self = users.find((u) => u.id === me.id);
    if (!await verifyPassword(String(body.confirmationPassword || ''), self.passwordHash)) {
      await c.audit('CMS_ROUTE_ROTATION', 'cms-route', 'FAILED');
      throw new HttpError(401, 'Password confirmation failed.');
    }
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const route = 'cms_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const settings = await kvGet(env, KEYS.settings, {});
    settings.cmsRoute = route;
    settings.cmsRouteRotatedAt = nowIso();
    await kvPut(env, KEYS.settings, settings);
    await c.audit('CMS_ROUTE_ROTATION', 'cms-route', 'SUCCESS', { reason: str(body.reason, 200) });
    return json({ success: true, newRoutePath: `/${route}` });
  }

  if (path === '/api/security/database' && method === 'GET') {
    await c.auth('security:read');
    const [users, tickets, enquiries, content, team, audit, analytics] = await Promise.all([
      getUsers(env), getTickets(env), getEnquiries(env), kvGet(env, KEYS.content, []), kvGet(env, KEYS.team, []), kvGet(env, KEYS.audit, []), kvGet(env, KEYS.analytics, emptyAnalytics()),
    ]);
    const coll = (name, docs, raw) => [name, { documents: docs, file: `KV:${KEYS[name] || name}`, sizeBytes: JSON.stringify(raw).length }];
    const collections = Object.fromEntries([
      coll('users', users.length, users.map(publicUser)), coll('tickets', tickets.length, tickets), coll('enquiries', enquiries.length, enquiries),
      coll('content', content.length, content), coll('team', team.length, team), coll('audit', audit.length, audit), coll('analytics', 1, analytics),
    ]);
    return json({
      database: {
        engine: 'Cloudflare Workers KV', format: 'JSON documents per collection', kvBindingActive: Boolean(env.DB_KV),
        emailConfigured: mailConfigured(env), totalCollections: Object.keys(collections).length,
        totalDocuments: Object.values(collections).reduce((s, x) => s + x.documents, 0), collections, persistedAt: nowIso(),
      },
    });
  }

  if (path === '/api/security/test-email' && method === 'POST') {
    await c.auth('settings:update');
    if (!mailConfigured(env)) throw new HttpError(400, 'Email is not configured yet (BREVO_API_KEY and MAIL_FROM).');
    const r = await sendTestEmail(env, isEmail(str(body.to, 190)) ? str(body.to, 190) : undefined);
    await c.audit('EMAIL_TEST', str(body.to, 190) || 'staff inbox', r.ok ? 'SUCCESS' : 'FAILED', { status: r.status, error: r.error });
    if (!r.ok) throw new HttpError(502, `Email provider rejected the message (${r.status}): ${r.error || 'unknown error'}`);
    return json({ success: true });
  }

  throw new HttpError(404, 'Not found.');
}

/* ═══════════════════════════════════════════════════════════
   Entry point
═══════════════════════════════════════════════════════════ */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api')) {
      // Same-origin API only: no cross-origin credentials are ever granted.
      if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
      const c = makeCtx(request, env, ctx);
      try {
        return await handleApi(c);
      } catch (err) {
        if (err instanceof HttpError) return json({ error: err.message, reference: c.reqId, ...err.extra }, err.status);
        console.error(c.reqId, err);
        return json({ error: 'Unexpected server error.', reference: c.reqId }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
