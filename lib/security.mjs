import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { database } from './db.mjs';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
export function createSession(username) {
  const token = randomBytes(32).toString('hex');
  const db = database();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(tokenHash(token), username, Date.now() + 8 * 3600000);
  return token;
}
export function sessionUser(token) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return database().prepare('SELECT username FROM sessions WHERE token_hash = ? AND expires_at > ?').get(tokenHash(token), Date.now())?.username || null;
}
export function sameOrigin(request) {
  const url = new URL(request.url);
  const expected = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : `${url.protocol}//${request.headers.get('host') || url.host}`;
  return request.headers.get('origin') === expected;
}
export function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function readJson(request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('JSON required');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Empty body');
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32768) { await reader.cancel(); throw new Error('Body too large'); }
    chunks.push(Buffer.from(value));
  }
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Object required');
  return value;
}
