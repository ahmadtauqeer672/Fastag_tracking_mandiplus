import crypto from 'node:crypto';

// ---- Password hashing (scrypt, built-in, no deps) ----
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

// ---- Minimal JWT (HMAC-SHA256), no external deps ----
const SECRET = process.env.JWT_SECRET || 'lorrycare-dev-secret-change-me';

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlDecode(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString();
}

export function signToken(payload, expiresInSec = 60 * 60 * 24 * 7) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSec };
  const encHeader = base64url(JSON.stringify(header));
  const encBody = base64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', SECRET).update(`${encHeader}.${encBody}`).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encHeader}.${encBody}.${sig}`;
}

export function verifyToken(token) {
  try {
    const [encHeader, encBody, sig] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', SECRET).update(`${encHeader}.${encBody}`).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (sig !== expectedSig) return null;
    const body = JSON.parse(base64urlDecode(encBody));
    if (body.exp && Date.now() / 1000 > body.exp) return null;
    return body;
  } catch {
    return null;
  }
}

export function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(body);
}

export async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export function getAuthUser(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  return verifyToken(token);
}
