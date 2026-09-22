-- KB NEXUS CMS storage: one JSON document per row, grouped by collection.
CREATE TABLE IF NOT EXISTS docs (
  coll       TEXT NOT NULL,
  id         TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data       TEXT NOT NULL,
  PRIMARY KEY (coll, id)
);
CREATE INDEX IF NOT EXISTS docs_coll_created ON docs (coll, created_at DESC);

-- Singletons (settings, analytics aggregates).
CREATE TABLE IF NOT EXISTS kv (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
