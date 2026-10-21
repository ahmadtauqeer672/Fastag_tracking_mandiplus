import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

// Async database layer with one API for two backends:
//   - Postgres (e.g. Neon) when DATABASE_URL is set — data survives redeploys.
//   - Local SQLite file otherwise, for zero-setup development.
// Usage: `await db.prepare(sql).get|all|run(...params)` with `?` placeholders.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('transporter','driver','business','customer')),
  created_at TEXT DEFAULT __NOW__
);

CREATE TABLE IF NOT EXISTS credits (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  credits_purchased INTEGER NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT __NOW__,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  vehicle_no TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL,
  vehicle_type TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  status TEXT DEFAULT 'idle' CHECK(status IN ('idle','in_transit','active')),
  created_at TEXT DEFAULT __NOW__,
  FOREIGN KEY(owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS government_data (
  id TEXT PRIMARY KEY,
  vehicle_no TEXT NOT NULL,
  source TEXT NOT NULL, -- VAHAN / ULIP / EWAYBILL / TOLL
  payload TEXT NOT NULL, -- JSON blob (mocked)
  fetched_at TEXT DEFAULT __NOW__
);

CREATE TABLE IF NOT EXISTS tracking_logs (
  id TEXT PRIMARY KEY,
  vehicle_no TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  location_name TEXT,
  status TEXT,
  eway_bill_no TEXT,
  eway_valid_till TEXT,
  toll_plaza TEXT,
  event_type TEXT, -- trip_started, toll_crossing, location_update, delay, reached_destination
  created_at TEXT DEFAULT __NOW__
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  vehicle_no TEXT,
  channel TEXT NOT NULL CHECK(channel IN ('whatsapp','email')),
  message TEXT NOT NULL,
  event_type TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','failed','retried')),
  created_at TEXT DEFAULT __NOW__,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  query_type TEXT NOT NULL, -- vehicle_no / eway_bill
  created_at TEXT DEFAULT __NOW__,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS fastag_pings (
  id TEXT PRIMARY KEY,
  vehicle_no TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  toll_plaza_address TEXT, -- raw "address" field from Traqo (toll plaza name)
  position_time TEXT,      -- position_time as reported by Traqo
  city TEXT,               -- reverse-geocoded
  state TEXT,               -- reverse-geocoded
  pincode TEXT,             -- reverse-geocoded
  geocode_display_name TEXT,
  geocode_source TEXT,      -- 'nominatim' | 'cache' | 'error' | 'invalid_coordinates'
  fetched_by TEXT,          -- user_id who triggered the fetch
  created_at TEXT DEFAULT __NOW__
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT __NOW__
);
`;

function createPostgres(connectionString) {
  return import('pg').then(({ default: pg }) => {
    // COUNT/SUM come back as strings by default; the app expects numbers.
    pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // int8
    pg.types.setTypeParser(1700, (v) => parseFloat(v)); // numeric
    const pool = new pg.Pool({ connectionString, max: 5 });
    pool.on('error', (err) => console.error('[db] idle client error:', err.message));
    const toPg = (sql) => {
      let i = 0;
      return sql.replace(/\?/g, () => `$${++i}`);
    };
    const query = (sql, params) => pool.query(toPg(sql), params);
    return {
      exec: (sql) => pool.query(sql),
      prepare: (sql) => ({
        get: async (...params) => (await query(sql, params)).rows[0],
        all: async (...params) => (await query(sql, params)).rows,
        run: async (...params) => {
          await query(sql, params);
        },
      }),
    };
  });
}

async function createSqlite() {
  const { DatabaseSync } = await import('node:sqlite');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // DATA_DIR lets a host point SQLite at a persistent disk.
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const sqlite = new DatabaseSync(path.join(dataDir, 'lorrycare.db'));
  return {
    exec: async (sql) => sqlite.exec(sql),
    prepare: (sql) => ({
      get: async (...params) => sqlite.prepare(sql).get(...params),
      all: async (...params) => sqlite.prepare(sql).all(...params),
      run: async (...params) => {
        sqlite.prepare(sql).run(...params);
      },
    }),
  };
}

const usePostgres = Boolean(process.env.DATABASE_URL);
const impl = await (usePostgres ? createPostgres(process.env.DATABASE_URL) : createSqlite());
await impl.exec(
  SCHEMA.replaceAll(
    '__NOW__',
    usePostgres ? "(to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'))" : "(datetime('now'))"
  )
);
console.log(`[db] using ${usePostgres ? 'Postgres (DATABASE_URL)' : 'local SQLite'}`);

export const db = impl;

export async function auditLog(userId, action, details) {
  await db.prepare(
    `INSERT INTO audit_logs (id, user_id, action, details) VALUES (?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId || null, action, JSON.stringify(details || {}));
}
