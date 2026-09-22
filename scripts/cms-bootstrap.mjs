#!/usr/bin/env node
/**
 * Provision KB NEXUS CMS accounts into the D1 database.
 *
 *   node scripts/cms-bootstrap.mjs --local            # local `wrangler dev` D1 + .dev.vars
 *   node scripts/cms-bootstrap.mjs --remote           # production D1 + SESSION_SECRET secret
 *   add --force to replace existing accounts, --out <file> to choose where credentials are written
 *
 * For each account it generates a strong password, an authenticator (TOTP)
 * secret and six single-use recovery codes. Only PBKDF2 / SHA-256 hashes are
 * stored in D1; plaintext credentials are written once to the --out file
 * (default: outside the repo, in your home folder) and never committed.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { hashPassword, newTotpSecret, otpauthUrl, sha256Hex, randomToken } from '../server/edge/crypto.js';

const args = process.argv.slice(2);
const remote = args.includes('--remote');
const local = args.includes('--local');
const force = args.includes('--force');
const outIdx = args.indexOf('--out');
const outFile = outIdx >= 0 ? args[outIdx + 1] : join(homedir(), `kb-cms-credentials-${remote ? 'production' : 'local'}.txt`);

if (remote === local) {
  console.error('Choose exactly one of --local or --remote.');
  process.exit(1);
}

const wrangler = (wArgs, input) =>
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['wrangler', ...wArgs], {
    input, encoding: 'utf8', stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'], shell: process.platform === 'win32',
  });
const where = remote ? '--remote' : '--local';

// refuse to clobber existing accounts unless asked
let existing = 0;
try {
  const out = wrangler(['d1', 'execute', 'kineticbay-cms', where, '--json', '--command', "SELECT COUNT(*) AS n FROM docs WHERE coll = 'users'"]);
  existing = JSON.parse(out)[0].results[0].n;
} catch { /* table empty or not yet migrated */ }
if (existing && !force) {
  console.error('CMS accounts already exist in this database. Re-run with --force to replace them.');
  process.exit(1);
}

const ACCOUNTS = [
  { id: 'usr_superadmin_01', username: 'superadmin', email: 'superadmin@kineticbay.internal', name: 'Chief Security Officer', role: 'super_admin' },
  { id: 'usr_admin_01', username: 'admin', email: 'admin@kineticbay.internal', name: 'Platform Operations Admin', role: 'admin' },
  { id: 'usr_marketing_01', username: 'marketing', email: 'marketing@kineticbay.internal', name: 'Growth & Content Specialist', role: 'marketing' },
];

const strongPassword = () => {
  // 20 chars, guaranteed upper/lower/digit, no ambiguous characters
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const pw = Array.from(bytes, (b) => alpha[b % alpha.length]).join('');
  return /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) ? pw : strongPassword();
};
const recoveryCode = () => randomToken(8).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8).padEnd(8, '7');

const users = [];
const report = [];
for (const a of ACCOUNTS) {
  const password = strongPassword();
  const totpSecret = newTotpSecret();
  const recovery = Array.from({ length: 6 }, recoveryCode);
  users.push({
    ...a, status: 'active', passwordHash: await hashPassword(password), totpSecret,
    recoveryHashes: await Promise.all(recovery.map((r) => sha256Hex(r))), sessionVersion: 0, createdAt: new Date().toISOString(),
  });
  report.push({ ...a, password, totpSecret, otpauth: otpauthUrl(totpSecret, a.username), recovery: recovery.map((r) => `${r.slice(0, 4)}-${r.slice(4)}`) });
}

const dir = mkdtempSync(join(tmpdir(), 'kbcms-'));
try {
  const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
  const sqlFile = join(dir, 'users.sql');
  writeFileSync(sqlFile, users.map((u) => `INSERT INTO docs (coll, id, created_at, updated_at, data) VALUES ('users', ${q(u.id)}, ${q(u.createdAt)}, ${q(u.createdAt)}, ${q(JSON.stringify(u))})
ON CONFLICT (coll, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at;`).join('\n'));
  wrangler(['d1', 'execute', 'kineticbay-cms', where, '--file', sqlFile, '-y']);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// session signing key
const sessionSecret = randomToken(48);
if (remote) {
  wrangler(['secret', 'put', 'SESSION_SECRET'], sessionSecret);
} else {
  const devVars = existsSync('.dev.vars') ? readFileSync('.dev.vars', 'utf8').replace(/^SESSION_SECRET=.*$/m, '').trim() : '';
  writeFileSync('.dev.vars', `${devVars ? devVars + '\n' : ''}SESSION_SECRET=${sessionSecret}\n`);
}

const lines = [
  `KB NEXUS CMS credentials (${remote ? 'PRODUCTION' : 'local dev'}) — generated ${new Date().toISOString()}`,
  'Keep this file private. Delete it once the passwords are in your password manager.',
  '',
];
for (const r of report) {
  lines.push(`== ${r.name} (${r.role}) ==`, `Username:        ${r.username}`, `Password:        ${r.password}`,
    `Authenticator:   ${r.totpSecret}   (add manually in Google/Microsoft Authenticator, time-based)`,
    `otpauth URL:     ${r.otpauth}`, `Recovery codes:  ${r.recovery.join('  ')}`, '');
}
writeFileSync(outFile, lines.join('\n'));
console.log(`Provisioned ${users.length} CMS accounts (${remote ? 'production' : 'local'}).`);
console.log(`Credentials written to: ${outFile}`);
