import { db, usersTable, flushDb } from './index';
import { sql, eq } from 'drizzle-orm';
import { hashSync } from 'bcryptjs';

export async function runMigrations(): Promise<void> {
  console.log('[db] Running SQLite migrations...');

  db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      username             TEXT NOT NULL UNIQUE,
      password             TEXT NOT NULL,
      role                 TEXT NOT NULL DEFAULT 'employee',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at           TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at           TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'disconnected',
      phone_number      TEXT,
      qr_code           TEXT,
      webhook_url       TEXT,
      webhook_events    TEXT DEFAULT '[]',
      features          TEXT DEFAULT '{}',
      last_connected_at TEXT,
      created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at        TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id),
      direction  TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'text',
      "from"     TEXT,
      "to"       TEXT,
      content    TEXT,
      media_url  TEXT,
      timestamp  TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      name         TEXT NOT NULL,
      key_hash     TEXT NOT NULL UNIQUE,
      prefix       TEXT NOT NULL,
      last_used_at TEXT,
      created_at   TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id),
      action     TEXT NOT NULL,
      details    TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existing = db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, 'admin'))
    .all();

  if (existing.length === 0) {
    db.insert(usersTable).values({
      username: 'admin',
      password: hashSync('123456', 12),
      role: 'admin',
      mustChangePassword: false,
    }).run();
    console.log('[db] Default admin created — login: admin / 123456');
  }

  flushDb();
  console.log('[db] Migrations complete');
}
