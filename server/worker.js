/**
 * Cloudflare Worker for Kinetic Bay / KB NEXUS
 *
 * Serves the SPA (ASSETS) and every /api/* endpoint. All state lives in the
 * D1 database (binding DB, one row per record); nothing sensitive lives in source code.
 *
 * Required configuration (see scripts/cms-bootstrap.mjs and wrangler.jsonc):
 *   SESSION_SECRET  (secret) — HMAC key for sessions, MFA challenges and CSRF tokens
 *   BREVO_API_KEY   (secret) — transactional email (optional; mail is skipped without it)
 *   MAIL_FROM, MAIL_NOTIFY_TO, SITE_URL, CMS_ROUTE (vars)
 * CMS accounts are provisioned into KV by `npm run cms:bootstrap`.
 */

import {
  hashPassword, verifyPassword, passwordProblem, signToken, verifyToken, hmac,
  verifyTotp, newTotpSecret, otpauthUrl, sha256Hex, randomToken, safeEqual, fromB64url
} from './edge/crypto.js';
import {
  edgeTicketSubmissionBucket, edgeTicketTrackingBucket, edgeMessageSubmissionBucket, edgeLoginBucket,
} from './edge/ratelimit.js';
import {
  notifyStaffNewTicket, notifyCustomerTicketReceived, notifyCustomerTicketUpdate, notifyCustomerTicketStatus,
  notifyStaffNewEnquiry, sendTestEmail, mailConfigured, internalAddress, sendLeadReply, sendDigest,
  notifyMajorIssue, notifyApprovalNeeded, notifyApprovalDecision,
} from './edge/email.js';
import { listDocs, getDoc, putDoc, deleteDoc, countDocs, pruneColl, getValue, setValue } from './edge/store.js';
import { mailOauthConfigured, redirectUri, authUrl, exchangeCode, profileWithToken, seal, unseal, revoke, gmail, summarizeThread, parseThread, parseAddress, buildRaw } from './edge/gmail.js';
import { withSla, leadClock, leadSource, activity, buildCustomers, customerProfile, notificationsFor, dashboard, SLA_TARGETS } from './edge/crm.js';
import { assignTicket, assignLead, isMajorIssue, TICKET_RULES, LEAD_ROLE } from './edge/assign.js';
import { APPROVAL_LIMIT, PLANS, PROJECT_STATUSES, PAYMENT_METHODS, WON_STATUSES, contractValue, requiredApprover, withFinance } from './edge/projects.js';

/* ═══════════════════════════════════════════════════════════
   Roles & permissions
═══════════════════════════════════════════════════════════ */

const ROLE_PERMISSIONS = {
  super_admin: [
    'content:read', 'content:create', 'content:update', 'content:delete', 'content:publish', 'content:submit',
    'users:read', 'users:create', 'users:update', 'users:disable', 'security:read', 'security:update',
    'cms-route:update', 'tickets:read', 'tickets:create', 'tickets:update', 'tickets:assign', 'tickets:delete',
    'enquiries:read', 'enquiries:update', 'enquiries:delete', 'analytics:read', 'audit:read', 'settings:update',
    'team:manage', 'chatbot:manage', 'cookies:read',
    'projects:read', 'projects:create', 'projects:approve', 'payments:record', 'projects:delete', 'clients:manage',
    'mail:read', 'mail:send', 'mail:manage',
  ],
  admin: [
    'content:read', 'content:create', 'content:update', 'content:delete', 'content:publish', 'content:submit',
    'users:read', 'users:create', 'users:update', 'security:read', 'tickets:read', 'tickets:create',
    'tickets:update', 'tickets:assign', 'tickets:delete', 'enquiries:read', 'enquiries:update', 'enquiries:delete',
    'analytics:read', 'audit:read', 'settings:update',
    'team:manage', 'chatbot:manage', 'cookies:read',
    'projects:read', 'projects:create', 'projects:approve', 'payments:record', 'clients:manage',
    'mail:read', 'mail:send',
  ],
  marketing: [
    'content:read', 'content:create', 'content:update', 'content:submit',
    'tickets:read', 'tickets:create', 'tickets:update', 'enquiries:read', 'enquiries:update', 'analytics:read',
    'projects:read', 'projects:create', 'clients:manage',
    'mail:read', 'mail:send',
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
   Storage (D1: one row per record)
═══════════════════════════════════════════════════════════ */

const getUsers = (env) => listDocs(env, 'users');
const saveUser = (env, user) => putDoc(env, 'users', user);

async function getTickets(env) {
  return (await listDocs(env, 'tickets')).filter((t) => !LEGACY_SEED_IDS.has(t.id));
}
const saveTicket = (env, t) => putDoc(env, 'tickets', t);

async function getEnquiries(env) {
  return (await listDocs(env, 'enquiries')).filter((e) => !LEGACY_SEED_IDS.has(e.id));
}
const saveEnquiry = (env, e) => putDoc(env, 'enquiries', e);

async function getSettings(env) {
  const s = await getValue(env, 'settings', {});
  return { ...s, cmsRoute: s.cmsRoute || env.CMS_ROUTE || DEFAULT_CMS_ROUTE };
}

const CLOSED_TICKET_STATUSES = ['RESOLVED', 'CLOSED'];

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
        await putDoc(env, 'audit', entry);
        if (Math.random() < 0.02) await pruneColl(env, 'audit', 5000); // keep the trail bounded
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
    // also surface in Cloudflare logs (`wrangler tail`) for quick diagnosis
    if (r.ok) console.log(`[email] ${label} ${target} sent`);
    else console.error(`[email] ${label} ${target} FAILED status=${r.status} ${r.error || ''}`);
    await c.audit(r.ok ? 'EMAIL_SENT' : 'EMAIL_FAILED', target, r.ok ? 'SUCCESS' : 'FAILED', { label, status: r.status, error: r.error });
  })());
}

/** Route a new ticket to an owner and escalate major issues to every role. */
async function routeTicket(c, ticket, { skipAssign = false } = {}) {
  const env = c.env;
  const users = await getUsers(env);
  let owner = ticket.assigned_to ? users.find((u) => u.id === ticket.assigned_to) : null;
  if (!owner && !skipAssign) {
    const pick = assignTicket(ticket, users, await getTickets(env));
    if (pick) {
      owner = pick.user;
      ticket.assigned_to = owner.id;
      if (ticket.status === 'NEW') ticket.status = 'ASSIGNED';
      ticket.auto_assigned = { to: owner.id, why: pick.why, at: nowIso() };
      (ticket.internal_notes = ticket.internal_notes || []).push({ id: newId('note'), author_id: null, author_name: 'Auto-assign', note: `Assigned to ${owner.name}. ${pick.why}.`, created_at: nowIso() });
    }
  }
  ticket.major = isMajorIssue(ticket);
  await saveTicket(env, ticket);
  if (ticket.major) {
    await c.audit('MAJOR_ISSUE_RAISED', ticket.public_id, 'SUCCESS', { priority: ticket.priority, category: ticket.category });
    mail(c, 'staff:major-issue', ticket.public_id, () => notifyMajorIssue(env, ticket, owner?.name, users.filter((u) => u.status === 'active').map((u) => u.email)));
  }
  return owner;
}

function limited(check) {
  if (check.allowed) return null;
  return json({ error: check.error, retryAfter: check.retryAfter, limitType: check.limitType }, 429, check.headers);
}

