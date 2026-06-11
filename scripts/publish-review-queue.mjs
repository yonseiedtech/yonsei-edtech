// 검수 완료된 draft 일괄 발행 — published=false → true (2026-06-11 검수 보고 승인분)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const COLLECTIONS = [
  'archive_research_methods',
  'archive_statistical_methods',
  'archive_foundation_terms',
  'archive_writing_tips',
];

let total = 0;
for (const coll of COLLECTIONS) {
  const snap = await db.collection(coll).where('published', '==', false).get();
  if (snap.empty) continue;
  const batch = db.batch();
  snap.docs.forEach((d) => {
    batch.update(d.ref, { published: true, updatedAt: new Date().toISOString() });
  });
  await batch.commit();
  console.log(`${coll}: ${snap.size}건 발행`);
  total += snap.size;
}
console.log(`총 ${total}건 발행 완료`);
