// ============================================
// Admin authentication: password hashing + signed session cookie
// ============================================

import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError } from './db.js';

const scrypt = promisify(crypto.scrypt);

const COOKIE_NAME = 'hps_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
export const MIN_PASSWORD_LENGTH = 8;

// ── Password hashing ──

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const [scheme, N, r, p, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p),
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** Store a new admin password. Bumping `version` signs out every existing session. */
export async function setAdminPassword(db, password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (password.length > 200) throw new HttpError(400, 'Password is too long');
  const version = crypto.randomBytes(8).toString('hex');
  await db.collection('admin_auth').updateOne(
    { _id: 'admin' },
    { $set: { password_hash: await hashPassword(password), version, updated_at: new Date().toISOString() } },
    { upsert: true }
  );
  return version;
}

export function getAdminAuth(db) {
  return db.collection('admin_auth').findOne({ _id: 'admin' });
}

// ── Session tokens ──

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new HttpError(500, 'Login is not configured (AUTH_SECRET is missing)');
  return s;
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', secret()).update(payloadB64).digest('base64url');
}

export function createSessionToken(version) {
  const payload = { v: version, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

function readSessionToken(token) {
  if (typeof token !== 'string') return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  const expected = Buffer.from(sign(payloadB64));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (typeof payload.exp !== 'number' || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Cookies ──

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1 && part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}

function isHttps(request) {
  return request.headers.get('x-forwarded-proto') === 'https' || new URL(request.url).protocol === 'https:';
}

export function sessionCookie(request, version) {
  const parts = [
    `${COOKIE_NAME}=${createSessionToken(version)}`,
    'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${SESSION_SECONDS}`,
  ];
  if (isHttps(request)) parts.push('Secure');
  return parts.join('; ');
}

export function clearedCookie(request) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (isHttps(request)) parts.push('Secure');
  return parts.join('; ');
}

/** True when the request carries a valid session for the current admin password. */
export async function isAdminRequest(db, request) {
  const payload = readSessionToken(readCookie(request, COOKIE_NAME));
  if (!payload) return false;
  const auth = await getAdminAuth(db);
  return !!auth && auth.version === payload.v;
}

// ── Login throttling ──

const MAX_FAILED_LOGINS = 10; // per IP, per 15 minutes

export function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown';
}

export async function assertLoginAllowed(db, ip) {
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const failures = await db.collection('login_attempts').countDocuments({ ip, at: { $gte: since } });
  if (failures >= MAX_FAILED_LOGINS) {
    throw new HttpError(429, 'Too many failed attempts. Please wait 15 minutes and try again.');
  }
}

export function recordFailedLogin(db, ip) {
  return db.collection('login_attempts').insertOne({ ip, at: new Date() });
}