/* ═══════════════════════════════════════════════════════════
   Analytics (buffered per isolate to keep writes low)
═══════════════════════════════════════════════════════════ */

const emptyAnalytics = () => ({ totalVisits: 0, uniqueVisitors: 0, pageViews: {}, dailyVisits: [], deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 }, recentVisits: [], since: nowIso() });
let pendingVisits = [];
let lastFlush = 0;

async function flushAnalytics(env) {
  if (!pendingVisits.length) return;
  const batch = pendingVisits;
  pendingVisits = [];
  lastFlush = Date.now();
  const a = await getValue(env, 'analytics', emptyAnalytics());
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
  await setValue(env, 'analytics', a);
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
    await saveUser(env, user);
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
    await saveUser(env, user);
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
      await saveUser(env, user);
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
        await saveUser(env, target);
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
        await saveUser(env, target);
        await c.audit('USER_STATUS_CHANGED', target.username, 'SUCCESS', { status });
        return json({ success: true, user: publicUser(target) });
      }
    }
  }

  /* ─── Content workflow ─────────────────────────────── */
  if (seg[0] === 'content') {
    const items = await listDocs(env, 'content');
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
      await putDoc(env, 'content', item);
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
      await putDoc(env, 'content', item);
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
      await putDoc(env, 'content', item);
      await c.audit('CONTENT_TRANSITION', item.slug, 'SUCCESS', { to: target });
      return json({ success: true, item });
    }
    if (seg.length === 2 && method === 'DELETE') {
      const me = await c.auth('content:delete');
      item.deleted_at = nowIso();
      item.deleted_by = me.id;
      item.deletion_reason = str(body.reason, 300) || null;
      await putDoc(env, 'content', item);
      await c.audit('CONTENT_DELETED', item.slug);
      return json({ success: true });
    }
    if (seg.length === 3 && seg[2] === 'restore' && method === 'POST') {
      await c.auth('content:delete');
      item.deleted_at = null; item.deleted_by = null; item.deletion_reason = null; item.updated_at = nowIso();
      await putDoc(env, 'content', item);
      await c.audit('CONTENT_RESTORED', item.slug);
      return json({ success: true, item });
    }
  }

  if (path === '/api/public/content' && method === 'GET') {
    const items = await listDocs(env, 'content');
    return json({ items: items.filter((i) => i.status === 'published' && !i.deleted_at).map(({ id, title, slug, category, content, updated_at }) => ({ id, title, slug, category, content, updated_at })) }, 200, { 'Cache-Control': 'public, max-age=60' });
  }

  /* ─── Team (server-side so it is shared, not per-browser) ─ */
  if (seg[0] === 'team') {
    const team = (await listDocs(env, 'team')).sort((x, y) => (x.order || 0) - (y.order || 0));
    if (seg.length === 1 && method === 'GET') {
      await c.auth('team:manage');
      return json({ team });
    }
    if (seg.length === 1 && method === 'POST') {
      await c.auth('team:manage');
      const name = str(body.name, 80), role = str(body.role, 80);
      if (!name || !role) throw new HttpError(400, 'Name and role are required.');
      const member = {
        id: newId('team'), name, role, bio: str(body.bio, 600), image: str(body.image, 500), linkedin: str(body.linkedin, 300),
        order: team.length + 1, visible: body.visible !== false, created_at: nowIso(), updated_at: nowIso(),
      };
      await putDoc(env, 'team', member);
      await c.audit('TEAM_MEMBER_ADDED', name);
      return json({ success: true, member }, 201);
    }
    const member = team.find((m) => m.id === seg[1]);
    if (seg[1] && !member) throw new HttpError(404, 'Team member not found.');
    if (seg.length === 2 && method === 'PUT') {
      await c.auth('team:manage');
      for (const k of ['name', 'role', 'bio', 'image', 'linkedin']) if (body[k] !== undefined) member[k] = str(body[k], k === 'bio' ? 600 : 500);
      if (typeof body.visible === 'boolean') member.visible = body.visible;
      member.updated_at = nowIso();
      await putDoc(env, 'team', member);
      await c.audit('TEAM_MEMBER_UPDATED', member.name);
      return json({ success: true, member });
    }
    if (seg.length === 2 && method === 'DELETE') {
      await c.auth('team:manage');
      await deleteDoc(env, 'team', member.id);
      await c.audit('TEAM_MEMBER_REMOVED', member.name);
      return json({ success: true });
    }
  }

  /* ─── Client logos (shown on the homepage) ─── */
  if (path === '/api/public/clients' && method === 'GET') {
    const list = (await listDocs(env, 'clients')).filter((x) => x.visible).sort((a, b) => (a.order || 0) - (b.order || 0));
    return json({ clients: list.map(({ id, name, logo, website }) => ({ id, name, logo, website })) }, 200, { 'Cache-Control': 'public, max-age=300' });
  }
  if (seg[0] === 'clients') {
    const list = (await listDocs(env, 'clients')).sort((a, b) => (a.order || 0) - (b.order || 0));
    const logoOk = (v) => {
      const logo = String(v || '');
      if (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(logo)) throw new HttpError(400, 'Logo must be a PNG, JPG, WebP or SVG image.');
      if (logo.length > 400000) throw new HttpError(400, 'Logo is too large (keep it under about 300 KB).');
      return logo;
    };
    const site = (v) => { const w = str(v, 300); if (w && !/^https?:\/\//i.test(w)) throw new HttpError(400, 'Website must start with http:// or https://'); return w; };
    if (seg.length === 1 && method === 'GET') {
      await c.auth('clients:manage');
      return json({ clients: list });
    }
    if (seg.length === 1 && method === 'POST') {
      const me = await c.auth('clients:manage');
      const name = str(body.name, 100);
      if (!name) throw new HttpError(400, 'Client name is required.');
      const item = { id: newId('cli'), name, logo: logoOk(body.logo), website: site(body.website), visible: body.visible !== false, order: (list.at(-1)?.order || 0) + 1, created_by: me.id, created_at: nowIso(), updated_at: nowIso() };
      await putDoc(env, 'clients', item);
      await c.audit('CLIENT_LOGO_ADDED', name);
      return json({ success: true, client: item }, 201);
    }
    const item = list.find((x) => x.id === seg[1]);
    if (!item) throw new HttpError(404, 'Client not found.');
    if (seg.length === 2 && method === 'PUT') {
      await c.auth('clients:manage');
      if (body.name !== undefined) { item.name = str(body.name, 100); if (!item.name) throw new HttpError(400, 'Client name is required.'); }
      if (body.logo !== undefined) item.logo = logoOk(body.logo);
      if (body.website !== undefined) item.website = site(body.website);
      if (body.visible !== undefined) item.visible = Boolean(body.visible);
      if (body.move === 'up' || body.move === 'down') {
        const i = list.indexOf(item), j = body.move === 'up' ? i - 1 : i + 1;
        if (list[j]) {
          const other = list[j];
          [item.order, other.order] = [other.order ?? j, item.order ?? i];
          if (item.order === other.order) item.order += body.move === 'up' ? -1 : 1;
          other.updated_at = nowIso();
          await putDoc(env, 'clients', other);
        }
      }
      item.updated_at = nowIso();
      await putDoc(env, 'clients', item);
      await c.audit('CLIENT_LOGO_UPDATED', item.name);
      return json({ success: true, client: item });
    }
    if (seg.length === 2 && method === 'DELETE') {
      await c.auth('clients:manage');
      await deleteDoc(env, 'clients', item.id);
      await c.audit('CLIENT_LOGO_REMOVED', item.name);
      return json({ success: true });
    }
  }

  if (path === '/api/public/team' && method === 'GET') {
    const team = (await listDocs(env, 'team')).sort((x, y) => (x.order || 0) - (y.order || 0));
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
    await routeTicket(c, ticket);
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
      const mine = p.get('assigned') === 'me' ? c.session.user.id : null;
      if (mine) list = list.filter((t) => t.assigned_to === mine);
      return json({ success: true, count: list.length, tickets: list.map((t) => withSla(t)), targets: SLA_TARGETS });
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
      if (assignedTo && !(await getUsers(env)).some((u) => u.id === assignedTo && u.status === 'active')) throw new HttpError(400, 'Assignee is not an active staff member.');
      await routeTicket(c, ticket, { skipAssign: body.autoAssign === false });
      await c.audit('TICKET_CREATED', ticket.public_id);
      if (!internalAddress(email)) mail(c, 'customer:ticket-received', ticket.public_id, () => notifyCustomerTicketReceived(env, ticket));
      return json({ success: true, message: `Ticket ${ticket.public_id} created.`, ticket }, 201);
    }

    const key = decodeURIComponent(seg[1] || '').toUpperCase();
    const ticket = tickets.find((t) => t.id.toUpperCase() === key || t.public_id === key);
    if (!ticket) throw new HttpError(404, 'Ticket not found.');
    const action = seg[2] || '';
    const prevStatus = ticket.status;
    const wasMajor = Boolean(ticket.major);
    const touch = async (auditType, meta = {}) => {
      ticket.updated_at = nowIso();
      ticket.major = isMajorIssue(ticket);
      if (ticket.major && !wasMajor) {
        const users = await getUsers(env);
        mail(c, 'staff:major-issue', ticket.public_id, () => notifyMajorIssue(env, ticket, users.find((u) => u.id === ticket.assigned_to)?.name, users.filter((u) => u.status === 'active').map((u) => u.email)));
      }
      // resolution clock: stamp when closed, clear if reopened
      if (CLOSED_TICKET_STATUSES.includes(ticket.status) && !ticket.resolved_at) ticket.resolved_at = ticket.updated_at;
      if (!CLOSED_TICKET_STATUSES.includes(ticket.status)) ticket.resolved_at = null;
      await saveTicket(env, ticket);
      await c.audit(auditType, ticket.public_id, 'SUCCESS', meta);
      // tell the customer when their ticket is resolved or closed
      if (ticket.status !== prevStatus && ['RESOLVED', 'CLOSED'].includes(ticket.status) && !internalAddress(ticket.requester_email)) {
        mail(c, 'customer:ticket-status', ticket.public_id, () => notifyCustomerTicketStatus(env, ticket));
      }
    };

    if (!action && method === 'GET') {
      await c.auth('tickets:read');
      return json({ success: true, ticket: withSla(ticket) });
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
      return json({ success: true, message: 'Ticket updated.', ticket: withSla(ticket) });
    }
    if (action === 'status' && method === 'PATCH') {
      await c.auth('tickets:update');
      if (!TICKET_STATUSES.includes(body.status)) throw new HttpError(400, 'Unknown ticket status.');
      ticket.status = body.status;
      await touch('TICKET_STATUS_CHANGED', { from: prevStatus, to: ticket.status });
      return json({ success: true, ticket: withSla(ticket) });
    }
    if (action === 'assign' && method === 'PATCH') {
      await c.auth('tickets:assign');
      const assignee = str(body.assignedTo, 60) || null;
      if (assignee && !(await getUsers(env)).some((u) => u.id === assignee && u.status === 'active')) throw new HttpError(400, 'Assignee is not an active staff member.');
      ticket.assigned_to = assignee;
      if (ticket.status === 'NEW' && assignee) ticket.status = 'ASSIGNED';
      await touch('TICKET_ASSIGNED', { to: assignee });
      return json({ success: true, ticket: withSla(ticket) });
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
      const me = await c.auth('tickets:update');
      const message = str(body.message, 3000);
      if (!message) throw new HttpError(400, 'Update cannot be empty.');
      const u = { id: newId('upd'), message, created_at: nowIso(), author_name: me.name };
      (ticket.customer_updates = ticket.customer_updates || []).push(u);
      // first customer-visible reply stops the response clock
      if (!ticket.first_response_at) {
        ticket.first_response_at = u.created_at;
        ticket.first_responder_id = me.id;
      }
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
      owner_id: null, follow_up_at: null, first_response_at: null, last_contacted_at: null, activities: [],
    };
    enq.source = leadSource(enq);
    const pick = assignLead(enq, await getUsers(env), await getEnquiries(env));
    if (pick) {
      enq.owner_id = pick.user.id;
      enq.activities.push(activity('owner', `Auto-assigned to ${pick.user.name} (${pick.why})`, null));
    }
    await saveEnquiry(env, enq);
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
      if (p.get('owner') === 'me') out = out.filter((e) => e.owner_id === c.session.user.id);
      return json({ success: true, count: out.length, enquiries: out.map((e) => ({ ...e, source: leadSource(e), response_clock: leadClock(e) })) });
    }
    const enq = list.find((e) => e.id === seg[1] || e.reference_id === seg[1]);
    if (!enq) throw new HttpError(404, 'Enquiry not found.');
    // status (pipeline moves), owner, follow-up date, notes — one endpoint, two paths for compatibility
    if ((seg[2] === 'status' || !seg[2]) && method === 'PATCH') {
      const me = await c.auth('enquiries:update');
      enq.activities = enq.activities || [];
      if (body.status !== undefined && body.status !== enq.status) {
        if (!ENQUIRY_STATUSES.includes(body.status)) throw new HttpError(400, 'Unknown enquiry status.');
        if (body.status === 'LOST') enq.lost_from = enq.status;
        if (body.status === 'WON') enq.won_at = nowIso();
        enq.activities.push(activity('status', `Moved from ${enq.status.replace(/_/g, ' ').toLowerCase()} to ${body.status.replace(/_/g, ' ').toLowerCase()}`, me));
        enq.status = body.status;
        // reaching "contacted" or beyond means someone has been in touch
        if (!enq.first_response_at && body.status !== 'NEW') enq.first_response_at = nowIso();
      }
      if ('owner_id' in body) {
        const owner = str(body.owner_id, 60) || null;
        if (owner && !(await getUsers(env)).some((u) => u.id === owner && u.status === 'active')) throw new HttpError(400, 'Owner must be an active staff member.');
        if (owner !== enq.owner_id) {
          const name = owner ? (await getUsers(env)).find((u) => u.id === owner).name : 'nobody';
          enq.activities.push(activity('owner', `Owner set to ${name}`, me));
        }
        enq.owner_id = owner;
      }
      if ('follow_up_at' in body) {
        const when = body.follow_up_at ? new Date(body.follow_up_at) : null;
        if (when && Number.isNaN(when.getTime())) throw new HttpError(400, 'Follow-up date is not valid.');
        enq.follow_up_at = when ? when.toISOString() : null;
      }
      if ('estimated_value' in body) {
        const v = body.estimated_value === '' || body.estimated_value == null ? null : Number(body.estimated_value);
        if (v != null && !(v >= 0 && v < 1e10)) throw new HttpError(400, 'Estimated value must be a positive amount.');
        enq.estimated_value = v;
      }
      if (body.notes !== undefined) enq.notes = str(body.notes, 3000);
      enq.updated_at = nowIso();
      await saveEnquiry(env, enq);
      await c.audit('ENQUIRY_UPDATED', enq.reference_id, 'SUCCESS', { status: enq.status, owner: enq.owner_id });
      return json({ success: true, enquiry: { ...enq, source: leadSource(enq), response_clock: leadClock(enq) } });
    }
    if (seg[2] === 'activities' && method === 'POST') {
      const me = await c.auth('enquiries:update');
      const type = ['note', 'call', 'meeting', 'whatsapp'].includes(body.type) ? body.type : 'note';
      const text = str(body.text, 3000);
      if (!text) throw new HttpError(400, 'Please describe the activity.');
      const a = activity(type, text, me);
      (enq.activities = enq.activities || []).push(a);
      if (type !== 'note') {
        enq.last_contacted_at = a.at;
        if (!enq.first_response_at) enq.first_response_at = a.at;
        if (enq.status === 'NEW') enq.status = 'CONTACTED';
      }
      enq.updated_at = nowIso();
      await saveEnquiry(env, enq);
      return json({ success: true, activity: a, enquiry: { ...enq, source: leadSource(enq), response_clock: leadClock(enq) } });
    }
    if (seg[2] === 'reply' && method === 'POST') {
      const me = await c.auth('enquiries:update');
      if (!mailConfigured(env)) throw new HttpError(400, 'Email is not configured yet.');
      const subject = str(body.subject, 200) || `Re: your enquiry ${enq.reference_id}`;
      const message = str(body.message, 8000);
      if (!message) throw new HttpError(400, 'Message cannot be empty.');
      const r = await sendLeadReply(env, enq, subject, message, me);
      await c.audit(r.ok ? 'EMAIL_SENT' : 'EMAIL_FAILED', enq.reference_id, r.ok ? 'SUCCESS' : 'FAILED', { label: 'lead:reply', status: r.status, error: r.error });
      if (!r.ok) throw new HttpError(502, `Email could not be sent (${r.status}). Please try again.`);
      const a = activity('email', message, me, { subject });
      (enq.activities = enq.activities || []).push(a);
      enq.last_contacted_at = a.at;
      if (!enq.first_response_at) enq.first_response_at = a.at;
      if (enq.status === 'NEW') enq.status = 'CONTACTED';
      enq.updated_at = nowIso();
      await saveEnquiry(env, enq);
      return json({ success: true, activity: a, enquiry: { ...enq, source: leadSource(enq), response_clock: leadClock(enq) } });
    }
    if (!seg[2] && method === 'DELETE') {
      await c.auth('enquiries:delete');
      enq.deleted_at = nowIso();
      enq.updated_at = nowIso();
      await saveEnquiry(env, enq);
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
    return json({ analytics: await getValue(env, 'analytics', emptyAnalytics()) });
  }

  if (path === '/api/analytics/reset' && method === 'POST') {
    await c.auth('settings:update');
    pendingVisits = [];
    const fresh = emptyAnalytics();
    await setValue(env, 'analytics', fresh);
    await c.audit('ANALYTICS_RESET', 'analytics');
    return json({ success: true, analytics: fresh });
  }

  /* ─── Security, audit, settings ────────────────────── */
  if (path === '/api/security/audit-logs' && method === 'GET') {
    await c.auth('audit:read');
    return json({ logs: await listDocs(env, 'audit', { limit: 500 }) });
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
    const settings = await getValue(env, 'settings', {});
    settings.cmsRoute = route;
    settings.cmsRouteRotatedAt = nowIso();
    await setValue(env, 'settings', settings);
    await c.audit('CMS_ROUTE_ROTATION', 'cms-route', 'SUCCESS', { reason: str(body.reason, 200) });
    return json({ success: true, newRoutePath: `/${route}` });
  }

  if (path === '/api/security/database' && method === 'GET') {
    await c.auth('security:read');
    const counts = await countDocs(env);
    const collections = Object.fromEntries(Object.entries(counts).map(([name, v]) => [name, { ...v, file: `D1:docs/${name}` }]));
    return json({
      database: {
        engine: 'Cloudflare D1 (SQLite)', format: 'One JSON document per row', d1BindingActive: Boolean(env.DB),
        emailConfigured: mailConfigured(env), totalCollections: Object.keys(collections).length,
        totalDocuments: Object.values(collections).reduce((sum, x) => sum + x.documents, 0), collections, persistedAt: nowIso(),
      },
    });
  }

  if (path === '/api/security/run-digest' && method === 'POST') {
    await c.auth('settings:update');
    return json({ success: true, result: await runDailyDigest(env) });
  }

  if (path === '/api/security/test-email' && method === 'POST') {
    await c.auth('settings:update');
    if (!mailConfigured(env)) throw new HttpError(400, 'Email is not configured yet (BREVO_API_KEY and MAIL_FROM).');
    const r = await sendTestEmail(env, isEmail(str(body.to, 190)) ? str(body.to, 190) : undefined);
    await c.audit('EMAIL_TEST', str(body.to, 190) || 'staff inbox', r.ok ? 'SUCCESS' : 'FAILED', { status: r.status, error: r.error });
    if (!r.ok) throw new HttpError(502, `Email provider rejected the message (${r.status}): ${r.error || 'unknown error'}`);
    return json({ success: true });
  }

  /* ─── Dashboard, notifications, customers ──────────── */
  if (path === '/api/dashboard' && method === 'GET') {
    const me = await c.auth('analytics:read');
    const perms = ROLE_PERMISSIONS[me.role] || [];
    const data = await loadWorkspace(env, perms);
    const notes = notificationsFor(me, perms, data);
    return json({ dashboard: dashboard({ user: me, perms, ...data, notifications: notes }) });
  }

  if (path === '/api/notifications' && method === 'GET') {
    const me = await c.auth();
    const perms = ROLE_PERMISSIONS[me.role] || [];
    const items = notificationsFor(me, perms, await loadWorkspace(env, perms));
    const seen = me.notificationsSeenAt || '';
    return json({ items, unread: items.filter((n) => n.at > seen).length, seen_at: seen || null });
  }

  if (path === '/api/notifications/seen' && method === 'POST') {
    const me = await c.auth();
    me.notificationsSeenAt = nowIso();
    await saveUser(env, me);
    return json({ success: true });
  }

  /* ─── Gmail inside the CMS ─────────────────────────── */
  if (seg[0] === 'mail') {
    const accounts = await getValue(env, 'mail_accounts', []);
    const saveAccounts = (list) => setValue(env, 'mail_accounts', list);
    const publicAccount = (a) => ({ email: a.email, roles: a.roles, connected_at: a.connected_at, connected_by_name: a.connected_by_name });
    const visibleTo = (me) => accounts.filter((a) => me.role === 'super_admin' || (a.roles || []).includes(me.role));
    const pickAccount = (me, email) => {
      const list = visibleTo(me);
      const acc = email ? list.find((a) => a.email === String(email).toLowerCase()) : list[0];
      if (!acc) throw new HttpError(404, 'That mailbox is not connected or not shared with your role.');
      return acc;
    };
    const gm = async (acc, p, init) => {
      try { return await gmail(env, acc, p, init); } catch (e) {
        if (/invalid_grant|revoked|expired/i.test(e.message)) throw new HttpError(409, `Google access for ${acc.email} has expired or was revoked. A Super Admin needs to reconnect it.`);
        throw new HttpError(e.status === 404 ? 404 : 502, `Gmail: ${e.message}`);
      }
    };
    const cmsHome = async (q) => `/${(await getSettings(env)).cmsRoute}?${new URLSearchParams(q)}`;

    // Google redirects the browser here after consent. Cookies are SameSite=Strict so the
    // session is not sent; the signed, short-lived state proves who started the flow.
    if (path === '/api/mail/oauth/callback' && method === 'GET') {
      const p = url.searchParams;
      const back = async (q) => new Response(null, { status: 302, headers: { location: await cmsHome(q), 'cache-control': 'no-store' } });
      const state = await verifyToken(requireSecret(env), 'gmo', p.get('state') || '');
      if (!state) return back({ mail: 'error', reason: 'The sign-in link expired. Please try again.' });
      if (p.get('error')) return back({ mail: 'error', reason: p.get('error') === 'access_denied' ? 'Google access was not granted.' : p.get('error') });
      const starter = (await getUsers(env)).find((u) => u.id === state.u && u.status === 'active' && u.role === 'super_admin');
      if (!starter) return back({ mail: 'error', reason: 'Only an active Super Admin can connect a mailbox.' });
      try {
        const tok = await exchangeCode(env, url.origin, p.get('code') || '');
        if (!tok.refresh_token) return back({ mail: 'error', reason: 'Google did not return offline access. Remove the app from your Google account permissions and try again.' });
        const prof = await profileWithToken(tok.access_token);
        const email = String(prof.emailAddress || '').toLowerCase();
        const list = accounts.filter((a) => a.email !== email);
        list.push({ email, refresh: await seal(env, tok.refresh_token), roles: state.roles, connected_by: starter.id, connected_by_name: starter.name, connected_at: nowIso() });
        await saveAccounts(list);
        c.session = { user: starter, token: '' };
        await c.audit('MAILBOX_CONNECTED', email);
        return back({ mail: 'connected', account: email });
      } catch (e) {
        return back({ mail: 'error', reason: String(e.message || e).slice(0, 200) });
      }
    }

    if (path === '/api/mail/status' && method === 'GET') {
      const me = await c.auth('mail:read');
      return json({
        oauth_configured: mailOauthConfigured(env),
        redirect_uri: redirectUri(env, url.origin),
        accounts: visibleTo(me).map(publicAccount),
        can_manage: (ROLE_PERMISSIONS[me.role] || []).includes('mail:manage'),
      });
    }
    if (path === '/api/mail/oauth/start' && method === 'POST') {
      const me = await c.auth('mail:manage');
      if (!mailOauthConfigured(env)) throw new HttpError(400, 'Google sign-in is not set up yet (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing).');
      const roles = (Array.isArray(body.roles) ? body.roles : ROLES).filter((r) => ROLES.includes(r));
      const state = await signToken(requireSecret(env), 'gmo', { u: me.id, roles, n: randomToken(8), exp: Date.now() + 10 * 60 * 1000 });
      return json({ url: authUrl(env, url.origin, state, str(body.login_hint, 190)) });
    }
    if (seg[1] === 'accounts' && seg[2]) {
      const me = await c.auth('mail:manage');
      const email = decodeURIComponent(seg[2]).toLowerCase();
      const acc = accounts.find((a) => a.email === email);
      if (!acc) throw new HttpError(404, 'Mailbox not found.');
      if (method === 'PATCH') {
        acc.roles = (Array.isArray(body.roles) ? body.roles : acc.roles).filter((r) => ROLES.includes(r));
        await saveAccounts(accounts);
        await c.audit('MAILBOX_SHARING_CHANGED', email, 'SUCCESS', { roles: acc.roles });
        return json({ success: true, account: publicAccount(acc) });
      }
      if (method === 'DELETE') {
        try { await revoke(await unseal(env, acc.refresh)); } catch { /* already invalid */ }
        await saveAccounts(accounts.filter((a) => a.email !== email));
        await c.audit('MAILBOX_DISCONNECTED', email, 'SUCCESS', { by: me.username });
        return json({ success: true });
      }
    }

    const VIEWS = {
      inbox: 'in:inbox', unread: 'in:inbox is:unread', starred: 'is:starred', sent: 'in:sent', all: '',
      proposals: '{subject:proposal subject:quotation subject:quote subject:rfp subject:rfq subject:tender subject:estimate subject:"purchase order" proposal quotation}',
    };
    if (path === '/api/mail/threads' && method === 'GET') {
      const me = await c.auth('mail:read');
      const p = url.searchParams;
      const acc = pickAccount(me, p.get('account'));
      const q = [VIEWS[p.get('view')] ?? VIEWS.inbox, str(p.get('q') || '', 200)].filter(Boolean).join(' ');
      const qs = new URLSearchParams({ maxResults: '20', q });
      if (p.get('pageToken')) qs.set('pageToken', p.get('pageToken'));
      const list = await gm(acc, `/threads?${qs}`);
      const meta = 'format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date';
      const threads = await Promise.all((list.threads || []).map((t) => gm(acc, `/threads/${t.id}?${meta}`).then(summarizeThread).catch(() => null)));
      return json({ account: acc.email, threads: threads.filter(Boolean), next_page: list.nextPageToken || null, estimate: list.resultSizeEstimate || 0 });
    }
    if (seg[1] === 'threads' && seg[2] && method === 'GET') {
      const me = await c.auth('mail:read');
      const acc = pickAccount(me, url.searchParams.get('account'));
      const thread = parseThread(await gm(acc, `/threads/${encodeURIComponent(seg[2])}?format=full`));
      if (thread.unread && url.searchParams.get('peek') !== '1') {
        c.later(gm(acc, `/threads/${encodeURIComponent(seg[2])}/modify`, { method: 'POST', body: JSON.stringify({ removeLabelIds: ['UNREAD'] }) }).catch(() => undefined));
      }
      // link the conversation to what the CRM already knows about these people
      const people = [...new Set(thread.messages.map((m) => m.from.email).filter((e) => e && e !== acc.email))];
      const [enquiries, tickets, projects] = await Promise.all([getEnquiries(env), getTickets(env), listDocs(env, 'projects')]);
      const crm = people.map((email) => ({
        email,
        leads: enquiries.filter((e) => !e.deleted_at && e.email === email).map((e) => ({ id: e.id, ref: e.reference_id, status: e.status })),
        tickets: tickets.filter((t) => !t.deleted_at && t.requester_email === email).map((t) => ({ id: t.id, ref: t.public_id, status: t.status })),
        projects: projects.filter((x) => !x.deleted_at && x.customer_email === email).map((x) => ({ id: x.id, ref: x.ref, status: x.status })),
      }));
      return json({ account: acc.email, thread, crm });
    }
    if (seg[1] === 'threads' && seg[3] === 'modify' && method === 'POST') {
      const me = await c.auth('mail:read');
      const acc = pickAccount(me, body.account);
      const ACTIONS = {
        read: { removeLabelIds: ['UNREAD'] }, unread: { addLabelIds: ['UNREAD'] },
        star: { addLabelIds: ['STARRED'] }, unstar: { removeLabelIds: ['STARRED'] },
        archive: { removeLabelIds: ['INBOX'] }, inbox: { addLabelIds: ['INBOX'] },
      };
      if (body.action === 'trash') {
        await c.auth('mail:send');
        await gm(acc, `/threads/${encodeURIComponent(seg[2])}/trash`, { method: 'POST' });
      } else if (ACTIONS[body.action]) {
        await gm(acc, `/threads/${encodeURIComponent(seg[2])}/modify`, { method: 'POST', body: JSON.stringify(ACTIONS[body.action]) });
      } else throw new HttpError(400, 'Unknown mailbox action.');
      return json({ success: true });
    }
    if (path === '/api/mail/send' && method === 'POST') {
      const me = await c.auth('mail:send');
      const acc = pickAccount(me, body.account);
      const to = str(body.to, 1000), cc = str(body.cc, 1000), subject = str(body.subject, 250), text = str(body.body, 50000);
      const addrs = [...to.split(','), ...cc.split(',')].map((x) => parseAddress(x).email).filter(Boolean);
      if (!to || !addrs.length || !addrs.every(isEmail)) throw new HttpError(400, 'Please enter valid recipient email addresses (comma separated).');
      if (!subject || !text) throw new HttpError(400, 'Subject and message are required.');
      const raw = buildRaw({ from: acc.email, fromName: `${me.name} · Kinetic Bay`, to, cc, subject, body: text, inReplyTo: str(body.in_reply_to, 500), references: str(body.references, 2000) });
      const sent = await gm(acc, '/messages/send', { method: 'POST', body: JSON.stringify({ raw, ...(body.thread_id ? { threadId: str(body.thread_id, 100) } : {}) }) });
      await c.audit('MAIL_SENT', acc.email, 'SUCCESS', { to: addrs.join(', '), subject });
      // replying to a lead counts as contacting them
      const leads = (await getEnquiries(env)).filter((e) => !e.deleted_at && addrs.includes(e.email) && !['WON', 'LOST'].includes(e.status));
      for (const lead of leads) {
        const a = activity('email', text.slice(0, 3000), me, { subject, via: acc.email });
        (lead.activities = lead.activities || []).push(a);
        lead.last_contacted_at = a.at;
        if (!lead.first_response_at) lead.first_response_at = a.at;
        if (lead.status === 'NEW') lead.status = 'CONTACTED';
        lead.updated_at = nowIso();
        await saveEnquiry(env, lead);
      }
      return json({ success: true, id: sent.id, thread_id: sent.threadId, logged_on_leads: leads.map((l) => l.reference_id) });
    }
    if (path === '/api/mail/attachment' && method === 'GET') {
      const me = await c.auth('mail:read');
      const p = url.searchParams;
      const acc = pickAccount(me, p.get('account'));
      const data = await gm(acc, `/messages/${encodeURIComponent(p.get('message') || '')}/attachments/${encodeURIComponent(p.get('id') || '')}`);
      const bytes = fromB64url(data.data || '');
      const name = (p.get('name') || 'attachment').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
      return new Response(bytes, { headers: { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${name}"`, 'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store' } });
    }
    if (path === '/api/mail/to-lead' && method === 'POST') {
      const me = await c.auth('enquiries:update');
      const acc = pickAccount(me, body.account);
      const thread = parseThread(await gm(acc, `/threads/${encodeURIComponent(str(body.thread_id, 100))}?format=full`));
      const first = thread.messages.find((m) => m.from.email && m.from.email !== acc.email) || thread.messages[0];
      if (!first || !isEmail(first.from.email)) throw new HttpError(400, 'Could not find the sender of this conversation.');
      const now = nowIso();
      const enq = {
        id: newId('enq'), reference_id: 'ENQ-' + randomToken(6).replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase().padEnd(6, '7'),
        name: first.from.name || first.from.email, email: first.from.email, company: str(body.company, 120),
        service_slug: '', service_name: str(body.service, 80) || 'From email', budget_range: 'Not specified', timeline: 'Not specified',
        message: `Subject: ${thread.subject}\nSource: email\n\n${(first.text || first.snippet || '').slice(0, 4000)}`,
        status: 'NEW', notes: `Imported from ${acc.email}`, source: 'email', created_at: now, updated_at: now, deleted_at: null,
        owner_id: null, follow_up_at: null, first_response_at: null, last_contacted_at: null, activities: [], mail_thread: { account: acc.email, id: thread.id },
      };
      const pick = assignLead(enq, await getUsers(env), await getEnquiries(env));
      enq.owner_id = pick ? pick.user.id : me.id;
      enq.activities.push(activity('owner', `Created from email by ${me.name}${pick ? `; owner ${pick.user.name}` : ''}`, me));
      await saveEnquiry(env, enq);
      await c.audit('LEAD_FROM_EMAIL', enq.reference_id, 'SUCCESS', { from: enq.email });
      return json({ success: true, enquiry: enq }, 201);
    }
    throw new HttpError(404, 'Not found.');
  }

  if (path === '/api/assignment-rules' && method === 'GET') {
    await c.auth();
    return json({ tickets: TICKET_RULES, leads: { role: LEAD_ROLE, why: 'New leads are shared across Marketing' }, approval_limit: APPROVAL_LIMIT, major: 'Critical or urgent priority, or any security ticket, alerts all three roles' });
  }

  if (seg[0] === 'projects') {
    const projects = (await listDocs(env, 'projects')).filter((x) => !x.deleted_at);
    const num = (v) => (v === '' || v == null ? NaN : Number(v));
    const money = (v, label) => { const n = num(v); if (!(n > 0) || n > 1e10) throw new HttpError(400, `${label} must be a positive amount.`); return Math.round(n * 100) / 100; };
    const date = (v, label) => { const d = str(v, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new HttpError(400, `${label} must be a date (YYYY-MM-DD).`); return d; };
    const hist = (pr, me, text) => (pr.history = pr.history || []).push({ at: nowIso(), by: me?.name || 'System', by_id: me?.id || null, text });
    // plan fields, validated into the shape schedule() understands
    const planFields = (b, base = {}) => {
      const plan = PLANS.includes(b.plan) ? b.plan : base.plan || 'one_time';
      const out = { plan, start_date: date(b.start_date || base.start_date || nowIso().slice(0, 10), 'Start date') };
      if (plan === 'one_time') { out.amount = money(b.amount ?? base.amount, 'Amount'); out.due_date = date(b.due_date || base.due_date || out.start_date, 'Due date'); }
      else if (plan === 'milestone') {
        const ms = Array.isArray(b.milestones) ? b.milestones : base.milestones || [];
        if (!ms.length || ms.length > 24) throw new HttpError(400, 'Add between 1 and 24 milestones.');
        out.milestones = ms.map((m, i) => ({ title: str(m.title, 120) || `Milestone ${i + 1}`, amount: money(m.amount, `Milestone ${i + 1} amount`), due_date: date(m.due_date, `Milestone ${i + 1} date`) }));
      } else {
        out.amount_per_period = money(b.amount_per_period ?? base.amount_per_period, 'Amount per period');
        const periods = Math.round(num(b.periods ?? base.periods));
        if (!(periods >= 1 && periods <= 120)) throw new HttpError(400, 'Number of billing periods must be 1–120.');
        out.periods = periods;
      }
      return out;
    };
    const canDecide = (me, pr) => (me.role === 'super_admin') || (pr.approval?.required_role === 'admin' && (ROLE_PERMISSIONS[me.role] || []).includes('projects:approve'));
    const approvers = async (role) => (await getUsers(env)).filter((u) => u.status === 'active' && (u.role === 'super_admin' || (role === 'admin' && u.role === 'admin'))).map((u) => u.email);

    if (seg.length === 1 && method === 'GET') {
      await c.auth('projects:read');
      const p = url.searchParams;
      let list = projects;
      if (p.get('customer')) list = list.filter((x) => x.customer_email === p.get('customer').toLowerCase());
      if (p.get('status') && p.get('status') !== 'all') list = list.filter((x) => x.status === p.get('status'));
      return json({ projects: list.map((x) => withFinance(x)), approval_limit: APPROVAL_LIMIT });
    }
    if (seg.length === 1 && method === 'POST') {
      const me = await c.auth('projects:create');
      const title = str(body.title, 160);
      const email = str(body.customer_email, 190).toLowerCase();
      if (!title) throw new HttpError(400, 'Project title is required.');
      if (!isEmail(email)) throw new HttpError(400, 'A valid customer email is required.');
      const lead = body.lead_id ? (await getEnquiries(env)).find((e) => e.id === body.lead_id) : null;
      const now = nowIso();
      const pr = {
        id: newId('prj'), ref: 'PRJ-' + randomToken(6).replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase().padEnd(6, '7'),
        title, customer_email: email, customer_name: str(body.customer_name, 100) || lead?.name || email, company: str(body.company, 120) || lead?.company || '',
        service: str(body.service, 120) || lead?.service_name || '', lead_id: lead?.id || null, owner_id: lead?.owner_id || me.id,
        ...planFields(body), status: 'draft', approval: null, payments: [], notes: str(body.notes, 3000),
        created_by: me.id, created_at: now, updated_at: now, deleted_at: null, history: [],
      };
      hist(pr, me, 'Project created');
      await putDoc(env, 'projects', pr);
      await c.audit('PROJECT_CREATED', pr.ref, 'SUCCESS', { value: contractValue(pr) });
      return json({ success: true, project: withFinance(pr) }, 201);
    }

    const pr = projects.find((x) => x.id === seg[1] || x.ref === decodeURIComponent(seg[1] || '').toUpperCase());
    if (!pr) throw new HttpError(404, 'Project not found.');
    const save = async (me, text, auditType, meta = {}) => {
      pr.updated_at = nowIso();
      if (text) hist(pr, me, text);
      await putDoc(env, 'projects', pr);
      if (auditType) await c.audit(auditType, pr.ref, 'SUCCESS', meta);
      return json({ success: true, project: withFinance(pr) });
    };

    if (seg.length === 2 && method === 'GET') {
      await c.auth('projects:read');
      return json({ project: withFinance(pr) });
    }
    if (seg.length === 2 && method === 'PATCH') {
      const me = await c.auth('projects:create');
      const before = contractValue(pr);
      for (const k of ['title', 'customer_name', 'company', 'service', 'notes']) if (body[k] !== undefined) pr[k] = str(body[k], k === 'notes' ? 3000 : 160);
      if ('owner_id' in body) pr.owner_id = str(body.owner_id, 60) || null;
      if (body.plan !== undefined || body.amount !== undefined || body.amount_per_period !== undefined || body.milestones !== undefined || body.periods !== undefined || body.start_date !== undefined || body.due_date !== undefined) {
        Object.assign(pr, { amount: undefined, amount_per_period: undefined, periods: undefined, milestones: undefined, due_date: undefined }, planFields(body, pr));
      }
      const after = contractValue(pr);
      // changing the money on an approved deal sends it back for approval
      if (after !== before && ['pending_approval', 'approved', 'active'].includes(pr.status)) {
        pr.status = 'pending_approval';
        pr.approval = { required_role: requiredApprover(after), requested_by: me.id, requested_by_name: me.name, requested_at: nowIso(), decision: null };
        const full = withFinance(pr);
        mail(c, 'staff:approval-needed', pr.ref, async () => notifyApprovalNeeded(env, full, me.name, await approvers(pr.approval.required_role)));
        return save(me, `Value changed from ₹${before} to ₹${after}; sent for re-approval`, 'PROJECT_UPDATED', { before, after });
      }
      return save(me, 'Details updated', 'PROJECT_UPDATED');
    }
    if (seg[2] === 'submit' && method === 'POST') {
      const me = await c.auth('projects:create');
      if (!['draft', 'rejected'].includes(pr.status)) throw new HttpError(400, 'Only draft or rejected projects can be sent for approval.');
      const value = contractValue(pr);
      pr.status = 'pending_approval';
      pr.approval = { required_role: requiredApprover(value), requested_by: me.id, requested_by_name: me.name, requested_at: nowIso(), decision: null };
      const full = withFinance(pr);
      mail(c, 'staff:approval-needed', pr.ref, async () => notifyApprovalNeeded(env, full, me.name, await approvers(pr.approval.required_role)));
      return save(me, `Sent for ${pr.approval.required_role === 'super_admin' ? 'Super Admin' : 'Admin'} approval (₹${value})`, 'PROJECT_SUBMITTED', { value, required: pr.approval.required_role });
    }
    if (seg[2] === 'decision' && method === 'POST') {
      const me = await c.auth('projects:approve');
      if (pr.status !== 'pending_approval') throw new HttpError(400, 'This project is not waiting for approval.');
      if (!canDecide(me, pr)) throw new HttpError(403, `Projects above ₹${APPROVAL_LIMIT.toLocaleString('en-IN')} need a Super Admin's approval.`);
      if (pr.approval.requested_by === me.id && me.role !== 'super_admin') throw new HttpError(403, 'You cannot approve a project you submitted. Ask another approver.');
      const decision = body.decision === 'approve' ? 'approved' : body.decision === 'reject' ? 'rejected' : null;
      if (!decision) throw new HttpError(400, 'Decision must be approve or reject.');
      const note = str(body.note, 1000);
      if (decision === 'rejected' && !note) throw new HttpError(400, 'Please give a reason for rejecting.');
      pr.status = decision;
      Object.assign(pr.approval, { decision, decided_by: me.id, decided_by_name: me.name, decided_at: nowIso(), note });
      if (decision === 'approved' && pr.lead_id) {
        const lead = (await getEnquiries(env)).find((e) => e.id === pr.lead_id);
        if (lead && lead.status !== 'WON') {
          (lead.activities = lead.activities || []).push(activity('status', `Won: project ${pr.ref} approved`, me));
          lead.status = 'WON'; lead.won_at = nowIso(); lead.updated_at = nowIso();
          await saveEnquiry(env, lead);
        }
      }
      const full = withFinance(pr);
      const creator = (await getUsers(env)).find((u) => u.id === pr.approval.requested_by);
      mail(c, 'staff:approval-decision', pr.ref, () => notifyApprovalDecision(env, full, me.name, [creator?.email]));
      return save(me, `${decision === 'approved' ? 'Approved' : 'Rejected'}${note ? `: ${note}` : ''}`, decision === 'approved' ? 'PROJECT_APPROVED' : 'PROJECT_REJECTED', { value: full.finance.value });
    }
    if (seg[2] === 'status' && method === 'POST') {
      const me = await c.auth('projects:create');
      const next = str(body.status, 20);
      const allowed = { approved: ['active', 'cancelled'], active: ['completed', 'cancelled'], draft: ['cancelled'], rejected: ['cancelled'], completed: ['active'] };
      if (!(allowed[pr.status] || []).includes(next)) throw new HttpError(400, `Cannot move a ${pr.status.replace('_', ' ')} project to ${next}.`);
      pr.status = next;
      return save(me, `Marked ${next}`, 'PROJECT_STATUS', { status: next });
    }
    if (seg[2] === 'payments' && seg.length === 3 && method === 'POST') {
      const me = await c.auth('payments:record');
      if (!WON_STATUSES.has(pr.status)) throw new HttpError(400, 'Payments can only be recorded on approved, active or completed projects.');
      const pay = {
        id: newId('pay'), amount: money(body.amount, 'Amount'), date: date(body.date || nowIso().slice(0, 10), 'Payment date'),
        method: PAYMENT_METHODS.includes(body.method) ? body.method : 'bank_transfer', reference: str(body.reference, 120), note: str(body.note, 500),
        recorded_by: me.id, recorded_by_name: me.name, recorded_at: nowIso(),
      };
      if (pay.date > nowIso().slice(0, 10)) throw new HttpError(400, 'Payment date cannot be in the future.');
      (pr.payments = pr.payments || []).push(pay);
      return save(me, `Payment of ₹${pay.amount} recorded (${pay.method.replace('_', ' ')}${pay.reference ? `, ref ${pay.reference}` : ''})`, 'PAYMENT_RECORDED', { amount: pay.amount });
    }
    if (seg[2] === 'payments' && seg[3] && method === 'DELETE') {
      const me = await c.auth('projects:delete');
      const pay = (pr.payments || []).find((x) => x.id === seg[3]);
      if (!pay) throw new HttpError(404, 'Payment not found.');
      pr.payments = pr.payments.filter((x) => x.id !== pay.id);
      return save(me, `Payment of ₹${pay.amount} removed`, 'PAYMENT_REMOVED', { amount: pay.amount });
    }
    if (seg.length === 2 && method === 'DELETE') {
      const me = await c.auth('projects:delete');
      pr.deleted_at = nowIso();
      return save(me, 'Archived', 'PROJECT_ARCHIVED');
    }
    throw new HttpError(404, 'Not found.');
  }

  if (path === '/api/roles' && method === 'GET') {
    await c.auth('users:read');
    return json({ roles: ROLE_PERMISSIONS });
  }

  if (seg[0] === 'customers' && method === 'GET') {
    await c.auth('enquiries:read');
    const [enquiries, tickets, projects] = await Promise.all([getEnquiries(env), getTickets(env), listDocs(env, 'projects')]);
    if (seg.length === 1) {
      const q = (url.searchParams.get('search') || '').toLowerCase();
      let list = buildCustomers(enquiries, tickets, projects);
      if (q) list = list.filter((x) => [x.name, x.email, x.company].some((f) => (f || '').toLowerCase().includes(q)));
      return json({ customers: list });
    }
    const profile = customerProfile(decodeURIComponent(seg[1]), enquiries, tickets, projects);
    if (!profile) throw new HttpError(404, 'Customer not found.');
    return json({ customer: profile });
  }

  throw new HttpError(404, 'Not found.');
}

/** Everything the dashboard and notifications need, loaded only if the role may see it. */
async function loadWorkspace(env, perms) {
  const want = (perm, loader) => (perms.includes(perm) ? loader() : Promise.resolve([]));
  const [users, tickets, enquiries, content, audit, analytics, projects] = await Promise.all([
    getUsers(env),
    want('tickets:read', () => getTickets(env)),
    want('enquiries:read', () => getEnquiries(env)),
    want('content:read', () => listDocs(env, 'content')),
    want('audit:read', () => listDocs(env, 'audit', { limit: 2000 })),
    getValue(env, 'analytics', emptyAnalytics()),
    want('projects:read', () => listDocs(env, 'projects')),
  ]);
  return { users, tickets, enquiries, content, audit, analytics, projects };
}

/* ═══════════════════════════════════════════════════════════
   Daily digest (cron: 03:30 UTC = 09:00 IST)
═══════════════════════════════════════════════════════════ */

async function runDailyDigest(env) {
  if (!mailConfigured(env)) return { skipped: 'email not configured' };
  const now = Date.now();
  const [users, tickets, enquiries, projects] = await Promise.all([getUsers(env), getTickets(env), getEnquiries(env), listDocs(env, 'projects')]);
  const live = projects.filter((p) => !p.deleted_at).map((p) => withFinance(p, now));
  const name = (id) => users.find((u) => u.id === id)?.name || 'Unassigned';
  const openLeads = enquiries.filter((e) => !e.deleted_at && !['WON', 'LOST'].includes(e.status));
  const groups = [
    {
      title: 'Tickets past their response or resolution target',
      items: tickets.filter((t) => !t.deleted_at && !CLOSED_TICKET_STATUSES.includes(t.status)).map((t) => withSla(t, now))
        .filter((t) => t.sla.response.state === 'breached' || t.sla.resolution.state === 'breached')
        .map((t) => ({ label: `${t.public_id} · ${t.subject}`, detail: `${t.priority} priority · ${name(t.assigned_to)} · ${t.requester_email}` })),
    },
    {
      title: 'Lead follow-ups due or overdue',
      items: openLeads.filter((e) => e.follow_up_at && Date.parse(e.follow_up_at) <= now + 12 * 3600 * 1000)
        .map((e) => ({ label: `${e.name}${e.company ? ` (${e.company})` : ''}`, detail: `Due ${e.follow_up_at.slice(0, 10)} · ${name(e.owner_id)} · ${e.service_name}` })),
    },
    {
      title: 'Leads not contacted within 24 hours',
      items: openLeads.filter((e) => !e.first_response_at && leadClock(e, now).state === 'breached')
        .map((e) => ({ label: `${e.name} · ${e.email}`, detail: `Came in ${e.created_at.slice(0, 10)} · ${e.service_name} · ${name(e.owner_id)}` })),
    },
  ];
  groups.push(
    {
      title: 'Projects waiting for approval',
      items: live.filter((p) => p.status === 'pending_approval').map((p) => ({ label: `${p.ref} · ${p.title} · Rs ${p.finance.value.toLocaleString('en-IN')}`, detail: `Needs ${p.approval?.required_role === 'super_admin' ? 'Super Admin' : 'Admin'} · requested by ${p.approval?.requested_by_name}` })),
    },
    {
      title: 'Customer payments overdue',
      items: live.filter((p) => WON_STATUSES.has(p.status) && p.finance.overdue > 0).map((p) => ({ label: `${p.customer_name} · Rs ${p.finance.overdue.toLocaleString('en-IN')} overdue`, detail: `${p.ref} · ${p.title}` })),
    },
  );
  if (!groups.some((g) => g.items.length)) return { skipped: 'nothing due' };
  const r = await sendDigest(env, null, groups);
  const entry = { id: newId('aud'), type: r.ok ? 'EMAIL_SENT' : 'EMAIL_FAILED', timestamp: nowIso(), userId: 'system', role: 'system', reqId: 'CRON', ip: '', userAgent: 'cron', target: 'daily-digest', action: 'DAILY_DIGEST', result: r.ok ? 'SUCCESS' : 'FAILED', metadata: { label: 'digest', status: r.status, error: r.error } };
  await putDoc(env, 'audit', entry);
  return { sent: r.ok, items: groups.reduce((n, g) => n + g.items.length, 0) };
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

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDailyDigest(env).then((r) => console.log('[digest]', JSON.stringify(r))));
  },
};
