import { database, consumeLimit } from '../../../lib/db.mjs';
import { json, readJson, sameOrigin, tokenHash } from '../../../lib/security.mjs';
import { validateInquiry } from '../../../lib/validation.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
  if (!sameOrigin(request)) return json({ message: '페이지를 새로고침한 뒤 다시 시도해주세요.' }, 403);
  try {
    const input = await readJson(request);
    if (input.website) return json({ message: '입력 내용을 확인해주세요.' }, 400);
    const { data, errors } = validateInquiry(input);
    if (Object.keys(errors).length) return json({ errors, message: '입력 내용을 확인해주세요.' }, 400);
    if (!consumeLimit(`inquiry:${tokenHash(data.contact.toLowerCase())}`, 2, 60000) || !consumeLimit('inquiry:global', 30, 60000)) return json({ message: '잠시 후 다시 접수해주세요. 반복 접수가 제한되었습니다.' }, 429);
    const result = database().prepare(`INSERT INTO inquiries(name,contact,category,requirements,budget,preferred_date,location,consent_version) VALUES (?,?,?,?,?,?,?,?)`).run(data.name, data.contact, data.category, data.requirements, data.budget, data.preferred_date, data.location, 'draft-2026-11');
    return json({ id: Number(result.lastInsertRowid), message: '촬영문의가 접수되었습니다.' }, 201);
  } catch { return json({ message: '문의를 저장하지 못했습니다. 입력 내용을 확인하고 다시 시도해주세요.' }, 400); }
}
