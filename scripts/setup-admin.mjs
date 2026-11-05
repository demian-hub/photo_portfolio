import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { database } from '../lib/db.mjs';
import { hashPassword } from '../lib/security.mjs';
const db = database();
if (db.prepare('SELECT username FROM admins LIMIT 1').get()) {
  console.log('관리자 계정이 이미 존재합니다. 기존 계정을 유지합니다.');
} else {
  const password = randomBytes(18).toString('base64url');
  db.prepare('INSERT INTO admins VALUES (?, ?)').run('admin', hashPassword(password));
  mkdirSync('.local', { recursive: true });
  writeFileSync('.local/admin-access.txt', `관리자 주소: http://127.0.0.1:4173/admin\n아이디: admin\n비밀번호: ${password}\n\n이 파일은 Git에서 제외됩니다. 비밀번호를 안전한 곳에 보관하세요.\n`);
  console.log('관리자 생성 완료. 로그인 정보: .local/admin-access.txt');
}
