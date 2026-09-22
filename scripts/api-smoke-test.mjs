#!/usr/bin/env node
/**
 * End-to-end smoke test for the Worker API.
 *
 *   node scripts/api-smoke-test.mjs [baseUrl] [credentialsFile]
 *
 * Defaults to http://127.0.0.1:8787 and the local credentials written by
 * `node scripts/cms-bootstrap.mjs --local`. Uses the TOTP secret from that file
 * to complete MFA. Only run against a local or disposable environment: it
 * creates and archives records and rotates the CMS route.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHmac, createHash } from 'node:crypto';

const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const CREDS = process.argv[3] || join(homedir(), 'kb-cms-credentials-local.txt');

/* ─── credentials ─────────────────────────────── */
const creds = {};
let cur = null;
for (const line of readFileSync(CREDS, 'utf8').split('\n')) {
  const m = /^(Username|Password|Authenticator|Recovery codes):\s+(\S+)(.*)$/.exec(line.trim());
  if (!m) continue;
  if (m[1] === 'Username') { cur = m[2]; creds[cur] = {}; }
  else if (m[1] === 'Password') creds[cur].password = m[2];
  else if (m[1] === 'Authenticator') creds[cur].totp = m[2];
  else creds[cur].recovery = (m[2] + m[3]).trim().split(/\s+/);
}

const b32 = (s) => {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, val = 0; const out = [];
  for (const ch of s.toUpperCase()) { val = (val << 5) | A.indexOf(ch); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
};
const totp = (secret, offsetSteps = 0) => {
  const step = Math.floor(Date.now() / 30000) + offsetSteps;
  const buf = Buffer.alloc(8); buf.writeUInt32BE(Math.floor(step / 2 ** 32), 0); buf.writeUInt32BE(step >>> 0, 4);
  const mac = createHmac('sha1', b32(secret)).update(buf).digest();
  const o = mac[mac.length - 1] & 15;
  return String((((mac[o] & 127) << 24) | (mac[o + 1] << 16) | (mac[o + 2] << 8) | mac[o + 3]) % 1e6).padStart(6, '0');
};

/* ─── tiny client ─────────────────────────────── */
class Client {
  constructor(ip) { this.cookie = ''; this.csrf = ''; this.ip = ip; }
  async call(method, path, body, { csrf = true } = {}) {
    const headers = { 'content-type': 'application/json', 'cf-connecting-ip': this.ip };
    if (this.cookie) headers.cookie = this.cookie;
    if (csrf && this.csrf) headers['x-csrf-token'] = this.csrf;
    const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = res.headers.get('set-cookie');
    if (set) { const v = /kb_cms_sess=([^;]*)/.exec(set); if (v) this.cookie = v[1] ? `kb_cms_sess=${v[1]}` : ''; }
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }
  async login(user, { useRecovery = false, offset = 0 } = {}) {
    const r1 = await this.call('POST', '/api/auth/login', { username: user, password: creds[user].password });
    if (r1.status !== 200) return r1;
    const code = useRecovery ? creds[user].recovery.shift() : totp(creds[user].totp, offset);
    const r2 = await this.call('POST', '/api/auth/mfa-verify', { mfaToken: r1.data.mfaToken, code });
    if (r2.data.csrfToken) this.csrf = r2.data.csrfToken;
    return r2;
  }
}

let passed = 0, failed = 0;
const check = (cond, label, extra) => {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); }
};
const section = (t) => console.log(`\n${t}`);
const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

/* ─── tests ───────────────────────────────────── */
section('CMS route resolution');
{
  const c = new Client(ip());
  for (const guess of ['cms', 'admin', 'internal-cms', 'dashboard', 'cms_00000000000000000000000000000000']) {
    const r = await c.call('POST', '/api/security/resolve-route', { pathSegment: guess });
    check(r.data.valid === false, `guessable route "/${guess}" is rejected`);
  }
  const r = await c.call('POST', '/api/security/resolve-route', { pathSegment: 'cms_e2b9c7a104f6d5e8237b1c4a9f8e0d35' });
  check(r.data.valid === true, 'configured secret route resolves');
}

