/**
 * D1-backed document store.
 *
 * Each record is one row (coll, id) holding JSON, so concurrent edits to
 * different records never overwrite each other and there is no per-key size
 * ceiling. Singletons (settings, analytics) live in the `kv` table.
 */

const nowIso = () => new Date().toISOString();

function db(env) {
  if (!env.DB) throw new Error('Storage unavailable (D1 binding "DB" missing).');
  return env.DB;
}

export async function listDocs(env, coll, { limit = 5000 } = {}) {
  const { results } = await db(env)
    .prepare('SELECT data FROM docs WHERE coll = ? ORDER BY created_at DESC LIMIT ?')
    .bind(coll, limit)
    .all();
  return results.map((r) => JSON.parse(r.data));
}

export async function getDoc(env, coll, id) {
  const row = await db(env).prepare('SELECT data FROM docs WHERE coll = ? AND id = ?').bind(coll, id).first();
  return row ? JSON.parse(row.data) : null;
}

export async function putDoc(env, coll, doc) {
  const created = doc.created_at || doc.createdAt || doc.timestamp || nowIso();
  await db(env)
    .prepare(`INSERT INTO docs (coll, id, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT (coll, id) DO UPDATE SET updated_at = excluded.updated_at, data = excluded.data`)
    .bind(coll, doc.id, created, nowIso(), JSON.stringify(doc))
    .run();
  return doc;
}

export async function deleteDoc(env, coll, id) {
  await db(env).prepare('DELETE FROM docs WHERE coll = ? AND id = ?').bind(coll, id).run();
}

export async function countDocs(env) {
  const { results } = await db(env)
    .prepare('SELECT coll, COUNT(*) AS n, SUM(LENGTH(data)) AS bytes FROM docs GROUP BY coll')
    .all();
  return Object.fromEntries(results.map((r) => [r.coll, { documents: r.n, sizeBytes: r.bytes || 0 }]));
}

/** Keep only the newest `keep` rows of a collection (used for the audit trail). */
export async function pruneColl(env, coll, keep) {
  await db(env)
    .prepare(`DELETE FROM docs WHERE coll = ? AND id NOT IN
              (SELECT id FROM docs WHERE coll = ? ORDER BY created_at DESC LIMIT ?)`)
    .bind(coll, coll, keep)
    .run();
}

export async function getValue(env, key, fallback) {
  const row = await db(env).prepare('SELECT value FROM kv WHERE key = ?').bind(key).first();
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}

export async function setValue(env, key, value) {
  await db(env)
    .prepare(`INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(key, JSON.stringify(value), nowIso())
    .run();
}
