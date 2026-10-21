import crypto from 'node:crypto';
import { db, auditLog } from '../common/db.js';
import { hashPassword, verifyPassword, signToken } from '../common/utils.js';

export function registerUser({ name, email, phone, password, role }) {
  if (!name || !password || !role || (!email && !phone)) {
    throw new HttpError(400, 'name, password, role, and email or phone are required');
  }
  if (!['transporter', 'driver', 'business', 'customer'].includes(role)) {
    throw new HttpError(400, 'invalid role');
  }
  const existing = db.prepare(`SELECT id FROM users WHERE email = ? OR phone = ?`).get(email || '', phone || '');
  if (existing) throw new HttpError(409, 'user with this email/phone already exists');

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  db.prepare(
    `INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name, email || null, phone || null, passwordHash, role);
  db.prepare(`INSERT INTO credits (user_id, balance) VALUES (?, ?)`).run(id, 50); // welcome credits

  auditLog(id, 'user_registered', { role });

  const token = signToken({ sub: id, role, name });
  return { token, user: publicUser(id) };
}

export function loginUser({ identifier, password }) {
  if (!identifier || !password) throw new HttpError(400, 'identifier and password are required');
  const user = db.prepare(`SELECT * FROM users WHERE email = ? OR phone = ?`).get(identifier, identifier);
  if (!user) throw new HttpError(401, 'invalid credentials');
  if (!verifyPassword(password, user.password_hash)) throw new HttpError(401, 'invalid credentials');

  auditLog(user.id, 'user_login', {});
  const token = signToken({ sub: user.id, role: user.role, name: user.name });
  return { token, user: publicUser(user.id) };
}

export function publicUser(id) {
  const user = db.prepare(`SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?`).get(id);
  const credit = db.prepare(`SELECT balance FROM credits WHERE user_id = ?`).get(id);
  return { ...user, credits: credit ? credit.balance : 0 };
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
