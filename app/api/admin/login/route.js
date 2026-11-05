import { cookies } from 'next/headers';
import { database, consumeLimit } from '../../../../lib/db.mjs';
import { createSession, hashPassword, json, readJson, sameOrigin, verifyPassword } from '../../../../lib/security.mjs';
export const runtime = 'nodejs';
const dummyHash = hashPassword('invalid-account-timing-placeholder');
export async function POST(request) {
  if (!sameOrigin(request)) return json({ message: '허용되지 않은 요청입니다.' }, 403);
  try {
    const { username, password } = await readJson(request);
    if (typeof username !== 'string' || typeof password !== 'string' || username.length > 60 || password.length > 200) return json({ message: '아이디와 비밀번호를 확인해주세요.' }, 400);
    if (!consumeLimit('login:global', 40) || !consumeLimit(`login:${username.toLowerCase()}`, 8)) return json({ message: '로그인 시도가 많습니다. 15분 후 다시 시도해주세요.' }, 429);
    const admin = database().prepare('SELECT * FROM admins WHERE username = ?').get(username);
    const valid = verifyPassword(password, admin?.password_hash || dummyHash);
    if (!admin || !valid) return json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' }, 401);
    const token = createSession(admin.username);
    (await cookies()).set('still_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: 8 * 3600 });
    return json({ ok: true });
  } catch { return json({ message: '로그인하지 못했습니다. 다시 시도해주세요.' }, 400); }
}
