import { cookies } from 'next/headers';
import { database, consumeLimit } from '../../../../lib/db.mjs';
import { json, readJson, sameOrigin, sessionUser } from '../../../../lib/security.mjs';
import { mailConfiguration, sendInquiryNotification } from '../../../../lib/mail.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
  if (!sameOrigin(request)) return json({ message: '허용되지 않은 요청입니다.' }, 403);
  if (!sessionUser((await cookies()).get('still_session')?.value)) return json({ message: '관리자 로그인이 필요합니다.' }, 401);
  let id;
  try { ({ id } = await readJson(request)); } catch { return json({ message: '올바른 문의를 선택해주세요.' }, 400); }
  if (!Number.isSafeInteger(id)) return json({ message: '올바른 문의를 선택해주세요.' }, 400);
  const notification = database().prepare('SELECT status FROM inquiry_notifications WHERE inquiry_id=?').get(id);
  if (!notification) return json({ message: '이 문의에는 이메일 알림 기록이 없습니다.' }, 404);
  if (notification.status === 'sent') return json({ status: 'sent', message: '이미 메일 서버에서 수락한 알림입니다.' });
  if (!mailConfiguration().configured) return json({ status: 'unconfigured', message: '발송 계정 인증을 먼저 설정해주세요.' }, 503);
  if (!consumeLimit(`mail-retry:${id}`, 3, 60000)) return json({ message: '잠시 후 다시 시도해주세요.' }, 429);
  const result = await sendInquiryNotification(id);
  return json({ ...result, message: result.status === 'sent' ? '메일 서버에서 알림을 수락했습니다.' : result.status === 'sending' ? '이미 발송 중입니다. 잠시 후 새로고침해주세요.' : '메일을 발송하지 못했습니다. 발송 계정과 네트워크를 확인해주세요.' }, result.status === 'failed' ? 502 : 200);
}
