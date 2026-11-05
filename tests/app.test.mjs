import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { validateInquiry } from '../lib/validation.mjs';

process.env.DATABASE_PATH = path.join(process.cwd(), '.local', `test-${Date.now()}.sqlite`);
const { database } = await import('../lib/db.mjs');
const { hashPassword, verifyPassword, sameOrigin, sessionUser } = await import('../lib/security.mjs');
const valid = { name: '테스트 고객', contact: 'test@example.com', category: '인물 프로필·스냅', requirements: '자연광으로 촬영하는 프로필 사진 문의입니다.', consent: true };

test('문의 검증: 필수·연락처·동의·잘못된 날짜·분야', () => {
  assert.deepEqual(validateInquiry(valid).errors, {});
  const errors = validateInquiry({ ...valid, contact: 'invalid', category: 'unknown', consent: false, preferred_date: '2027-02-30' }).errors;
  for (const field of ['contact', 'category', 'consent', 'preferred_date']) assert.ok(errors[field]);
  assert.ok(validateInquiry({ ...valid, requirements: '<x>' }).errors.requirements);
});

test('비밀번호 해시 및 위조 세션·다른 출처 거부', () => {
  const hash = hashPassword('long-test-password');
  assert.equal(verifyPassword('long-test-password', hash), true);
  assert.equal(verifyPassword('wrong-password', hash), false);
  assert.equal(sessionUser('forged'), null);
  assert.equal(sameOrigin(new Request('http://localhost:4289/api', { headers: { origin: 'http://127.0.0.1:4289', host: '127.0.0.1:4289' } })), true);
  assert.equal(sameOrigin(new Request('http://localhost:4289/api', { headers: { origin: 'https://attacker.example', host: 'localhost:4289' } })), false);
});

test('HTTP 통합: 문의 저장 → 인증 → 조회·검색 → 상태 변경 → 로그아웃', { timeout: 45000 }, async () => {
  database().prepare('INSERT INTO admins VALUES (?,?)').run('test-admin', hashPassword('only-for-test-1234'));
  const port = 4289;
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env: { ...process.env, SITE_URL: origin }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  server.stdout.on('data', chunk => output += chunk);
  server.stderr.on('data', chunk => output += chunk);
  let cookie = '';
  const request = async (route, method = 'GET', body, custom = {}) => {
    const response = await fetch(origin + route, { method, headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...custom }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json(), headers: response.headers };
  };
  try {
    for (let i = 0; i < 100; i++) {
      if (output.includes('Ready in')) break;
      if (server.exitCode !== null) throw new Error(output);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.match(output, /Ready in/);
    assert.equal((await request('/api/admin/inquiries')).status, 401);
    assert.equal((await request('/api/inquiries', 'POST', valid, { Origin: 'https://attacker.example' })).status, 403);
    assert.equal((await request('/api/inquiries', 'POST', { ...valid, consent: false })).status, 400);
    const created = await request('/api/inquiries', 'POST', valid);
    assert.equal(created.status, 201);
    assert.ok(created.data.id);
    assert.equal(database().prepare('SELECT name FROM inquiries WHERE id=?').get(created.data.id).name, valid.name);
    assert.equal((await request('/api/admin/inquiries', 'PATCH', { id: created.data.id, status: '완료' })).status, 401);
    assert.equal((await request('/api/admin/login', 'POST', { username: 'test-admin', password: 'incorrect' })).status, 401);
    const login = await request('/api/admin/login', 'POST', { username: 'test-admin', password: 'only-for-test-1234' });
    assert.equal(login.status, 200);
    const setCookie = login.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=strict/i);
    cookie = setCookie.split(';')[0];
    assert.equal((await request('/api/admin/inquiries')).data.total, 1);
    assert.equal((await request('/api/admin/inquiries?q=notfound')).data.total, 0);
    assert.equal((await request('/api/admin/inquiries?q=' + encodeURIComponent(valid.name))).data.total, 1);
    assert.equal((await request('/api/admin/inquiries', 'PATCH', { id: created.data.id, status: 'bad' })).status, 400);
    assert.equal((await request('/api/admin/inquiries', 'PATCH', { id: created.data.id, status: '상담 중' })).status, 200);
    assert.equal((await request('/api/admin/inquiries?status=' + encodeURIComponent('상담 중'))).data.inquiries[0].status, '상담 중');
    assert.equal((await request('/api/admin/logout', 'POST')).status, 200);
    assert.equal((await request('/api/admin/inquiries')).status, 401);
    cookie = '';
    await request('/api/inquiries', 'POST', valid);
    assert.equal((await request('/api/inquiries', 'POST', valid)).status, 429);
  } finally {
    server.kill();
    if (server.exitCode === null) await once(server, 'exit');
  }
});
