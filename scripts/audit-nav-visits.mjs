// ③b 결정 자료 (read-only) — pathGroup별 방문 수·고유 사용자 집계 (메뉴 개편 근거)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection('user_activity_logs').get();
const byGroup = new Map();
const byPath = new Map();
let minDate = '9999', maxDate = '0000';
for (const d of snap.docs) {
  const x = d.data();
  const g = x.pathGroup ?? '(없음)';
  const e = byGroup.get(g) ?? { count: 0, users: new Set() };
  e.count += 1;
  if (x.userId) e.users.add(x.userId);
  byGroup.set(g, e);
  const p = x.path ?? '';
  byPath.set(p, (byPath.get(p) ?? 0) + 1);
  const dt = String(x.createdAt ?? '').slice(0, 10);
  if (dt && dt < minDate) minDate = dt;
  if (dt && dt > maxDate) maxDate = dt;
}
console.log(`총 ${snap.size}건 · 기간 ${minDate} ~ ${maxDate}`);
console.log('\n=== pathGroup별 (방문수 | 고유 사용자) ===');
[...byGroup.entries()]
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([g, e]) => console.log(`${String(g).padEnd(16)} ${String(e.count).padStart(6)}회 | ${e.users.size}명`));
console.log('\n=== 경로 TOP 30 ===');
[...byPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([p, n]) => console.log(`${String(n).padStart(5)}  ${p}`));
