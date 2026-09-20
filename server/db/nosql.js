import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory where NoSQL document collections are persisted
const DATA_DIR = path.resolve(__dirname, '../data/nosql');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * NoSQL Document Collection
 * Emulates MongoDB/CouchDB collection semantics with in-memory indexes and atomic disk persistence
 */
export class NoSqlCollection {
  constructor(name, dataDir = DATA_DIR) {
    this.name = name;
    this.filePath = path.join(dataDir, `${name}.nosql.json`);
    this.documents = [];
    this.indexMap = new Map();
    this.load();
  }

  load() {
    try {
      ensureDataDir();
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.documents = parsed;
          this.rebuildIndexes();
          return;
        }
      }
    } catch (err) {
      console.warn(`[NoSQL] Warning loading collection "${this.name}":`, err.message);
    }
    this.documents = [];
    this.rebuildIndexes();
  }

  rebuildIndexes() {
    this.indexMap.clear();
    for (const doc of this.documents) {
      const key = doc._id || doc.id || doc.token || doc.public_id;
      if (key) {
        this.indexMap.set(String(key), doc);
      }
    }
  }

  flush() {
    try {
      ensureDataDir();
      const json = JSON.stringify(this.documents, null, 2);
      try {
        fs.writeFileSync(this.filePath, json, 'utf-8');
      } catch (writeErr) {
        // Fallback for atomic write if file locked temporarily
        const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
        fs.writeFileSync(tmpPath, json, 'utf-8');
        try {
          fs.copyFileSync(tmpPath, this.filePath);
          fs.unlinkSync(tmpPath);
        } catch {
          // Silent fallback
        }
      }
    } catch (err) {
      console.error(`[NoSQL] Error persisting collection "${this.name}":`, err.message);
    }
  }

  _matches(doc, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;

    for (const [key, expected] of Object.entries(filter)) {
      const actual = doc[key];

      if (expected !== null && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof RegExp)) {
        for (const [op, val] of Object.entries(expected)) {
          switch (op) {
            case '$eq': if (actual !== val) return false; break;
            case '$ne': if (actual === val) return false; break;
            case '$in': if (!Array.isArray(val) || !val.includes(actual)) return false; break;
            case '$nin': if (Array.isArray(val) && val.includes(actual)) return false; break;
            case '$gt': if (!(actual > val)) return false; break;
            case '$gte': if (!(actual >= val)) return false; break;
            case '$lt': if (!(actual < val)) return false; break;
            case '$lte': if (!(actual <= val)) return false; break;
            case '$regex':
              const rx = new RegExp(val, expected.$options || 'i');
              if (!rx.test(String(actual || ''))) return false;
              break;
            default: if (actual !== val) return false;
          }
        }
      } else if (expected instanceof RegExp) {
        if (!expected.test(String(actual || ''))) return false;
      } else {
        if (actual !== expected) return false;
      }
    }
    return true;
  }

  find(filter = {}) {
    return this.documents.filter((doc) => this._matches(doc, filter));
  }

  findOne(filter = {}) {
    if (filter && Object.keys(filter).length === 1) {
      const key = filter._id || filter.id || filter.public_id || filter.token;
      if (key && this.indexMap.has(String(key))) {
        return this.indexMap.get(String(key));
      }
    }
    return this.documents.find((doc) => this._matches(doc, filter)) || null;
  }

  insertOne(doc) {
    if (!doc || typeof doc !== 'object') throw new Error('[NoSQL] doc must be object');
    const cloned = JSON.parse(JSON.stringify(doc));
    if (!cloned._id) {
      cloned._id = cloned.id || 'doc_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    }
    if (!cloned.created_at && !cloned.createdAt) {
      cloned.created_at = new Date().toISOString();
    }
    this.documents.unshift(cloned);
    const key = cloned._id || cloned.id;
    if (key) this.indexMap.set(String(key), cloned);
    this.flush();
    return cloned;
  }

  insertMany(docs) {
    if (!Array.isArray(docs)) throw new Error('[NoSQL] docs must be array');
    const inserted = [];
    for (const doc of docs) {
      const cloned = JSON.parse(JSON.stringify(doc));
      if (!cloned._id) {
        cloned._id = cloned.id || 'doc_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      }
      this.documents.push(cloned);
      const key = cloned._id || cloned.id;
      if (key) this.indexMap.set(String(key), cloned);
      inserted.push(cloned);
    }
    this.flush();
    return inserted;
  }

  updateOne(filter, updateSpec) {
    const doc = this.findOne(filter);
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };

    if (updateSpec.$set) {
      Object.assign(doc, JSON.parse(JSON.stringify(updateSpec.$set)));
    } else if (updateSpec.$inc) {
      for (const [f, v] of Object.entries(updateSpec.$inc)) {
        doc[f] = (doc[f] || 0) + Number(v);
      }
    } else if (updateSpec.$push) {
      for (const [f, item] of Object.entries(updateSpec.$push)) {
        if (!Array.isArray(doc[f])) doc[f] = [];
        doc[f].push(JSON.parse(JSON.stringify(item)));
      }
    } else {
      Object.assign(doc, JSON.parse(JSON.stringify(updateSpec)));
    }

    doc.updated_at = new Date().toISOString();
    this.flush();
    return { matchedCount: 1, modifiedCount: 1, doc };
  }

  updateMany(filter, updateSpec) {
    const matches = this.find(filter);
    let modified = 0;
    for (const doc of matches) {
      if (updateSpec.$set) {
        Object.assign(doc, JSON.parse(JSON.stringify(updateSpec.$set)));
      } else {
        Object.assign(doc, JSON.parse(JSON.stringify(updateSpec)));
      }
      doc.updated_at = new Date().toISOString();
      modified++;
    }
    if (modified > 0) this.flush();
    return { matchedCount: matches.length, modifiedCount: modified };
  }

  deleteOne(filter) {
    const idx = this.documents.findIndex((doc) => this._matches(doc, filter));
    if (idx === -1) return { deletedCount: 0 };
    const removed = this.documents.splice(idx, 1)[0];
    const key = removed._id || removed.id || removed.token || removed.public_id;
    if (key) this.indexMap.delete(String(key));
    this.flush();
    return { deletedCount: 1, doc: removed };
  }

  count(filter = {}) {
    return this.find(filter).length;
  }

  clear() {
    this.documents = [];
    this.indexMap.clear();
    this.flush();
  }

  setAll(newDocs) {
    this.documents = JSON.parse(JSON.stringify(newDocs));
    this.rebuildIndexes();
    this.flush();
  }
}

export class NoSqlDatabase {
  constructor(dataDir = DATA_DIR) {
    this.dataDir = dataDir;
    this.collections = new Map();
    ensureDataDir();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new NoSqlCollection(name, this.dataDir));
    }
    return this.collections.get(name);
  }

  getStats() {
    const collectionStats = {};
    let totalDocs = 0;
    for (const [name, col] of this.collections.entries()) {
      const count = col.documents.length;
      totalDocs += count;
      collectionStats[name] = {
        documents: count,
        file: `${name}.nosql.json`,
        sizeBytes: fs.existsSync(col.filePath) ? fs.statSync(col.filePath).size : 0,
      };
    }
    return {
      engine: 'KineticBay-NoSQL-DocumentDB-v2',
      format: 'JSON Document Store with Atomic Flush',
      dataDirectory: this.dataDir,
      totalCollections: this.collections.size,
      totalDocuments: totalDocs,
      collections: collectionStats,
      persistedAt: new Date().toISOString(),
    };
  }
}

export const noSqlDb = new NoSqlDatabase();
