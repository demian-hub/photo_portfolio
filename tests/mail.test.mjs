import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
process.env.DATABASE_PATH = path.join(process.cwd(), '.local', `mail-test-${Date.now()}.sqlite`);
const { database } = await import('../lib/db.mjs');
const { mailConfiguration, notificationMessage, saveInquiryWithNotification, sendInquiryNotification } = await import('../lib/mail.mjs');
const data = { name: '<script>client</script>', contact: 'client@example.com', category: '인물 프로필·스냅', requirements: '실제 문의가 아닌 메일 처리 테스트 데이터입니다.', budget: '', preferred_date: '', location: '' };
const configured = { SMTP_USER: 'sender@gmail.com', SMTP_PASS: 'only-a-mock-password', SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '587' };

test('수신 주소 고정, 사용자 입력은 본문에만, 로컬 링크 구분', () => {
  const message = notificationMessage({ ...data, id: 1, created_at: new Date().toISOString() }, mailConfiguration(configured), '');
  assert.equal(message.to, 'parkhanchul@gmail.com');
  assert.equal(message.from.address, configured.SMTP_USER);
  assert.equal(message.subject, '[데미안포토] 새로운 촬영문의 #1');
  assert.ok(message.text.includes(data.name));
  assert.ok(message.text.includes('PC에서만'));
  assert.equal(message.disableFileAccess, true);
  assert.equal(message.disableUrlAccess, true);
  assert.equal(mailConfiguration({}).configured, false);
  assert.equal(mailConfiguration({ ...configured, SMTP_PORT: '25' }).configured, false);
});

test('미설정 시에도 문의와 발송 대기 기록 보존', async () => {
  const id = saveInquiryWithNotification(data);
  assert.equal((await sendInquiryNotification(id, { env: {} })).status, 'unconfigured');
  assert.ok(database().prepare('SELECT id FROM inquiries WHERE id=?').get(id));
  const row = database().prepare('SELECT * FROM inquiry_notifications WHERE inquiry_id=?').get(id);
  assert.equal(row.status, 'unconfigured'); assert.equal(row.attempts, 0);
});

test('발송 성공 기록, TLS 필수, 재호출 시 중복 발송 방지', async () => {
  const id = saveInquiryWithNotification(data);
  let calls = 0;
  const createTransport = options => {
    assert.equal(options.requireTLS, true); assert.equal(options.tls.minVersion, 'TLSv1.2');
    return { async sendMail(message) { calls++; assert.equal(message.to, 'parkhanchul@gmail.com'); return { accepted: [message.to], messageId: 'mock-message-id' }; }, close() {} };
  };
  assert.equal((await sendInquiryNotification(id, { env: configured, createTransport })).status, 'sent');
  assert.equal((await sendInquiryNotification(id, { env: configured, createTransport })).status, 'sent');
  assert.equal(calls, 1);
  assert.equal(database().prepare('SELECT message_id FROM inquiry_notifications WHERE inquiry_id=?').get(id).message_id, 'mock-message-id');
});

test('인증 실패에도 문의 보존, 비밀정보 미기록, 재시도로 복구', async () => {
  const id = saveInquiryWithNotification(data);
  const failed = await sendInquiryNotification(id, { env: configured, createTransport: () => ({ async sendMail() { throw Object.assign(new Error('secret response'), { code: 'EAUTH' }); } }) });
  assert.equal(failed.status, 'failed');
  assert.ok(database().prepare('SELECT id FROM inquiries WHERE id=?').get(id));
  assert.equal(database().prepare('SELECT error_code FROM inquiry_notifications WHERE inquiry_id=?').get(id).error_code, 'EAUTH');
  assert.equal((await sendInquiryNotification(id, { env: configured, createTransport: () => ({ async sendMail() { return { accepted: ['parkhanchul@gmail.com'] }; } }) })).status, 'sent');
  assert.equal(database().prepare('SELECT attempts FROM inquiry_notifications WHERE inquiry_id=?').get(id).attempts, 2);
});

test('동시 재시도는 한 번만 발송', async () => {
  const id = saveInquiryWithNotification(data);
  let finish; let calls = 0;
  const options = { env: configured, createTransport: () => ({ sendMail() { calls++; return new Promise(resolve => { finish = () => resolve({ accepted: ['parkhanchul@gmail.com'] }); }); } }) };
  const first = sendInquiryNotification(id, options);
  assert.equal((await sendInquiryNotification(id, options)).status, 'sending');
  finish(); await first;
  assert.equal(calls, 1);
});
