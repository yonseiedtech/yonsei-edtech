// 검수 대기 큐 점검 — 4개 검수형 컬렉션의 published=false 항목 전수 조회 (read-only)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const COLLECTIONS = [
  ['archive_research_methods', '연구방법'],
  ['archive_statistical_methods', '통계방법'],
  ['archive_foundation_terms', '기초용어'],
  ['archive_writing_tips', '글쓰기 팁'],
];

let grand = 0;
for (const [coll, label] of COLLECTIONS) {
  const snap = await db.collection(coll).where('published', '==', false).get();
  grand += snap.size;
  console.log(`\n=== ${label} (${coll}) — 검수 대기 ${snap.size}건 ===`);
  snap.docs.forEach((d) => {
    const x = d.data();
    const name = x.name ?? x.term ?? x.title ?? '(이름 없음)';
    const rawCreated = x.createdAt;
    const created =
      typeof rawCreated === 'string'
        ? rawCreated.slice(0, 10)
        : rawCreated?.toDate
          ? rawCreated.toDate().toISOString().slice(0, 10)
          : '';
    const by = x.createdBy ?? '';
    console.log(`  - ${name} | created=${created} by=${by}`);
  });
}
console.log(`\n총 검수 대기: ${grand}건`);
