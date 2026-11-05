import { cookies } from 'next/headers';
import { database } from '../../../../lib/db.mjs';
import { json, sameOrigin, tokenHash } from '../../../../lib/security.mjs';
export async function POST(request) {
  if (!sameOrigin(request)) return json({ message: '허용되지 않은 요청입니다.' }, 403);
  const store = await cookies();
  const token = store.get('still_session')?.value;
  if (token) database().prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
  store.delete('still_session');
  return json({ ok: true });
}