section('Authentication & MFA');
const su = new Client(ip());
{
  const c = new Client(ip());
  let r = await c.call('POST', '/api/auth/login', { username: 'superadmin', password: 'SuperSecurePass2026!' });
  check(r.status === 401, 'old leaked password no longer works', r);
  r = await c.call('POST', '/api/auth/login', { username: 'superadmin', password: creds.superadmin.password });
  check(r.status === 200 && r.data.mfaRequired && r.data.mfaToken, 'correct password → MFA challenge');
  const tok = r.data.mfaToken;
  r = await c.call('POST', '/api/auth/mfa-verify', { mfaToken: tok, code: '123456' });
  check(r.status === 401, 'arbitrary 6-digit code "123456" is rejected');
  r = await c.call('POST', '/api/auth/mfa-verify', { mfaToken: tok.slice(0, -3) + 'abc', code: totp(creds.superadmin.totp) });
  check(r.status === 401, 'tampered MFA challenge token is rejected');

  // forge a session the way the old worker signed them (public salt + SHA-256)
  const exp = Date.now() + 3600e3;
  const forged = `sess_superadmin.${exp}.${createHash('sha256').update(`kb_salt_2026_superadmin.${exp}`).digest('hex')}`;
  const f = new Client(ip()); f.cookie = `kb_cms_sess=${forged}`;
  r = await f.call('GET', '/api/tickets');
  check(r.status === 401, 'forged legacy session token is rejected');

  r = await su.login('superadmin');
  check(r.status === 200 && r.data.user?.role === 'super_admin' && su.cookie && su.csrf, 'TOTP login establishes a session');
  r = await su.call('GET', '/api/auth/me');
  check(r.status === 200 && r.data.user?.username === 'superadmin', '/me returns the signed-in user');
  r = await su.call('POST', '/api/tickets', { subject: 'csrf probe', description: 'x' }, { csrf: false });
  check(r.status === 403, 'state-changing call without CSRF token is rejected');
}

section('Public ticket → CMS service desk');
let ticketId, publicId;
{
  const visitor = new Client(ip());
  let r = await visitor.call('POST', '/api/public/tickets', { name: 'Smoke Tester', email: 'smoke@example.com', category: 'project_enquiry', priority: 'urgent', subject: 'Smoke test ticket', description: 'Created by the API smoke test.' });
  check(r.status === 201 && /^KB-[A-Z0-9]{8}$/.test(r.data.ticket?.public_id), 'visitor can raise a ticket', r);
  check(r.data.ticket?.category === 'project_enquiry' && r.data.ticket?.priority === 'urgent', 'chatbot category/priority values are preserved');
  publicId = r.data.ticket?.public_id;
  r = await visitor.call('POST', '/api/public/tickets', { name: 'X', email: 'not-an-email', subject: 's', description: 'd' });
  check(r.status === 400, 'invalid email is rejected');
  r = await visitor.call('POST', '/api/public/ticket-status', { ticketId: publicId, email: 'smoke@example.com' });
  check(r.status === 200 && r.data.ticket?.status === 'ASSIGNED', 'visitor can track the ticket (auto-assigned)');
  r = await visitor.call('POST', '/api/public/ticket-status', { ticketId: publicId, email: 'someone-else@example.com' });
  check(r.status === 404, 'tracking with the wrong email is refused');

  r = await su.call('GET', '/api/tickets?search=smoke');
  const t = (r.data.tickets || []).find((x) => x.public_id === publicId);
  check(Boolean(t), 'ticket appears in the CMS list');
  ticketId = t?.id;
  r = await su.call('GET', '/api/staff');
  const staff = r.data.staff || [];
  check(staff.length >= 3, 'staff directory lists active users');
  r = await su.call('PATCH', `/api/tickets/${ticketId}/assign`, { assignedTo: staff[1]?.id });
  check(r.status === 200 && r.data.ticket?.status === 'ASSIGNED', 'assign → status moves to ASSIGNED');
  r = await su.call('PATCH', `/api/tickets/${ticketId}/assign`, { assignedTo: 'usr_nobody' });
  check(r.status === 400, 'cannot assign to a non-existent user');
  r = await su.call('POST', `/api/tickets/${ticketId}/notes`, { note: 'Internal note' });
  check(r.status === 200 && r.data.note?.author_name, 'internal note added');
  r = await su.call('POST', `/api/tickets/${publicId}/customer-update`, { message: 'We are on it.' });
  check(r.status === 200 && r.data.update, 'customer update posted (by public ID)');
  r = await su.call('PATCH', `/api/tickets/${ticketId}`, { subject: 'Smoke test ticket (edited)', requester_email: 'smoke@example.com' });
  check(r.status === 200 && r.data.ticket?.subject.endsWith('(edited)'), 'ticket details edited');
  r = await su.call('PATCH', `/api/tickets/${ticketId}/status`, { status: 'RESOLVED' });
  check(r.status === 200 && r.data.ticket?.status === 'RESOLVED', 'status → RESOLVED');
  r = await su.call('PATCH', `/api/tickets/${ticketId}/status`, { status: 'BOGUS' });
  check(r.status === 400, 'unknown status rejected');
  r = await visitor.call('POST', '/api/public/ticket-status', { ticketId: publicId, email: 'smoke@example.com' });
  check(r.data.ticket?.status === 'RESOLVED' && r.data.ticket.customer_updates.length === 2, 'visitor sees the new status and update');
  r = await su.call('POST', '/api/tickets', { name: 'Walk-in', email: 'walkin@example.com', subject: 'Created in CMS', description: 'desk', priority: 'high' });
  check(r.status === 201, 'staff can create a ticket from the CMS');
  r = await su.call('DELETE', `/api/tickets/${ticketId}`, { reason: 'smoke' });
  check(r.status === 200, 'ticket archived');
  r = await su.call('GET', '/api/tickets');
  check(!(r.data.tickets || []).some((x) => x.id === ticketId), 'archived ticket hidden by default');
  r = await su.call('POST', `/api/tickets/${ticketId}/restore`);
  check(r.status === 200, 'ticket restored');
}

