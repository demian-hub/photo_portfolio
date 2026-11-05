import { cookies } from 'next/headers';
import { database } from '../../../../lib/db.mjs';
import { json, readJson, sameOrigin, sessionUser } from '../../../../lib/security.mjs';
import { statuses } from '../../../../lib/validation.mjs';
export const runtime = 'nodejs';
async function authorized() { return sessionUser((await cookies()).get('still_session')?.value); }
export async function GET(request) {
  if (!await authorized()) return json({ message: '관리자 로그인이 필요합니다.' }, 401);
  const params = new URL(request.url).searchParams;
  const q = (params.get('q') || '').slice(0, 150);
  const status = params.get('status') || '';
  const page = Math.max(1, Math.min(100000, Number.parseInt(params.get('page'), 10) || 1));
  const conditions = []; const values = [];
  if (q) { conditions.push('(instr(name, ?) > 0 OR instr(contact, ?) > 0)'); values.push(q, q); }
  if (statuses.includes(status)) { conditions.push('status = ?'); values.push(status); }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const db = database();
  const total = db.prepare(`SELECT count(*) AS count FROM inquiries${where}`).get(...values).count;
  const inquiries = db.prepare(`SELECT * FROM inquiries${where} ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET ?`).all(...values, (page - 1) * 20);
  const counts = db.prepare('SELECT status, count(*) AS count FROM inquiries GROUP BY status').all();
  return json({ inquiries, total, counts, page });
}
export async function PATCH(request) {
  if (!sameOrigin(request)) return json({ message: '허용되지 않은 요청입니다.' }, 403);
  if (!await authorized()) return json({ message: '관리자 로그인이 필요합니다.' }, 401);
  try {
    const { id, status } = await readJson(request);
    if (!Number.isSafeInteger(id) || !statuses.includes(status)) return json({ message: '올바른 문의와 상태를 선택해주세요.' }, 400);
    const result = database().prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(status, id);
    return result.changes ? json({ ok: true }) : json({ message: '문의를 찾을 수 없습니다.' }, 404);
  } catch { return json({ message: '변경하지 못했습니다. 다시 시도해주세요.' }, 400); }
}
