import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

let db;
export function database() {
  if (db) return db;
  const filename = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'portfolio.sqlite');
  mkdirSync(path.dirname(filename), { recursive: true });
  db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS admins (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, username TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, contact TEXT NOT NULL,
      category TEXT NOT NULL, requirements TEXT NOT NULL, budget TEXT NOT NULL DEFAULT '',
      preferred_date TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
      consent_version TEXT NOT NULL, status TEXT NOT NULL DEFAULT '신규', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS inquiries_date ON inquiries(created_at DESC);
  `);
  return db;
}

export function consumeLimit(key, max = 5, windowMs = 900000) {
  const db = database();
  const now = Date.now();
  db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').run(now);
  const row = db.prepare(`INSERT INTO rate_limits(key,attempts,expires_at) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts`).get(key, now + windowMs);
  return row.attempts <= max;
}
