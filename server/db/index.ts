import initSqlJs from 'sql.js';
import { drizzle } from 'drizzle-orm/sql-js';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sqlDb: any = null;
export let db!: DrizzleDb;
let _dbPath = '';
let _dirty = false;

function getDbPath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  if (process.env.NODE_ENV === 'production') {
    return path.join(path.dirname(process.execPath), 'wa-manager.db');
  }
  return path.join(process.cwd(), 'wa-manager.db');
}

export async function initDatabase(): Promise<void> {
  _dbPath = getDbPath();

  // Locate the sql.js WASM file relative to this module
  const wasmPath = path.join(
    __dirname, '..', '..', 'node_modules', 'sql.js', 'dist'
  );

  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(wasmPath, file),
  });

  let buffer: Buffer | undefined;
  if (fs.existsSync(_dbPath)) {
    buffer = fs.readFileSync(_dbPath);
  }

  _sqlDb = buffer ? new SQL.Database(buffer) : new SQL.Database();

  _sqlDb.run('PRAGMA journal_mode = WAL;');
  _sqlDb.run('PRAGMA foreign_keys = ON;');
  _sqlDb.run('PRAGMA synchronous = NORMAL;');

  db = drizzle(_sqlDb, { schema });

  // Auto-persist every 5 s when dirty
  setInterval(persistDb, 5000);
}

export function markDirty(): void {
  _dirty = true;
}

export function persistDb(): void {
  if (!_sqlDb || !_dbPath || !_dirty) return;
  try {
    const data = _sqlDb.export() as Uint8Array;
    fs.mkdirSync(path.dirname(_dbPath), { recursive: true });
    fs.writeFileSync(_dbPath, Buffer.from(data));
    _dirty = false;
  } catch (err) {
    console.error('[db] Failed to persist:', err);
  }
}

// Force-persist immediately (used after migrations and shutdown)
export function flushDb(): void {
  if (!_sqlDb || !_dbPath) return;
  try {
    const data = _sqlDb.export() as Uint8Array;
    fs.mkdirSync(path.dirname(_dbPath), { recursive: true });
    fs.writeFileSync(_dbPath, Buffer.from(data));
    _dirty = false;
  } catch (err) {
    console.error('[db] Failed to flush:', err);
  }
}

export {
  usersTable,
  whatsappSessionsTable,
  messagesTable,
  apiKeysTable,
  auditLogsTable,
} from './schema';

export type {
  User,
  NewUser,
  Session,
  NewSession,
  Message,
  NewMessage,
  ApiKey,
  NewApiKey,
  AuditLog,
  NewAuditLog,
} from './schema';
