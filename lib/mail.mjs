import nodemailer from 'nodemailer';
import { database } from './db.mjs';

export const notificationRecipient = 'parkhanchul@gmail.com';
export function mailConfiguration(env = process.env) {
  const port = Number(env.SMTP_PORT || 587);
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASS?.trim();
  const host = env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const configured = !!user && !!password && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user) && Number.isInteger(port) && [465, 587].includes(port);
  return { configured, user, host, port, password };
}

export function notificationMessage(inquiry, config = mailConfiguration(), siteUrl = process.env.SITE_URL) {
  const fields = [
    ['접수번호', `#${inquiry.id}`], ['이름', inquiry.name], ['연락처', inquiry.contact],
    ['촬영 분야', inquiry.category], ['예산 범위', inquiry.budget || '미정'],
    ['희망 촬영일', inquiry.preferred_date || '미정'], ['촬영 지역', inquiry.location || '미정'],
    ['접수 시각', new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(inquiry.created_at))],
  ];
  // No public domain is assumed. A local PC link is explicitly identified as local.
  const adminUrl = siteUrl ? `${new URL(siteUrl).origin}/admin` : 'http://127.0.0.1:4173/admin';
  return {
    from: { name: '데미안포토 촬영문의', address: config.user },
    to: notificationRecipient,
    subject: `[데미안포토] 새로운 촬영문의 #${inquiry.id}`,
    text: ['새로운 촬영문의가 접수되었습니다.', '', ...fields.map(([label,value]) => `${label}: ${value}`), '', '촬영 요구사항', inquiry.requirements, '', `관리자 확인: ${adminUrl}`, ...(!siteUrl ? ['위 주소는 홈페이지를 실행한 PC에서만 열 수 있습니다.'] : []), '', '자동 발송 알림입니다. 고객에게는 위 연락처로 회신해주세요.'].join('\n'),
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export function saveInquiryWithNotification(data) {
  const db = database();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = db.prepare(`INSERT INTO inquiries(name,contact,category,requirements,budget,preferred_date,location,consent_version) VALUES (?,?,?,?,?,?,?,?)`).run(data.name, data.contact, data.category, data.requirements, data.budget, data.preferred_date, data.location, 'draft-2026-11');
    const id = Number(result.lastInsertRowid);
    db.prepare('INSERT INTO inquiry_notifications(inquiry_id) VALUES (?)').run(id);
    db.exec('COMMIT');
    return id;
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}

export async function sendInquiryNotification(id, { env = process.env, createTransport = nodemailer.createTransport } = {}) {
  const db = database();
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(id);
  if (!inquiry) return { status: 'missing' };
  const config = mailConfiguration(env);
  const existing = db.prepare('SELECT * FROM inquiry_notifications WHERE inquiry_id = ?').get(id);
  if (!existing) return { status: 'not_queued' }; // Do not notify historical inquiries without explicit intent.
  if (existing.status === 'sent') return { status: 'sent' };
  const now = Date.now();
  if (!config.configured) {
    db.prepare("UPDATE inquiry_notifications SET status='unconfigured', error_code='NOT_CONFIGURED' WHERE inquiry_id=? AND status!='sent' AND (status!='sending' OR last_attempt_at < ?)").run(id, now - 120000);
    return { status: 'unconfigured' };
  }
  // Persist an atomic lease; simultaneous retries cannot send two copies.
  const lease = db.prepare(`UPDATE inquiry_notifications SET status='sending', attempts=attempts+1, last_attempt_at=?, error_code=NULL
    WHERE inquiry_id=? AND status!='sent' AND (status!='sending' OR last_attempt_at < ?)`).run(now, id, now - 120000);
  if (!lease.changes) return { status: 'sending' };
  let transport;
  try {
    transport = createTransport({
      host: config.host, port: config.port, secure: config.port === 465,
      requireTLS: config.port === 587, auth: { user: config.user, pass: config.password },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      tls: { minVersion: 'TLSv1.2' },
    });
    const info = await transport.sendMail(notificationMessage(inquiry, config, env.SITE_URL));
    if (!info.accepted?.some(address => address.toLowerCase() === notificationRecipient)) throw Object.assign(new Error('Recipient not accepted'), { code: 'RECIPIENT_REJECTED' });
    db.prepare("UPDATE inquiry_notifications SET status='sent', sent_at=?, message_id=?, error_code=NULL WHERE inquiry_id=?").run(new Date().toISOString(), info.messageId || null, id);
    return { status: 'sent' };
  } catch(error) {
    // Store a bounded diagnostic category, never the SMTP response or credentials.
    const safeCodes = ['EAUTH', 'ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EDNS', 'EENVELOPE', 'RECIPIENT_REJECTED'];
    const code = safeCodes.includes(error.code) ? error.code : 'SEND_FAILED';
    db.prepare("UPDATE inquiry_notifications SET status='failed', error_code=? WHERE inquiry_id=?").run(code, id);
    console.error(`[mail] Inquiry #${id}: ${code}`);
    return { status: 'failed' };
  } finally { transport?.close?.(); }
}
