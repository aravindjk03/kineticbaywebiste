/**
 * Automated Enterprise Security & Penetration Test Suite
 * Tests every security boundary defined in the specification
 */

import http from 'node:http';
import { createServerApp } from './app.js';
import {
  USERS,
  getActiveCmsRoute,
  rotateCmsRoute,
  isOldCmsRoute,
  AUDIT_LOGS,
} from './store.js';
import { computeTotp } from './crypto.js';
import { SECURITY_CONFIG } from './config.js';
import { resetAllRateLimiters } from './middleware/rateLimiter.js';

let app;
let server;
let baseUrl = '';

// Helper to make HTTP requests
async function request(path, options = {}) {
  const url = new URL(path, baseUrl).toString();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const fetchOpts = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOpts.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOpts);
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  const setCookie = res.headers.get('set-cookie');
  const headersObj = {};
  for (const [k, v] of res.headers.entries()) {
    headersObj[k.toLowerCase()] = v;
  }

  return {
    status: res.status,
    headers: headersObj,
    body,
    cookie: setCookie,
  };
}

// Extract session cookie from Set-Cookie header
function extractSessionCookie(setCookieHeaders) {
  if (!setCookieHeaders) return '';
  const header = Array.isArray(setCookieHeaders) ? setCookieHeaders.join('; ') : setCookieHeaders;
  const match = header.match(new RegExp(`${SECURITY_CONFIG.SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? `${SECURITY_CONFIG.SESSION_COOKIE_NAME}=${match[1]}` : '';
}

// Authenticate helper to get session cookie
async function authenticateUser(username, password, totpSecret) {
  const userObj = USERS.find((u) => u.username === username || u.email === username);
  if (userObj && userObj.usedTotpSteps) {
    userObj.usedTotpSteps.clear();
  }

  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });

  if (!loginRes.body.mfaToken) {
    throw new Error(`Login step 1 failed: ${JSON.stringify(loginRes.body)}`);
  }

  const code = computeTotp(totpSecret);
  const mfaRes = await request('/api/auth/mfa-verify', {
    method: 'POST',
    body: { mfaToken: loginRes.body.mfaToken, code },
  });

  const cookie = extractSessionCookie(mfaRes.cookie);
  return { res: mfaRes, cookie, user: mfaRes.body.user };
}

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   KINETIC BAY ENTERPRISE SECURITY & ACCESS CONTROL TEST SUITE  ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  app = createServerApp();
  server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    resetAllRateLimiters();

    /* ─── TEST SUITE 1: SECURITY HEADERS ─────────────────────── */
    console.log('--- 1. Security Headers & Protocol Enforcement ---');
    const headRes = await request('/api/auth/login', { method: 'OPTIONS' });
    assert(headRes.headers['x-frame-options'] === 'DENY', 'X-Frame-Options is set to DENY');
    assert(headRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options is nosniff');
    assert(headRes.headers['strict-transport-security'].includes('max-age'), 'HSTS is configured');
    assert(headRes.headers['content-security-policy'].includes("frame-ancestors 'none'"), 'CSP blocks framing');
    assert(headRes.headers['referrer-policy'].includes('strict-origin'), 'Referrer policy is strict');

    /* ─── TEST SUITE 2: ROUTE OBFUSCATION ─────────────────────── */
    console.log('\n--- 2. CMS Route Obfuscation & Dynamic Resolution ---');
    resetAllRateLimiters();
    const activeRoute = getActiveCmsRoute();
    assert(activeRoute.startsWith('cms_') && activeRoute.length >= 32, 'Route identifier has >= 128-bit entropy');

    // Attempt obvious route probes
    const probeCms = await request('/api/security/resolve-route', {
      method: 'POST',
      body: { pathSegment: 'cms' },
    });
    assert(probeCms.status === 404 && probeCms.body.valid === false, 'Obvious /cms probe rejected (404)');

    const probeAdmin = await request('/api/security/resolve-route', {
      method: 'POST',
      body: { pathSegment: 'admin' },
    });
    assert(probeAdmin.status === 404 && probeAdmin.body.valid === false, 'Obvious /admin probe rejected (404)');

    const probeInternal = await request('/api/security/resolve-route', {
      method: 'POST',
      body: { pathSegment: 'internal-cms' },
    });
    assert(probeInternal.status === 404 && probeInternal.body.valid === false, 'Obvious /internal-cms probe rejected (404)');

    // Probe active route
    const probeActive = await request('/api/security/resolve-route', {
      method: 'POST',
      body: { pathSegment: activeRoute },
    });
    assert(probeActive.status === 200 && probeActive.body.valid === true, 'Active route successfully validated');
    assert(probeActive.body.requiresAuth === true, 'Active route requires authentication challenge');

    /* ─── TEST SUITE 3: AUTHENTICATION & TIMING-SAFE DECOY ───── */
    console.log('\n--- 3. Authentication, Scrypt Hashing & Decoys ---');
    resetAllRateLimiters();
    // Non-existent user
    const fakeRes = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'nonexistent', password: 'BadPassword123!' },
    });
    assert(fakeRes.status === 401, 'Non-existent user rejected (401)');
    assert(fakeRes.body.error.includes('Authentication failed'), 'Generic error returned (no username enumeration)');

    // Invalid password for real user
    const badPassRes = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'superadmin', password: 'WrongPassword!' },
    });
    assert(badPassRes.status === 401, 'Invalid password rejected (401)');
    assert(badPassRes.body.error.includes('Authentication failed'), 'Generic error returned (no password leak)');

    // Valid step 1 login using USERNAME
    const validStep1 = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'superadmin', password: 'SuperSecurePass2026!' },
    });
    assert(validStep1.status === 200 && validStep1.body.mfaRequired === true, 'Valid credentials require MFA');
    assert(Boolean(validStep1.body.mfaToken), 'MFA challenge token issued');

    /* ─── TEST SUITE 4: MFA TOTP & RECOVERY CODES ─────────────── */
    console.log('\n--- 4. MFA Two-Factor Challenge & Replay Defense ---');
    resetAllRateLimiters();
    const superUser = USERS.find((u) => u.username === 'superadmin');

    // Invalid TOTP code
    const badMfa = await request('/api/auth/mfa-verify', {
      method: 'POST',
      body: { mfaToken: validStep1.body.mfaToken, code: '000000' },
    });
    assert(badMfa.status === 401, 'Invalid MFA code rejected (401)');

    // Valid TOTP code
    const validTotpCode = computeTotp(superUser.mfaSecret);
    const validMfa = await request('/api/auth/mfa-verify', {
      method: 'POST',
      body: { mfaToken: validStep1.body.mfaToken, code: validTotpCode },
    });
    assert(validMfa.status === 200 && validMfa.body.success === true, 'Valid TOTP code establishes authenticated session');
    assert(validMfa.cookie !== undefined, 'HttpOnly session cookie attached');

    // Replay attack: attempt to use the same TOTP code on a new challenge in the same window
    const step1Replay = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'superadmin', password: 'SuperSecurePass2026!' },
    });
    const replayRes = await request('/api/auth/mfa-verify', {
      method: 'POST',
      body: { mfaToken: step1Replay.body.mfaToken, code: validTotpCode },
    });
    assert(replayRes.status === 401, 'Replayed TOTP code within same time-step rejected');

    // Single-use recovery code test
    const step1Recovery = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'superadmin', password: 'SuperSecurePass2026!' },
    });
    const recoveryCode = '1111-2222-3333-4444';
    const recRes = await request('/api/auth/mfa-verify', {
      method: 'POST',
      body: { mfaToken: step1Recovery.body.mfaToken, code: recoveryCode },
    });
    assert(recRes.status === 200, 'Recovery code successfully accepted for authentication');

    // Attempt reuse of consumed recovery code
    const step1Recovery2 = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'superadmin', password: 'SuperSecurePass2026!' },
    });
    const recReuse = await request('/api/auth/mfa-verify', {
      method: 'POST',
      body: { mfaToken: step1Recovery2.body.mfaToken, code: recoveryCode },
    });
    assert(recReuse.status === 401, 'Reused recovery code rejected (Single-use enforcement)');

    /* ─── TEST SUITE 5: SESSIONS & LOGOUT INVALIDATION ────────── */
    console.log('\n--- 5. Session Validation & Logout Invalidation ---');
    resetAllRateLimiters();
    const { cookie: superCookie } = await authenticateUser(
      'superadmin',
      'SuperSecurePass2026!',
      superUser.mfaSecret
    );

    // Access protected me endpoint with valid cookie
    const meRes = await request('/api/auth/me', { headers: { Cookie: superCookie } });
    assert(meRes.status === 200 && meRes.body.user.role === 'super_admin', 'Protected endpoint accessed with valid session');

    // Access without cookie
    const noAuthRes = await request('/api/auth/me');
    assert(noAuthRes.status === 401, 'Unauthenticated request to protected endpoint rejected (401)');

    // Logout
    const logoutRes = await request('/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: superCookie },
    });
    assert(logoutRes.status === 200 && logoutRes.body.success === true, 'Logout succeeded');

    // Access with terminated session
    const postLogoutRes = await request('/api/auth/me', { headers: { Cookie: superCookie } });
    assert(postLogoutRes.status === 401, 'Terminated session cannot access protected endpoints (401)');

    /* ─── TEST SUITE 6: RBAC & PERMISSION BOUNDARIES ──────────── */
    console.log('\n--- 6. RBAC & Explicit Permission Matrix ---');
    resetAllRateLimiters();
    const mktgUser = USERS.find((u) => u.username === 'marketing');
    const adminUser = USERS.find((u) => u.username === 'admin');

    let { cookie: mktgCookie } = await authenticateUser(
      'marketing',
      'MarketingPass2026!',
      mktgUser.mfaSecret
    );
    const { cookie: adminCookie } = await authenticateUser(
      'admin',
      'AdminSecurePass2026!',
      adminUser.mfaSecret
    );
    const { cookie: freshSuperCookie } = await authenticateUser(
      'superadmin',
      'SuperSecurePass2026!',
      superUser.mfaSecret
    );

    // Marketing CAN read content
    const mktgRead = await request('/api/content', { headers: { Cookie: mktgCookie } });
    assert(mktgRead.status === 200, 'Marketing role can read content');

    // Marketing CANNOT access user management
    const mktgUsers = await request('/api/users', { headers: { Cookie: mktgCookie } });
    assert(mktgUsers.status === 403, 'Marketing role CANNOT access /api/users (403 Forbidden)');

    // Marketing CANNOT access audit logs
    const mktgAudits = await request('/api/security/audit-logs', { headers: { Cookie: mktgCookie } });
    assert(mktgAudits.status === 403, 'Marketing role CANNOT access audit logs (403 Forbidden)');

    // Marketing CANNOT rotate CMS route
    const mktgRotate = await request('/api/security/rotate-cms-route', {
      method: 'POST',
      headers: { Cookie: mktgCookie },
      body: { confirmationPassword: 'any' },
    });
    assert(mktgRotate.status === 403, 'Marketing role CANNOT rotate CMS route (403 Forbidden)');

    // Admin CAN read users
    const adminUsers = await request('/api/users', { headers: { Cookie: adminCookie } });
    assert(adminUsers.status === 200, 'Admin role CAN access /api/users');

    // Admin CANNOT rotate CMS route
    const adminRotate = await request('/api/security/rotate-cms-route', {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: { confirmationPassword: 'any' },
    });
    assert(adminRotate.status === 403, 'Admin role CANNOT rotate CMS route (403 Forbidden)');

    // Super Admin CAN read audit logs
    const superAudits = await request('/api/security/audit-logs', { headers: { Cookie: freshSuperCookie } });
    assert(superAudits.status === 200, 'Super Admin CAN read audit logs');

    /* ─── TEST SUITE 7: CONTENT APPROVAL WORKFLOW ─────────────── */
    console.log('\n--- 7. Content Workflow: Draft -> Submitted -> Review -> Approved -> Published ---');
    resetAllRateLimiters();
    // Marketing creates draft
    const createDraftRes = await request('/api/content', {
      method: 'POST',
      headers: { Cookie: mktgCookie },
      body: { title: 'Security Advisory', slug: 'sec-adv-01', content: 'Draft advisory body' },
    });
    assert(createDraftRes.status === 201 && createDraftRes.body.item.status === 'draft', 'Draft content created');
    const contentId = createDraftRes.body.item.id;

    // Marketing attempts to directly publish -> MUST BE DENIED
    const directPublish = await request(`/api/content/${contentId}/transition`, {
      method: 'POST',
      headers: { Cookie: mktgCookie },
      body: { targetStatus: 'published' },
    });
    assert(directPublish.status === 403, 'Marketing directly publishing content is REJECTED (403 Forbidden)');

    // Marketing submits for review
    const submitRes = await request(`/api/content/${contentId}/transition`, {
      method: 'POST',
      headers: { Cookie: mktgCookie },
      body: { targetStatus: 'submitted' },
    });
    assert(submitRes.status === 200 && submitRes.body.item.status === 'submitted', 'Content transitioned to submitted');

    // Admin approves
    const reviewRes = await request(`/api/content/${contentId}/transition`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: { targetStatus: 'review' },
    });
    assert(reviewRes.status === 200 && reviewRes.body.item.status === 'review', 'Admin moves to review');

    const approveRes = await request(`/api/content/${contentId}/transition`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: { targetStatus: 'approved' },
    });
    assert(approveRes.status === 200 && approveRes.body.item.status === 'approved', 'Admin approves content');

    // Admin publishes
    const pubRes = await request(`/api/content/${contentId}/transition`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: { targetStatus: 'published' },
    });
    assert(pubRes.status === 200 && pubRes.body.item.status === 'published', 'Admin successfully publishes content');

    /* ─── TEST SUITE 8: SOFT DELETE & RESTORE ─────────────────── */
    console.log('\n--- 8. Soft Delete & Restore Lifecycle ---');
    resetAllRateLimiters();
    // Admin soft deletes content
    const delRes = await request(`/api/content/${contentId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie },
      body: { reason: 'Archiving outdated advisory' },
    });
    assert(delRes.status === 200, 'Content soft deleted');

    // Query normal content listing: soft-deleted item must not appear
    const listNormal = await request('/api/content', { headers: { Cookie: mktgCookie } });
    const foundInNormal = listNormal.body.items.some((i) => i.id === contentId);
    assert(!foundInNormal, 'Soft-deleted item does NOT appear in normal content queries');

    // Query trash with admin
    const listTrash = await request('/api/content?includeDeleted=true', { headers: { Cookie: adminCookie } });
    const foundInTrash = listTrash.body.items.some((i) => i.id === contentId && i.deleted_at !== null);
    assert(foundInTrash, 'Soft-deleted item appears in trash queries for authorized roles');

    // Restore content
    const restoreRes = await request(`/api/content/${contentId}/restore`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
    });
    assert(restoreRes.status === 200 && restoreRes.body.item.deleted_at === null, 'Content successfully restored from trash');

    /* ─── TEST SUITE 9: PRIVILEGE ESCALATION ATTACKS ──────────── */
    console.log('\n--- 9. Anti-Privilege-Escalation Boundary ---');
    resetAllRateLimiters();
    // Self-role modification attempt: Admin attempts to grant self Super Admin
    const selfEscalate = await request(`/api/users/${adminUser.id}/role`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie },
      body: { newRole: 'super_admin' },
    });
    assert(selfEscalate.status === 403, 'Self-role escalation attempt REJECTED (403 Forbidden)');

    // Admin attempts to grant Super Admin to Marketing
    const adminEscalateOther = await request(`/api/users/${mktgUser.id}/role`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie },
      body: { newRole: 'super_admin' },
    });
    assert(adminEscalateOther.status === 403, 'Admin granting Super Admin privilege is REJECTED (403 Forbidden)');

    // Super Admin can change Marketing to Admin
    const superChangeRole = await request(`/api/users/${mktgUser.id}/role`, {
      method: 'PATCH',
      headers: { Cookie: freshSuperCookie },
      body: { newRole: 'admin' },
    });
    assert(superChangeRole.status === 200 && superChangeRole.body.user.role === 'admin', 'Super Admin can legitimately update role');

    // Revert back for consistency
    await request(`/api/users/${mktgUser.id}/role`, {
      method: 'PATCH',
      headers: { Cookie: freshSuperCookie },
      body: { newRole: 'marketing' },
    });

    // Re-authenticate marketing because role changes invalidate existing sessions
    const refreshedMktg = await authenticateUser(
      'marketing',
      'MarketingPass2026!',
      mktgUser.mfaSecret
    );
    mktgCookie = refreshedMktg.cookie;

    /* ─── TEST SUITE 10: CMS ROUTE ROTATION & OLD ROUTE INVALIDATION */
    console.log('\n--- 10. CMS Route Rotation & Old Route Invalidation ---');
    resetAllRateLimiters();
    const oldSecret = getActiveCmsRoute();

    // Rotate with wrong password -> REJECTED
    const badRotate = await request('/api/security/rotate-cms-route', {
      method: 'POST',
      headers: { Cookie: freshSuperCookie },
      body: { confirmationPassword: 'WrongPassword!' },
    });
    assert(badRotate.status === 401, 'Route rotation with incorrect password REJECTED (401)');

    // Rotate with correct Super Admin password
    const goodRotate = await request('/api/security/rotate-cms-route', {
      method: 'POST',
      headers: { Cookie: freshSuperCookie },
      body: { confirmationPassword: 'SuperSecurePass2026!', reason: 'Scheduled test rotation' },
    });
    assert(goodRotate.status === 200 && goodRotate.body.success === true, 'Route successfully rotated with step-up auth');
    const newSecret = goodRotate.body.newRouteIdentifier;
    assert(newSecret !== oldSecret, 'New route identifier is distinct and randomized');

    // Accessing old route must be rejected
    const oldProbe = await request('/api/security/resolve-route', {
      method: 'POST',
      body: { pathSegment: oldSecret },
    });
    assert(oldProbe.status === 404 && isOldCmsRoute(oldSecret), 'Old route is invalidated and returns 404');

    // Accessing new route succeeds
    const newProbe = await request('/api/security/resolve-route', {
      method: 'POST',
      body: { pathSegment: newSecret },
    });
    assert(newProbe.status === 200 && newProbe.body.valid === true, 'New route identifier resolves successfully');

    /* ─── TEST SUITE 11: XSS SANITIZATION ─────────────────────── */
    console.log('\n--- 11. XSS Payload Sanitization ---');
    resetAllRateLimiters();
    const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>Safe Title';
    const xssRes = await request('/api/content', {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: { title: xssPayload, slug: 'xss-test', content: 'javascript:alert(1)' },
    });
    assert(xssRes.status === 201, 'Content accepted after sanitization');
    assert(!xssRes.body.item.title.includes('<script>'), 'Dangerous <script> tag neutralized');
    assert(!xssRes.body.item.title.includes('onerror='), 'Dangerous event handlers neutralized');

    /* ─── TEST SUITE 12: AUDIT LOGS ATTRIBUTABILITY ───────────── */
    console.log('\n--- 12. Security Audit Log Completeness ---');
    resetAllRateLimiters();
    const auditRes = await request('/api/security/audit-logs', { headers: { Cookie: freshSuperCookie } });
    const logs = auditRes.body.logs;
    assert(logs.length > 5, 'Comprehensive audit entries generated');
    const hasEscalationEvent = logs.some((l) => l.type === 'PRIVILEGE_ESCALATION_ATTEMPT' || l.type === 'SELF_PRIVILEGE_MODIFICATION_ATTEMPT');
    assert(hasEscalationEvent, 'Privilege escalation attempt was recorded in audit log');
    const hasRotationEvent = logs.some((l) => l.type === 'CMS_ROUTE_ROTATED');
    assert(hasRotationEvent, 'Route rotation event was recorded in audit log');
    const noPasswordLeaked = logs.every((l) => !JSON.stringify(l).includes('SuperSecurePass2026!'));
    assert(noPasswordLeaked, 'Audit logs contain zero credentials or plaintext passwords');

    /* ─── TEST SUITE 13: RATE LIMITING & BRUTE FORCE PROTECTION ── */
    console.log('\n--- 13. Sliding Window Rate Limiting & Brute Force Defense ---');
    resetAllRateLimiters();

    // Fire 5 login requests (allowed limit)
    for (let i = 1; i <= 5; i++) {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: { username: 'superadmin', password: 'WrongPassword!' },
      });
      assert(res.status === 401, `Rate limit attempt ${i}/5 processed (status: ${res.status})`);
    }

    // 6th request must trigger 429 Too Many Requests
    const blockedRes = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'superadmin', password: 'WrongPassword!' },
    });
    assert(blockedRes.status === 429, '6th login attempt within window returns 429 Too Many Requests');
    assert(Boolean(blockedRes.headers['retry-after']), 'Retry-After header is present on 429 response');
    assert(blockedRes.body.error && blockedRes.body.error.includes('Too many'), 'Rate limit error message returned');

    resetAllRateLimiters();

    /* ─── TEST SUITE 14: PUBLIC SERVICE CATALOGUE DATA MINIMIZATION ── */
    console.log('\n--- 14. Public Service Catalogue Data Minimization & Isolation ---');
    resetAllRateLimiters();

    // 1. Get all public services
    const pubServicesRes = await request('/api/public/services');
    assert(pubServicesRes.status === 200, 'Public services returned with status 200 without authentication');
    assert(Array.isArray(pubServicesRes.body.services), 'Services returned as array');
    assert(pubServicesRes.body.services.length >= 8, 'All technology and training services present in catalogue');

    // 2. Verify data minimization on public service objects
    const firstService = pubServicesRes.body.services[0];
    assert(firstService.slug && firstService.name && firstService.short && firstService.price, 'Service contains public presentation fields');
    assert(firstService.id === undefined, 'Public service does NOT leak internal primary key id');
    assert(firstService.active === undefined, 'Public service does NOT leak internal active boolean flag');

    // 3. Query filtered by category
    const techServicesRes = await request('/api/public/services?category=technology');
    assert(techServicesRes.body.services.every((s) => s.category === 'technology'), 'Category filter returns only technology services');

    // 4. Query single service by slug
    const singleService = await request('/api/public/services/saas-platforms');
    assert(singleService.status === 200 && singleService.body.service.slug === 'saas-platforms', 'Single service details retrieved');

    // 5. Unknown service slug returns 404
    const unknownService = await request('/api/public/services/non-existent-service');
    assert(unknownService.status === 404, 'Unknown service returns 404 Not Found');

    /* ─── TEST SUITE 15: HIGH-ENTROPY TICKETING ENGINE ───────────── */
    console.log('\n--- 15. Public Ticket Submission & High-Entropy Reference ID ---');
    resetAllRateLimiters();

    // Validation failure: missing fields
    const invalidTicketRes = await request('/api/public/tickets', {
      method: 'POST',
      body: { name: 'A', email: 'invalid-email', subject: 'hi' },
    });
    assert(invalidTicketRes.status === 400, 'Invalid ticket payload rejected with 400 Bad Request');

    // Legitimate ticket submission
    const ticketPayload = {
      name: 'Dr. Evelyn Reed',
      email: 'evelyn.reed@biotechlabs.org',
      category: 'technical_support',
      priority: 'high',
      subject: 'SSO SAML authentication gateway timeout',
      description: 'The SAML IdP redirect is timing out during identity provider assertion callbacks on the production cluster.',
    };
    const createTicketRes = await request('/api/public/tickets', {
      method: 'POST',
      body: ticketPayload,
    });
    assert(createTicketRes.status === 201, 'Public ticket created with 201 Created');
    const createdTicket = createTicketRes.body.ticket;
    assert(Boolean(createdTicket), 'Ticket response object returned');
    assert(/^KB-[A-Z0-9]{8}$/.test(createdTicket.public_id), 'Ticket Reference ID adheres to high-entropy KB-[A-Z0-9]{8} format');
    assert(createdTicket.status === 'NEW', 'New ticket is initialized in status NEW');
    assert(createdTicket.internal_notes === undefined, 'Public ticket creation does NOT expose internal notes');
    assert(createdTicket.assigned_to === undefined, 'Public ticket creation does NOT expose assigned staff');

    // Generate second ticket to verify non-sequential high entropy
    const secondTicketRes = await request('/api/public/tickets', {
      method: 'POST',
      body: {
        name: 'Alex Rivera',
        email: 'alex.rivera@finops.io',
        category: 'project_enquiry',
        priority: 'medium',
        subject: 'Custom PaaS fleet telemetry requirements',
        description: 'We require high-throughput fleet telemetry monitoring for 500+ IoT gateway edge nodes.',
      },
    });
    assert(secondTicketRes.status === 201, 'Second ticket created successfully');
    const secondTicket = secondTicketRes.body.ticket;
    assert(createdTicket.public_id !== secondTicket.public_id, 'Ticket IDs are distinct and randomly generated');

    /* ─── TEST SUITE 16: ANTI-ENUMERATION & SECURE TICKET TRACKING ── */
    console.log('\n--- 16. Secure Ticket Tracking & Anti-Enumeration Verification ---');
    resetAllRateLimiters();

    // 1. Legitimate tracking (Correct Ticket ID + Correct Email)
    const legitTrack = await request('/api/public/ticket-status', {
      method: 'POST',
      body: {
        ticketId: createdTicket.public_id,
        email: 'evelyn.reed@biotechlabs.org',
      },
    });
    assert(legitTrack.status === 200, 'Legitimate ticket tracking succeeds with status 200');
    assert(legitTrack.body.ticket.public_id === createdTicket.public_id, 'Tracked ticket matches query');
    assert(legitTrack.body.ticket.internal_notes === undefined, 'Public ticket tracking strictly excludes internal_notes');
    assert(legitTrack.body.ticket.assigned_to === undefined, 'Public ticket tracking strictly excludes assigned_to');
    assert(legitTrack.body.ticket.id === undefined, 'Public ticket tracking strictly excludes internal primary key id');

    // 2. Anti-enumeration: Valid Ticket ID + WRONG Email
    const wrongEmailTrack = await request('/api/public/ticket-status', {
      method: 'POST',
      body: {
        ticketId: createdTicket.public_id,
        email: 'wrong.attacker@evil.com',
      },
    });
    assert(wrongEmailTrack.status === 404, 'Valid ticket with mismatched email returns 404 Not Found');

    // 3. Anti-enumeration: Completely Fake Ticket ID + Random Email
    const fakeIdTrack = await request('/api/public/ticket-status', {
      method: 'POST',
      body: {
        ticketId: 'KB-ZZZZ9999',
        email: 'attacker@evil.com',
      },
    });
    assert(fakeIdTrack.status === 404, 'Fake ticket returns 404 Not Found');

    // 4. Uniformity check: Error messages must be identical
    assert(
      wrongEmailTrack.body.error === fakeIdTrack.body.error,
      'Anti-enumeration: Error messages for valid-ticket-wrong-email and non-existent-ticket are indistinguishable'
    );

    /* ─── TEST SUITE 17: TICKET TRACKING RATE LIMITING ──────────── */
    console.log('\n--- 17. Ticket Tracking Rate Limiting (Anti-Brute-Force) ---');
    resetAllRateLimiters();

    // Fire 15 status queries (allowed max is 15 within window)
    for (let i = 1; i <= 15; i++) {
      const probe = await request('/api/public/ticket-status', {
        method: 'POST',
        body: { ticketId: 'KB-TESTING0', email: 'test@probe.com' },
      });
      assert(probe.status === 404, `Ticket tracking attempt ${i}/15 processed`);
    }

    // 16th query triggers 429 Too Many Requests
    const rateLimitedTrack = await request('/api/public/ticket-status', {
      method: 'POST',
      body: { ticketId: 'KB-TESTING0', email: 'test@probe.com' },
    });
    assert(rateLimitedTrack.status === 429, 'Excessive ticket status lookups blocked with 429 Too Many Requests');
    assert(Boolean(rateLimitedTrack.headers['retry-after']), 'Retry-After header returned on tracking rate limit');
    resetAllRateLimiters();

    /* ─── TEST SUITE 18: PUBLIC ENQUIRIES & CMS SEPARATION ──────── */
    console.log('\n--- 18. Public Enquiries Submission & CMS Isolation ---');
    resetAllRateLimiters();

    // Public enquiry submission
    const enquiryRes = await request('/api/public/enquiries', {
      method: 'POST',
      body: {
        name: 'Jordan Belfort',
        email: 'jordan@strattongroup.com',
        company: 'Stratton Group',
        service_slug: 'custom-software',
        budget_range: '$25,000 - $50,000',
        message: 'Looking to build an algorithmic trade reconciliation portal.',
      },
    });
    assert(enquiryRes.status === 201, 'Public enquiry submitted with 201 Created');
    assert(/^ENQ-[A-Z0-9]{6}$/.test(enquiryRes.body.enquiry.reference_id), 'Enquiry Reference ID format valid (ENQ-XXXXXX)');

    // Public visitor CANNOT access internal CMS enquiries endpoint
    const unauthEnquiryAccess = await request('/api/enquiries');
    assert(unauthEnquiryAccess.status === 401, 'Unauthenticated access to CMS enquiries blocked (401 Unauthorized)');

    // CMS staff CAN access enquiries
    const cmsEnquiryAccess = await request('/api/enquiries', {
      headers: { Cookie: mktgCookie },
    });
    assert(cmsEnquiryAccess.status === 200, 'Marketing staff CAN view incoming enquiries in CMS');

    /* ─── TEST SUITE 19: CMS TICKET LIFECYCLE & CONFIDENTIAL NOTES ── */
    console.log('\n--- 19. CMS Ticket Lifecycle, Internal Staff Notes & RBAC Isolation ---');
    resetAllRateLimiters();

    // 1. Unauthenticated access to CMS tickets blocked
    const unauthTicketAccess = await request('/api/tickets');
    assert(unauthTicketAccess.status === 401, 'Unauthenticated access to /api/tickets blocked (401 Unauthorized)');

    // 2. Staff reads tickets in CMS
    const staffTicketsRes = await request('/api/tickets', { headers: { Cookie: mktgCookie } });
    assert(staffTicketsRes.status === 200, 'Marketing staff CAN list tickets in CMS');
    const targetTicket = staffTicketsRes.body.tickets.find((t) => t.public_id === createdTicket.public_id);
    assert(Boolean(targetTicket), 'Submitted ticket is present in staff queue');

    // 3. Staff adds confidential internal note
    const addNoteRes = await request(`/api/tickets/${targetTicket.id}/notes`, {
      method: 'POST',
      headers: { Cookie: mktgCookie },
      body: { note: 'CONFIDENTIAL: Customer is an enterprise prospect with 250 enterprise seats. Escalating to platform team.' },
    });
    assert(addNoteRes.status === 201, 'Staff can add internal note to ticket');

    // 4. Staff updates ticket status (NEW -> IN_PROGRESS)
    const updateStatusRes = await request(`/api/tickets/${targetTicket.id}/status`, {
      method: 'PATCH',
      headers: { Cookie: mktgCookie },
      body: { status: 'IN_PROGRESS' },
    });
    assert(updateStatusRes.status === 200 && updateStatusRes.body.ticket.status === 'IN_PROGRESS', 'Ticket status transitioned to IN_PROGRESS');

    // 5. Staff posts public customer update
    const addCustomerUpdateRes = await request(`/api/tickets/${targetTicket.id}/customer-update`, {
      method: 'POST',
      headers: { Cookie: mktgCookie },
      body: { message: 'We have identified the authentication assertion timeout and deployed a hotfix to edge proxy nodes.' },
    });
    assert(addCustomerUpdateRes.status === 201, 'Staff can post customer-visible status update');

    // 6. VERIFY LEAKAGE PREVENTION: Customer tracking endpoint check
    const verifyTrackingAfterUpdate = await request('/api/public/ticket-status', {
      method: 'POST',
      body: {
        ticketId: createdTicket.public_id,
        email: 'evelyn.reed@biotechlabs.org',
      },
    });
    assert(verifyTrackingAfterUpdate.status === 200, 'Customer tracking succeeds');
    assert(verifyTrackingAfterUpdate.body.ticket.status === 'IN_PROGRESS', 'Updated status is reflected to customer');
    assert(verifyTrackingAfterUpdate.body.ticket.customer_updates.length > 0, 'Customer sees published status update');
    // CRITICAL: Verify internal note is NEVER leaked to customer!
    const customerResponseText = JSON.stringify(verifyTrackingAfterUpdate.body);
    assert(!customerResponseText.includes('CONFIDENTIAL'), 'CRITICAL: Internal confidential note is NEVER disclosed to customer');
    assert(!customerResponseText.includes('internal_notes'), 'CRITICAL: internal_notes property is not present in public response');

    // 7. RBAC Ticket Deletion Check:
    // Marketing role CANNOT delete ticket
    const mktgDeleteRes = await request(`/api/tickets/${targetTicket.id}`, {
      method: 'DELETE',
      headers: { Cookie: mktgCookie },
      body: { reason: 'Test delete' },
    });
    assert(mktgDeleteRes.status === 403, 'Marketing role CANNOT soft-delete ticket (403 Forbidden)');

    // Super Admin CAN delete ticket
    const adminDeleteRes = await request(`/api/tickets/${targetTicket.id}`, {
      method: 'DELETE',
      headers: { Cookie: freshSuperCookie },
      body: { reason: 'Resolved and closed by compliance lead' },
    });
    assert(adminDeleteRes.status === 200, 'Super Admin CAN soft-delete ticket');

    // Once soft-deleted, public tracking returns 404
    const deletedTrack = await request('/api/public/ticket-status', {
      method: 'POST',
      body: {
        ticketId: createdTicket.public_id,
        email: 'evelyn.reed@biotechlabs.org',
      },
    });
    assert(deletedTrack.status === 404, 'Soft-deleted ticket is hidden from public tracking (404)');

    // Super Admin can restore ticket
    const restoreTicketRes = await request(`/api/tickets/${targetTicket.id}/restore`, {
      method: 'POST',
      headers: { Cookie: freshSuperCookie },
    });
    assert(restoreTicketRes.status === 200, 'Super Admin can restore soft-deleted ticket');

    // 8. Staff creates ticket directly in CMS
    const staffCreateTicketRes = await request('/api/tickets', {
      method: 'POST',
      headers: { Cookie: mktgCookie },
      body: {
        subject: 'Internal Infrastructure Review',
        description: 'Scheduled quarterly security and performance inspection of edge nodes.',
        category: 'technical_support',
        priority: 'high',
        name: 'DevOps Lead',
        email: 'devops@kineticbay.internal',
        initialNote: 'Initiated from Internal CMS Service Desk',
      },
    });
    assert(staffCreateTicketRes.status === 201, 'Staff can create new ticket in CMS');
    const staffCreatedTicket = staffCreateTicketRes.body.ticket;
    assert(Boolean(staffCreatedTicket), 'CMS created ticket object returned');
    assert(staffCreatedTicket.subject === 'Internal Infrastructure Review', 'Ticket subject matches');
    assert(staffCreatedTicket.internal_notes?.length === 1, 'Initial note attached to staff created ticket');

    // 9. Staff updates ticket details (subject, category, priority, requester info)
    const staffUpdateTicketRes = await request(`/api/tickets/${staffCreatedTicket.id}`, {
      method: 'PATCH',
      headers: { Cookie: mktgCookie },
      body: {
        subject: 'Internal Infrastructure Review (Urgent)',
        priority: 'urgent',
        status: 'IN_PROGRESS',
        requester_name: 'Principal DevOps Architect',
      },
    });
    assert(staffUpdateTicketRes.status === 200, 'Staff can update ticket details in CMS');
    assert(staffUpdateTicketRes.body.ticket.subject === 'Internal Infrastructure Review (Urgent)', 'Updated ticket subject persisted');
    assert(staffUpdateTicketRes.body.ticket.priority === 'urgent', 'Updated ticket priority persisted');
    assert(staffUpdateTicketRes.body.ticket.requester_name === 'Principal DevOps Architect', 'Updated requester name persisted');

    // 10. Case-insensitive lookup check
    const caseInsensitiveRes = await request(`/api/tickets/${staffCreatedTicket.id.toUpperCase()}`, {
      headers: { Cookie: mktgCookie },
    });
    assert(caseInsensitiveRes.status === 200, 'Ticket lookup is case-insensitive on ticket ID');

    /* ─── TEST SUITE 20: REAL VISITS TELEMETRY & ANTI-BOT ENFORCEMENT ─ */
    console.log('\n--- 20. Real Visitor Telemetry, Anti-Bot Guard & Deduplication ---');
    resetAllRateLimiters();

    // 1. Reset real analytics to baseline 0 for clean test
    await request('/api/analytics/reset', {
      method: 'POST',
      headers: { Cookie: freshSuperCookie },
    });

    // 2. Bot / Crawler Request: Must be rejected
    const botVisit = await request('/api/public/analytics/visit', {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
      body: { path: '/', visitorId: 'bot-id-123' },
    });
    assert(botVisit.status === 200 && botVisit.body.recorded === false, 'Googlebot crawl attempt strictly filtered (not counted)');

    // 3. Automated tool (curl/python) request: Must be rejected
    const curlVisit = await request('/api/public/analytics/visit', {
      method: 'POST',
      headers: { 'User-Agent': 'curl/7.68.0' },
      body: { path: '/services' },
    });
    assert(curlVisit.status === 200 && curlVisit.body.recorded === false, 'Automated scraper (curl) strictly filtered (not counted)');

    // 4. Internal CMS route request: Must be rejected
    const internalRouteVisit = await request('/api/public/analytics/visit', {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      body: { path: '/cms_e2b9c7a104f6d5e8237b1c4a9f8e0d35' },
    });
    assert(internalRouteVisit.status === 200 && internalRouteVisit.body.recorded === false, 'Internal CMS route visit strictly excluded from public telemetry');

    // 5. Real Human Visitor #1 lands on Homepage
    const humanUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    const realVisit1 = await request('/api/public/analytics/visit', {
      method: 'POST',
      headers: { 'User-Agent': humanUa },
      body: { path: '/', visitorId: 'real-user-alpha', device: 'desktop' },
    });
    assert(realVisit1.status === 200 && realVisit1.body.recorded === true, 'Real human visit on homepage recorded');
    assert(realVisit1.body.isNewSession === true, 'First real visit initiates a new session');

    // 6. Same Visitor navigates to /services within same session
    const realVisit2 = await request('/api/public/analytics/visit', {
      method: 'POST',
      headers: { 'User-Agent': humanUa },
      body: { path: '/services', visitorId: 'real-user-alpha', device: 'desktop' },
    });
    assert(realVisit2.status === 200 && realVisit2.body.recorded === true, 'Second page view recorded');
    assert(realVisit2.body.isNewSession === false, 'Session deduplication: subsequent page clicks do not inflate totalVisits');

    // 7. Second Distinct Human Visitor on Mobile
    const mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
    const realVisit3 = await request('/api/public/analytics/visit', {
      method: 'POST',
      headers: { 'User-Agent': mobileUa },
      body: { path: '/contact', visitorId: 'real-user-beta', device: 'mobile' },
    });
    assert(realVisit3.status === 200 && realVisit3.body.recorded === true && realVisit3.body.isNewSession === true, 'Distinct mobile visitor recorded');

    // 8. Unauthenticated access to CMS analytics blocked
    const unauthAnalytics = await request('/api/analytics');
    assert(unauthAnalytics.status === 401, 'Unauthenticated request to /api/analytics rejected (401)');

    // 9. Staff retrieves aggregated real analytics
    const staffAnalytics = await request('/api/analytics', { headers: { Cookie: mktgCookie } });
    assert(staffAnalytics.status === 200, 'Marketing staff can access real analytics');
    assert(staffAnalytics.body.analytics.totalVisits === 2, 'Accurate real session count (exactly 2 real visits)');
    assert(staffAnalytics.body.analytics.uniqueVisitors === 2, 'Accurate real unique visitors (exactly 2 unique humans)');
    assert(staffAnalytics.body.analytics.pageViews['/'] === 1, 'Accurate homepage pageviews');
    assert(staffAnalytics.body.analytics.pageViews['/services'] === 1, 'Accurate /services pageviews');
    assert(staffAnalytics.body.analytics.pageViews['/contact'] === 1, 'Accurate /contact pageviews');
    assert(staffAnalytics.body.analytics.deviceBreakdown.desktop >= 1, 'Device breakdown captures desktop');
    assert(staffAnalytics.body.analytics.deviceBreakdown.mobile >= 1, 'Device breakdown captures mobile');
    assert(staffAnalytics.body.analytics.recentVisits.length >= 3, 'Recent visits stream populated with real events');

    // 10. Non-admin reset rejected
    const mktgReset = await request('/api/analytics/reset', {
      method: 'POST',
      headers: { Cookie: mktgCookie },
    });
    assert(mktgReset.status === 403, 'Marketing role CANNOT reset analytics (403 Forbidden)');

    // --- 21. Security Audit Remediation Regression Tests ---
    console.log('\n--- 21. Security Audit Remediation Regression Tests ---');
    resetAllRateLimiters();
    superUser.lockoutUntil = null;
    superUser.failedAttempts = 0;

    // SEC-04 regression: /api/auth/login must NEVER disclose demoTotp or demoRecoveryCode
    const loginPayloadCheck = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'superadmin', password: 'SuperSecurePass2026!' },
    });
    assert(loginPayloadCheck.status === 200, 'Login step 1 succeeds for valid credentials');
    assert(loginPayloadCheck.body.demoTotp === undefined, 'CRITICAL: demoTotp is NOT leaked in login response');
    assert(loginPayloadCheck.body.demoRecoveryCode === undefined, 'CRITICAL: demoRecoveryCode is NOT leaked in login response');

    // SEC-13 regression: user creation must reject passwords shorter than 12 characters
    const { cookie: sec21SuperCookie } = await authenticateUser(
      'superadmin',
      'SuperSecurePass2026!',
      superUser.mfaSecret
    );
    const weakUserCreate = await request('/api/users', {
      method: 'POST',
      headers: { Cookie: sec21SuperCookie },
      body: {
        username: 'weakuser',
        email: 'weakuser@kineticbay.internal',
        name: 'Weak Password User',
        role: 'marketing',
        initialPassword: 'short',
      },
    });
    assert(weakUserCreate.status === 400, 'User creation with short password (< 12 chars) REJECTED (400)');

    // SEC-07 regression: NoSQL user models must not store plainRecoveryCodesSeed
    const superRecord = USERS.find((u) => u.username === 'superadmin');
    assert(superRecord.plainRecoveryCodesSeed === undefined, 'Plaintext recovery codes seed purged from user objects');

    // SEC-12 regression: CSP script-src must not contain images.pexels.com
    const cspCheck = await request('/api/public/services');
    const cspHeader = cspCheck.headers['content-security-policy'] || '';
    assert(!cspHeader.includes("script-src 'self' 'unsafe-inline' https://images.pexels.com"), 'CSP script-src does not allow third-party image CDN as script origin');

    /* ─── TEST SUITE 22: REQUEST BUCKET LIST ANTI-DOS & ANTI-DDOS ── */
    console.log('\n--- 22. Request Bucket List Anti-DoS & Anti-DDoS Defense ---');
    resetAllRateLimiters();

    // 1. Ticket System: Micro-Burst Flood Protection (Bucket Capacity: 6)
    for (let i = 1; i <= 6; i++) {
      const res = await request('/api/public/tickets', {
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.1' },
        body: {
          name: 'Burst Tester',
          email: `burst_user_${i}@example.com`,
          category: 'technical_support',
          priority: 'medium',
          subject: `Burst Ticket ${i}`,
          description: `Testing token bucket micro-burst capacity item ${i}`,
        },
      });
      assert(res.status === 201, `Ticket burst request ${i}/6 permitted within bucket capacity`);
      assert(Boolean(res.headers['x-ratelimit-remaining']), `Ticket burst response ${i} contains X-RateLimit-Remaining header`);
    }

    // 7th rapid ticket submission exceeds burst bucket capacity
    const burstExceededTicket = await request('/api/public/tickets', {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.1' },
      body: {
        name: 'Burst Tester',
        email: 'burst_user_7@example.com',
        category: 'technical_support',
        priority: 'medium',
        subject: 'Burst Ticket 7',
        description: 'Exceeding burst token bucket capacity should be blocked',
      },
    });
    assert(burstExceededTicket.status === 429, 'Ticket micro-burst flood blocked with 429 Too Many Requests');
    assert(burstExceededTicket.body.limitType === 'BURST_BUCKET', 'Ticket micro-burst blocked with limitType BURST_BUCKET');
    assert(Boolean(burstExceededTicket.headers['retry-after']), 'Ticket burst block includes Retry-After header');

    // 2. Message / Enquiry System: Micro-Burst Protection (Bucket Capacity: 5)
    resetAllRateLimiters();
    for (let i = 1; i <= 5; i++) {
      const res = await request('/api/public/enquiries', {
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.2' },
        body: {
          name: 'Message Spammer',
          email: `msg_${i}@example.com`,
          service_slug: 'saas-platforms',
          message: `Enquiry micro-burst payload ${i}`,
        },
      });
      assert(res.status === 201, `Message burst request ${i}/5 permitted within bucket capacity`);
    }

    // 6th rapid message submission exceeds burst bucket
    const burstExceededMsg = await request('/api/public/enquiries', {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.2' },
      body: {
        name: 'Message Spammer',
        email: 'msg_6@example.com',
        service_slug: 'saas-platforms',
        message: '6th rapid enquiry flood payload',
      },
    });
    assert(burstExceededMsg.status === 429, 'Message micro-burst flood blocked with 429 Too Many Requests');
    assert(burstExceededMsg.body.limitType === 'BURST_BUCKET', 'Message micro-burst blocked with limitType BURST_BUCKET');

    // 3. Anti-Distributed DoS Proxy Rotation (Target Fingerprint Bucket)
    // Attacker rotates 5 distinct IPs (simulating botnet / proxy proxies), but targets the SAME victim email address
    resetAllRateLimiters();
    const victimEmail = 'victim_target@corporate.internal';
    for (let i = 1; i <= 4; i++) {
      const distributedReq = await request('/api/public/tickets', {
        method: 'POST',
        headers: { 'x-forwarded-for': `203.0.113.${i}` }, // 4 distinct proxy IPs
        body: {
          name: `Distributed Bot ${i}`,
          email: victimEmail,
          category: 'technical_support',
          priority: 'medium',
          subject: `Distributed Ticket ${i}`,
          description: `Simulating proxy rotation attack targeting same email ${i}`,
        },
      });
      assert(distributedReq.status === 201, `Distributed proxy submission ${i}/4 permitted (IP: 203.0.113.${i})`);
    }

    // 5th submission from a BRAND NEW IP (203.0.113.99) targeting the SAME victim email
    const proxyRotationIntercepted = await request('/api/public/tickets', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.99' }, // New proxy IP!
      body: {
        name: 'Distributed Bot 5',
        email: victimEmail,
        category: 'technical_support',
        priority: 'medium',
        subject: 'Distributed Ticket 5',
        description: 'Targeted email flood via rotating proxy IP',
      },
    });
    assert(proxyRotationIntercepted.status === 429, 'Distributed proxy rotation attack intercepted with 429');
    assert(proxyRotationIntercepted.body.limitType === 'TARGET_FINGERPRINT', 'Distributed attack throttled by TARGET_FINGERPRINT bucket');

    // 4. Automated Penalty Jail on Repeated DoS Violations
    resetAllRateLimiters();
    const hostileIp = '198.51.100.99';
    // Trigger burst limit 3 times to earn penalty jail
    for (let violation = 1; violation <= 3; violation++) {
      // Consume burst tokens
      for (let j = 0; j < 6; j++) {
        await request('/api/public/tickets', {
          method: 'POST',
          headers: { 'x-forwarded-for': hostileIp },
          body: { name: 'Hostile', email: `h_${violation}_${j}@hostile.com`, subject: 'Sub', description: 'Description long enough' },
        });
      }
      // Trigger violation
      await request('/api/public/tickets', {
        method: 'POST',
        headers: { 'x-forwarded-for': hostileIp },
        body: { name: 'Hostile', email: `h_${violation}_fail@hostile.com`, subject: 'Sub', description: 'Description long enough' },
      });
    }

    // 4th attempt from hostile IP is immediately blocked by PENALTY JAIL
    const jailedBlock = await request('/api/public/tickets', {
      method: 'POST',
      headers: { 'x-forwarded-for': hostileIp },
      body: { name: 'Hostile', email: 'h_jailed@hostile.com', subject: 'Sub', description: 'Description long enough' },
    });
    assert(jailedBlock.status === 429, 'Hostile DoS origin blocked with 429 Too Many Requests');
    assert(jailedBlock.body.limitType === 'PENALTY_JAIL', 'Hostile DoS origin placed in PENALTY_JAIL');
    assert(Number(jailedBlock.headers['retry-after']) >= 60, 'Penalty jail assigns full duration Retry-After header');

    resetAllRateLimiters();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`   TEST EXECUTION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    server.close();
    process.exit(failedCount > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test execution error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
