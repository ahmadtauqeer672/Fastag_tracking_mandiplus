import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'lorrycare.db');

export const db = new DatabaseSync(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('transporter','driver','business','customer')),
  created_at TEXT DEFAULT (datetime('now'))
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
  created_at TEXT DEFAULT (datetime('now')),
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
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS government_data (
  id TEXT PRIMARY KEY,
  vehicle_no TEXT NOT NULL,
  source TEXT NOT NULL, -- VAHAN / ULIP / EWAYBILL / TOLL
  payload TEXT NOT NULL, -- JSON blob (mocked)
  fetched_at TEXT DEFAULT (datetime('now'))
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
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  vehicle_no TEXT,
  channel TEXT NOT NULL CHECK(channel IN ('whatsapp','email')),
  message TEXT NOT NULL,
  event_type TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','failed','retried')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  query_type TEXT NOT NULL, -- vehicle_no / eway_bill
  created_at TEXT DEFAULT (datetime('now')),
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
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

export function auditLog(userId, action, details) {
  const stmt = db.prepare(
    `INSERT INTO audit_logs (id, user_id, action, details) VALUES (?, ?, ?, ?)`
  );
  stmt.run(crypto.randomUUID(), userId || null, action, JSON.stringify(details || {}));
}