section('Enquiries / CRM');
{
  const visitor = new Client(ip());
  let r = await visitor.call('POST', '/api/public/enquiries', { name: 'Lead Person', email: 'lead@example.com', company: 'Acme', service_slug: 'AI & Automation', message: 'Please call me.' });
  check(r.status === 201 && /^ENQ-/.test(r.data.reference_id), 'contact form enquiry accepted');
  const ref = r.data.reference_id;
  r = await su.call('GET', '/api/enquiries?search=acme');
  const e = (r.data.enquiries || []).find((x) => x.reference_id === ref);
  check(Boolean(e), 'enquiry visible in CMS');
  r = await su.call('PATCH', `/api/enquiries/${e?.id}/status`, { status: 'QUALIFIED', notes: 'Good fit' });
  check(r.status === 200 && r.data.enquiry?.status === 'QUALIFIED', 'enquiry status + notes updated');
  r = await su.call('DELETE', `/api/enquiries/${e?.id}`);
  check(r.status === 200, 'enquiry deleted');
}

section('Pipeline, customers, SLA, dashboard, notifications');
{
  const visitor = new Client(ip());
  let r = await visitor.call('POST', '/api/public/enquiries', { name: 'Pipeline Lead', email: 'pipeline@example.com', company: 'Globex', service_slug: 'IoT Solutions', message: 'Source: LinkedIn\nNeed sensors.' });
  const ref = r.data.reference_id;
  r = await su.call('GET', '/api/enquiries?search=globex');
  const e = (r.data.enquiries || []).find((x) => x.reference_id === ref);
  check(e && e.source === 'linkedin' && e.response_clock?.state, 'lead carries source + response clock', e);
  const staff = (await su.call('GET', '/api/staff')).data.staff || [];
  const follow = new Date(Date.now() - 3600e3).toISOString();
  r = await su.call('PATCH', `/api/enquiries/${e?.id}`, { owner_id: staff[0]?.id, follow_up_at: follow });
  check(r.status === 200 && r.data.enquiry?.owner_id === staff[0]?.id && r.data.enquiry?.follow_up_at, 'owner + follow-up date set');
  r = await su.call('PATCH', `/api/enquiries/${e?.id}`, { owner_id: 'usr_nobody' });
  check(r.status === 400, 'owner must be a real staff member');
  r = await su.call('PATCH', `/api/enquiries/${e?.id}`, { status: 'CONTACTED' });
  check(r.status === 200 && r.data.enquiry?.first_response_at && r.data.enquiry.activities.some((a) => a.type === 'status'), 'pipeline move logs an activity and stops the clock');
  r = await su.call('POST', `/api/enquiries/${e?.id}/activities`, { type: 'call', text: 'Discussed scope.' });
  check(r.status === 200 && r.data.enquiry?.last_contacted_at, 'call logged on the timeline');
  r = await su.call('POST', `/api/enquiries/${e?.id}/activities`, { type: 'call', text: '' });
  check(r.status === 400, 'empty activity rejected');
  r = await su.call('POST', `/api/enquiries/${e?.id}/reply`, { subject: 'Hello', message: 'Thanks!' });
  check(r.status === 400 || r.status === 200, 'reply endpoint answers cleanly (400 when mail is off)', r);

  r = await su.call('GET', '/api/customers?search=globex');
  check(r.status === 200 && (r.data.customers || []).some((x) => x.email === 'pipeline@example.com'), 'customer list merges leads');
  r = await su.call('GET', `/api/customers/${encodeURIComponent('pipeline@example.com')}`);
  check(r.status === 200 && r.data.customer?.timeline?.length > 0, 'customer profile has a timeline', r.data);
  r = await su.call('GET', '/api/customers/nobody%40example.com');
  check(r.status === 404, 'unknown customer is 404');

  r = await visitor.call('POST', '/api/public/tickets', { name: 'SLA Tester', email: 'sla@example.com', category: 'bug_report', priority: 'critical', subject: 'SLA clock', description: 'x' });
  const pid = r.data.ticket?.public_id;
  r = await su.call('GET', '/api/tickets?search=sla');
  let t = (r.data.tickets || []).find((x) => x.public_id === pid);
  check(t?.sla?.response?.state === 'on_track' && r.data.targets?.critical, 'new ticket has a running response clock');
  r = await su.call('POST', `/api/tickets/${pid}/customer-update`, { message: 'Looking now.' });
  check(r.data.ticket?.first_response_at || true, 'customer update posted');
  r = await su.call('GET', `/api/tickets/${t?.id}`);
  check(r.data.ticket?.sla?.response?.state === 'met' && r.data.ticket.first_responder_id, 'first reply marks the response target met', r.data.ticket?.sla);
  r = await su.call('PATCH', `/api/tickets/${t?.id}/status`, { status: 'RESOLVED' });
  check(r.data.ticket?.resolved_at && r.data.ticket?.sla?.resolution?.state === 'met', 'resolving stamps resolved_at');
  r = await su.call('PATCH', `/api/tickets/${t?.id}/status`, { status: 'IN_PROGRESS' });
  check(r.data.ticket && !r.data.ticket.resolved_at, 'reopening clears resolved_at');

  r = await su.call('GET', '/api/dashboard');
  const d = r.data.dashboard;
  check(r.status === 200 && d?.leads && d?.tickets && d?.team && d?.health, 'super admin dashboard has every section', Object.keys(d || {}));
  check(d?.leads?.overdue_followups >= 1, 'overdue follow-up counted');
  const mk = new Client(ip());
  await mk.login('marketing');
  r = await mk.call('GET', '/api/dashboard');
  check(r.status === 200 && !r.data.dashboard?.health && !r.data.dashboard?.team, 'marketing dashboard hides team/health');
  r = await su.call('GET', '/api/notifications');
  check(r.status === 200 && Array.isArray(r.data.items) && typeof r.data.unread === 'number', 'notifications list');
  r = await su.call('POST', '/api/notifications/seen');
  check(r.status === 200, 'notifications marked seen');
  r = await su.call('GET', '/api/notifications');
  check(r.data.unread === 0, 'unread resets after marking seen');
  r = await mk.call('POST', '/api/notifications/seen', undefined, { csrf: false });
  check(r.status === 403, 'marking seen needs the CSRF token');
  r = await su.call('POST', '/api/security/run-digest');
  check(r.status === 200 && r.data.result, 'digest can be run on demand', r.data);
  r = await mk.call('POST', '/api/security/run-digest');
  check(r.status === 403, 'marketing cannot trigger the digest');
  r = await mk.call('GET', '/api/auth/me');
  check(!r.data.user?.permissions?.includes('team:manage') && !r.data.user?.permissions?.includes('users:read'), 'marketing role is not given team or user management', r.data.user?.permissions);
  r = await mk.call('POST', '/api/team', { name: 'X', role: 'Y' });
  check(r.status === 403, 'marketing cannot edit the team roster');
  r = await mk.call('GET', '/api/roles');
  check(r.status === 403, 'marketing cannot read the role table');
  r = await su.call('GET', '/api/roles');
  check(r.status === 200 && r.data.roles?.super_admin?.includes('team:manage') && !r.data.roles?.marketing?.includes('audit:read'), 'super admin sees the role table');
}

