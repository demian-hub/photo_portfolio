import { backup } from 'node:sqlite';
import { mkdirSync, cpSync } from 'node:fs';
import { database } from '../lib/db.mjs';
const dir = `backups/${new Date().toISOString().replaceAll(':', '-')}`;
mkdirSync(dir, { recursive: true });
await backup(database(), `${dir}/portfolio.sqlite`);
cpSync('public/images', `${dir}/images`, { recursive: true });
console.log(`백업 완료: ${dir}`);
