#!/usr/bin/env node
/**
 * One-off copy of the legacy KV records into the D1 database.
 *
 *   node scripts/migrate-kv-to-d1.mjs --local     (wrangler dev state)
 *   node scripts/migrate-kv-to-d1.mjs --remote    (production)
 *
 * Existing D1 rows with the same id are overwritten, so it is safe to re-run.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const target = process.argv.includes('--remote') ? '--remote' : '--local';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = (args) => execFileSync(npx, ['wrangler', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });

function kvGet(key) {
  try {
    const out = run(['kv', 'key', 'get', key, '--binding', 'DB_KV', target, '--text']);
    return JSON.parse(out);
  } catch {
    return null; // key absent
  }
}

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const now = new Date().toISOString();
const sql = [];

const COLLECTIONS = {
  users: 'kb_users_v2', tickets: 'kb_tickets_v1', enquiries: 'kb_enquiries_v1',
  content: 'kb_content_v1', team: 'kb_team_v1', audit: 'kb_audit_v1',
};
const SEED = new Set(['tkt_seed_01', 'enq_seed_01']);

for (const [coll, key] of Object.entries(COLLECTIONS)) {
  const list = kvGet(key);
  if (!Array.isArray(list)) { console.log(`${coll.padEnd(10)} — nothing in KV`); continue; }
  let n = 0;
  for (const doc of list) {
    if (!doc || !doc.id || SEED.has(doc.id)) continue;
    const created = doc.created_at || doc.createdAt || doc.timestamp || now;
    sql.push(`INSERT INTO docs (coll, id, created_at, updated_at, data) VALUES (${q(coll)}, ${q(doc.id)}, ${q(created)}, ${q(now)}, ${q(JSON.stringify(doc))})
ON CONFLICT (coll, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at;`);
    n += 1;
  }
  console.log(`${coll.padEnd(10)} ${n} records`);
}

for (const [name, key] of Object.entries({ settings: 'kb_settings_v1', analytics: 'kb_analytics_v1' })) {
  const value = kvGet(key);
  if (value == null) { console.log(`${name.padEnd(10)} — nothing in KV`); continue; }
  sql.push(`INSERT INTO kv (key, value, updated_at) VALUES (${q(name)}, ${q(JSON.stringify(value))}, ${q(now)})
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`);
  console.log(`${name.padEnd(10)} copied`);
}

if (!sql.length) { console.log('Nothing to migrate.'); process.exit(0); }
const file = join(mkdtempSync(join(tmpdir(), 'kb-mig-')), 'migrate.sql');
writeFileSync(file, sql.join('\n'));
console.log(run(['d1', 'execute', 'kineticbay-cms', target, '--file', file, '-y']).split('\n').slice(-6).join('\n'));
console.log(`Done (${target.slice(2)}).`);