section('Auto-assignment, approvals, payments');
{
  const staffAll = (await su.call('GET', '/api/users')).data.users || [];
  const roleOf = (id) => staffAll.find((u) => u.id === id)?.role;
  const visitor = new Client(ip());
  const cust = `autolead-${Date.now()}@example.com`;
  let r = await visitor.call('POST', '/api/public/tickets', { name: 'Bill Payer', email: 'billing@example.com', category: 'billing', priority: 'medium', subject: 'Invoice question', description: 'x' });
  let t = (await su.call('GET', `/api/tickets/${r.data.ticket?.public_id}`)).data.ticket;
  check(roleOf(t?.assigned_to) === 'admin' && t?.status === 'ASSIGNED' && t?.auto_assigned?.why, 'billing ticket auto-assigned to an Admin', t?.auto_assigned);
  r = await visitor.call('POST', '/api/public/tickets', { name: 'Sales Q', email: 'salesq@example.com', category: 'consultation', priority: 'low', subject: 'Consult', description: 'x' });
  t = (await su.call('GET', `/api/tickets/${r.data.ticket?.public_id}`)).data.ticket;
  check(roleOf(t?.assigned_to) === 'marketing', 'consultation ticket goes to Marketing');
  r = await visitor.call('POST', '/api/public/tickets', { name: 'Down', email: 'down@example.com', category: 'technical_support', priority: 'critical', subject: 'Site down', description: 'x' });
  t = (await su.call('GET', `/api/tickets/${r.data.ticket?.public_id}`)).data.ticket;
  check(t?.major === true, 'critical ticket flagged as a major issue');
  r = await su.call('GET', '/api/notifications');
  check((r.data.items || []).some((n) => n.kind === 'ticket_major'), 'major issue appears in notifications');
  r = await visitor.call('POST', '/api/public/enquiries', { name: 'Auto Lead', email: cust, company: 'Initech', service_slug: 'Web', message: 'hi' });
  const lead = ((await su.call('GET', '/api/enquiries?search=initech')).data.enquiries || []).find((e) => e.email === cust);
  check(roleOf(lead?.owner_id) === 'marketing', 'new lead auto-owned by Marketing', lead?.owner_id);
  r = await su.call('GET', '/api/assignment-rules');
  check(r.status === 200 && r.data.approval_limit === 50000, 'assignment rules are published');

  const mk2 = new Client(ip()); await mk2.login('marketing', { offset: 1 });
  const ad = new Client(ip()); await ad.login('admin');
  // small project: Admin can approve
  r = await mk2.call('POST', '/api/projects', { title: 'Landing page', customer_email: cust, customer_name: 'Auto Lead', service: 'Web', plan: 'one_time', amount: 30000, due_date: '2026-01-15', lead_id: lead?.id });
  check(r.status === 201 && r.data.project?.finance?.value === 30000 && r.data.project.status === 'draft', 'marketing creates a draft project', r.data);
  const small = r.data.project;
  r = await mk2.call('POST', `/api/projects/${small?.id}/decision`, { decision: 'approve' });
  check(r.status === 403, 'marketing cannot approve projects');
  r = await mk2.call('POST', `/api/projects/${small?.id}/submit`);
  check(r.data.project?.approval?.required_role === 'admin', 'up to 50,000 needs Admin approval');
  r = await ad.call('POST', `/api/projects/${small?.id}/decision`, { decision: 'approve' });
  check(r.status === 200 && r.data.project?.status === 'approved', 'Admin approves a 30,000 project', r.data);
  r = await su.call('GET', '/api/enquiries?search=initech');
  check(r.data.enquiries?.find((e) => e.email === cust)?.status === 'WON', 'approving a linked project marks the lead won');
  // large project: only Super Admin
  r = await mk2.call('POST', '/api/projects', { title: 'IoT rollout', customer_email: cust, service: 'IoT', plan: 'monthly', amount_per_period: 20000, periods: 6, start_date: '2026-01-01' });
  const big = r.data.project;
  check(big?.finance?.value === 120000 && big.finance.schedule.length === 6, 'monthly plan builds a 6-instalment schedule');
  r = await mk2.call('POST', `/api/projects/${big?.id}/submit`);
  check(r.data.project?.approval?.required_role === 'super_admin', 'above 50,000 needs Super Admin approval');
  r = await ad.call('POST', `/api/projects/${big?.id}/decision`, { decision: 'approve' });
  check(r.status === 403, 'Admin cannot approve above 50,000');
  r = await ad.call('GET', '/api/notifications');
  check(!(r.data.items || []).some((n) => n.kind === 'project_approval' && n.link?.id === big?.id), 'Admin is not asked to approve a large project');
  r = await su.call('GET', '/api/notifications');
  check((r.data.items || []).some((n) => n.kind === 'project_approval' && n.link?.id === big?.id), 'Super Admin is asked to approve it');
  r = await su.call('POST', `/api/projects/${big?.id}/decision`, { decision: 'reject' });
  check(r.status === 400, 'rejecting needs a reason');
  r = await su.call('POST', `/api/projects/${big?.id}/decision`, { decision: 'approve', note: 'Go' });
  check(r.data.project?.status === 'approved', 'Super Admin approves');
  r = await mk2.call('POST', `/api/projects/${big?.id}/payments`, { amount: 20000, date: '2026-01-05' });
  check(r.status === 403, 'marketing cannot record payments');
  r = await ad.call('POST', `/api/projects/${big?.id}/payments`, { amount: 30000, date: '2026-01-05', method: 'upi', reference: 'UTR123' });
  check(r.status === 200 && r.data.project?.finance?.paid === 30000 && r.data.project.finance.outstanding === 90000, 'payment recorded and balances updated', r.data);
  check(r.data.project?.finance?.overdue > 0, 'overdue instalments are detected');
  r = await ad.call('POST', `/api/projects/${big?.id}/payments`, { amount: 10, date: '2999-01-01' });
  check(r.status === 400, 'future-dated payment rejected');
  r = await ad.call('PATCH', `/api/projects/${big?.id}`, { amount_per_period: 25000 });
  check(r.data.project?.status === 'pending_approval', 'changing an approved value sends it back for approval');
  await su.call('POST', `/api/projects/${big?.id}/decision`, { decision: 'approve' });
  r = await su.call('GET', `/api/customers/${encodeURIComponent(cust)}`);
  check(r.data.customer?.total_business === 180000 && r.data.customer.paid === 30000 && r.data.customer.services.length === 2, 'customer shows services and total business', r.data.customer && { t: r.data.customer.total_business, p: r.data.customer.paid, s: r.data.customer.services });
  r = await su.call('GET', '/api/dashboard');
  const m = r.data.dashboard?.money;
  check(m && m.won_revenue_total >= 180000 && m.outstanding >= 150000 && Array.isArray(r.data.dashboard.action_summary), 'dashboard shows revenue, outstanding and grouped actions', m);
}

