import { consumeLimit } from '../../../lib/db.mjs';
import { after } from 'next/server';
import { saveInquiryWithNotification, sendInquiryNotification } from '../../../lib/mail.mjs';
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
    const id = saveInquiryWithNotification(data);
    after(async () => {
      try { await sendInquiryNotification(id); }
      catch { console.error(`[mail] Inquiry #${id}: NOTIFICATION_FAILED`); }
    });
    return json({ id, message: '촬영문의가 접수되었습니다.' }, 201);
  } catch { return json({ message: '문의를 저장하지 못했습니다. 입력 내용을 확인하고 다시 시도해주세요.' }, 400); }
}