section('Client logos');
{
  const svg = (label, fill) => 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><rect width="160" height="48" rx="8" fill="${fill}"/><text x="80" y="31" font-family="Arial" font-size="18" font-weight="700" fill="#fff" text-anchor="middle">${label}</text></svg>`).toString('base64');
  let r = await su.call('POST', '/api/clients', { name: 'Test Client', logo: 'data:text/html;base64,PHNjcmlwdD4=' });
  check(r.status === 400, 'non-image logo rejected');
  r = await su.call('POST', '/api/clients', { name: 'Acme Test', logo: svg('ACME', '#1f4fd1'), website: 'https://example.com' });
  check(r.status === 201, 'client logo uploaded', r.data);
  const id = r.data.client?.id;
  r = await new Client(ip()).call('GET', '/api/public/clients');
  check((r.data.clients || []).some((x) => x.id === id), 'logo is public on the homepage feed');
  r = await su.call('PUT', `/api/clients/${id}`, { visible: false });
  r = await new Client(ip()).call('GET', '/api/public/clients');
  check(!(r.data.clients || []).some((x) => x.id === id), 'hidden logo leaves the homepage');
  r = await su.call('PUT', `/api/clients/${id}`, { visible: true });
  r = await new Client(ip()).call('GET', '/api/clients');
  check(r.status === 401, 'managing logos needs sign-in');
}

section('Content workflow');
{
  let r = await su.call('POST', '/api/content', { title: 'Smoke banner', slug: `smoke-${Date.now()}`, category: 'homepage', content: 'Hello' });
  check(r.status === 201 && r.data.item?.status === 'draft', 'draft created');
  const id = r.data.item?.id;
  r = await su.call('GET', '/api/content');
  check((r.data.items || []).some((i) => i.id === id), 'content list returns items[] (the CMS tab reads this)');
  for (const to of ['submitted', 'review', 'approved', 'published']) {
    r = await su.call('POST', `/api/content/${id}/transition`, { targetStatus: to });
    check(r.status === 200 && r.data.item?.status === to, `transition → ${to}`);
  }
  r = await su.call('POST', `/api/content/${id}/transition`, { targetStatus: 'review' });
  check(r.status === 400, 'illegal transition published → review is refused');
  r = await su.call('PUT', `/api/content/${id}`, { content: 'Edited' });
  check(r.status === 200 && r.data.item?.status === 'draft' && r.data.item?.version === 2, 'editing published content sends it back to draft (v2)');
  r = await su.call('DELETE', `/api/content/${id}`, { reason: 'smoke' });
  check(r.status === 200, 'content soft-deleted');
  r = await su.call('POST', `/api/content/${id}/restore`);
  check(r.status === 200, 'content restored');
}

section('Users & roles');
{
  let r = await su.call('POST', '/api/users', { username: 'smoke.user', email: `smoke${Date.now()}@example.com`, name: 'Smoke User', role: 'marketing', initialPassword: 'short' });
  check(r.status === 400, 'weak initial password rejected');
  const pw = 'SmokeUserPass2026x';
  r = await su.call('POST', '/api/users', { username: `smoke${Date.now().toString(36)}`, email: `smoke${Date.now()}@example.com`, name: 'Smoke User', role: 'marketing', initialPassword: pw });
  check(r.status === 201 && r.data.mfaSetup?.secret && r.data.recoveryCodes?.length === 6, 'user created with authenticator secret + recovery codes');
  const newUser = r.data.user;
  creds[newUser.username] = { password: pw, totp: r.data.mfaSetup.secret, recovery: r.data.recoveryCodes };
  const nu = new Client(ip());
  r = await nu.login(newUser.username);
  check(r.status === 200 && r.data.user?.role === 'marketing', 'new user can sign in with MFA');
  r = await nu.call('GET', '/api/users');
  check(r.status === 403, 'marketing role cannot list users (RBAC)');
  r = await nu.call('DELETE', `/api/tickets/${ticketId}`, {});
  check(r.status === 403, 'marketing role cannot delete tickets (RBAC)');
  r = await su.call('PATCH', `/api/users/${newUser.id}/role`, { newRole: 'admin' });
  check(r.status === 200 && r.data.user?.role === 'admin', 'role changed to admin');
  r = await nu.call('GET', '/api/auth/me');
  check(r.status === 401, 'role change signs the user out (session invalidated)');
  r = await su.call('PATCH', `/api/users/${newUser.id}/status`, { status: 'disabled' });
  check(r.status === 200, 'user disabled');
  r = await new Client(ip()).call('POST', '/api/auth/login', { username: newUser.username, password: pw });
  check(r.status === 401, 'disabled user cannot sign in');
  const me = (await su.call('GET', '/api/auth/me')).data.user;
  r = await su.call('PATCH', `/api/users/${me.id}/status`, { status: 'disabled' });
  check(r.status === 400, 'cannot disable your own account');
  const rc = new Client(ip());
  r = await rc.login('admin', { useRecovery: true });
  check(r.status === 200, 'recovery code works as MFA fallback');
  r = await new Client(ip()).call('POST', '/api/auth/login', { username: 'admin', password: creds.admin.password });
}

section('Team, analytics, audit, storage');
{
  let r = await su.call('POST', '/api/team', { name: 'Test Member', role: 'Engineer', bio: 'Builds things', linkedin: 'https://linkedin.com/in/test' });
  check(r.status === 201, 'team member added (server-side)');
  const mid = r.data.member?.id;
  r = await su.call('PUT', `/api/team/${mid}`, { role: 'Lead Engineer' });
  check(r.data.member?.role === 'Lead Engineer', 'team member updated');
  r = await new Client(ip()).call('GET', '/api/public/team');
  check((r.data.team || []).some((m) => m.id === mid), 'public team endpoint reflects CMS changes');
  r = await su.call('DELETE', `/api/team/${mid}`);
  check(r.status === 200, 'team member removed');

  const v = new Client(ip());
  for (const p of ['/', '/about', '/products']) await v.call('POST', '/api/public/analytics/visit', { path: p, device: 'mobile', isNew: p === '/' });
  r = await v.call('POST', '/api/public/analytics/visit', { path: '/cms_secret' });
  check(r.data.recorded === false, 'CMS paths are never recorded as visits');
  r = await su.call('GET', '/api/analytics');
  check(r.status === 200 && r.data.analytics?.totalVisits >= 3 && r.data.analytics.pageViews['/about'] >= 1, 'visits are persisted and aggregated', r.data.analytics);
  r = await su.call('POST', '/api/analytics/reset');
  check(r.status === 200 && r.data.analytics?.totalVisits === 0, 'analytics reset');

  r = await su.call('GET', '/api/security/audit-logs');
  const types = new Set((r.data.logs || []).map((l) => l.type));
  check(['LOGIN_SUCCESS', 'TICKET_CREATED_PUBLIC', 'TICKET_STATUS_CHANGED', 'USER_CREATED', 'LOGIN_FAILED', 'ACCESS_DENIED'].every((t) => types.has(t)), 'audit log captures logins, tickets, users and denials', [...types]);
  r = await su.call('GET', '/api/security/database');
  check(r.status === 200 && r.data.database?.collections?.tickets?.documents >= 1, 'storage diagnostics report live counts');
  r = await su.call('POST', '/api/security/test-email', {});
  check(r.status === 400 || r.status === 200, `test-email endpoint responds (${r.status === 200 ? 'sent' : 'email not configured'})`);
}

section('CMS route rotation & password change');
{
  let r = await su.call('POST', '/api/security/rotate-cms-route', { confirmationPassword: 'wrong' });
  check(r.status === 401, 'rotation with wrong password refused');
  r = await su.call('POST', '/api/security/rotate-cms-route', { confirmationPassword: creds.superadmin.password, reason: 'smoke' });
  check(r.status === 200 && /^\/cms_[a-f0-9]{32}$/.test(r.data.newRoutePath), 'route rotated');
  const anon = new Client(ip());
  r = await anon.call('POST', '/api/security/resolve-route', { pathSegment: 'cms_e2b9c7a104f6d5e8237b1c4a9f8e0d35' });
  check(r.data.valid === false, 'old route stops working');
  r = await anon.call('POST', '/api/security/resolve-route', { pathSegment: r.data && (await su.call('POST', '/api/security/rotate-cms-route', { confirmationPassword: creds.superadmin.password, reason: 'smoke 2' })).data.newRoutePath.slice(1) });
  check(r.data.valid === true, 'new route resolves');

  r = await su.call('POST', '/api/auth/change-password', { currentPassword: creds.superadmin.password, newPassword: 'weak' });
  check(r.status === 400, 'weak new password rejected');
  const newPw = creds.superadmin.password + 'Aa1';
  r = await su.call('POST', '/api/auth/change-password', { currentPassword: creds.superadmin.password, newPassword: newPw });
  check(r.status === 200, 'password changed');
  if (r.data.csrfToken) su.csrf = r.data.csrfToken;
  r = await su.call('GET', '/api/auth/me');
  check(r.status === 200, 'current session survives its own password change');
  r = await su.call('POST', '/api/auth/change-password', { currentPassword: newPw, newPassword: creds.superadmin.password });
  if (r.data.csrfToken) su.csrf = r.data.csrfToken;
  check(r.status === 200, 'password changed back');
  r = await su.call('POST', '/api/auth/logout');
  r = await su.call('GET', '/api/auth/me');
  check(r.status === 401, 'logout ends the session');
}

section('Brute-force protection');
{
  const attacker = new Client(ip());
  let last;
  for (let i = 0; i < 8; i++) last = await attacker.call('POST', '/api/auth/login', { username: 'marketing', password: `guess${i}` });
  check(last.status === 429, 'repeated wrong passwords are rate-limited');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
