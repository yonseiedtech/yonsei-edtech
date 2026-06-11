// 검수 대기 draft 본문 전체 덤프 (read-only) — 검수용
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const FIELDS = ['term', 'title', 'englishName', 'abbreviation', 'category', 'summary', 'accessibleSummary', 'definition', 'wrongExample', 'correctExample', 'explanation'];

for (const coll of ['archive_foundation_terms', 'archive_writing_tips']) {
  const snap = await db.collection(coll).where('published', '==', false).get();
  console.log(`\n#### ${coll} (${snap.size}건) ####`);
  snap.docs.forEach((doc) => {
    const x = doc.data();
    console.log(`\n--- id=${doc.id}`);
    for (const k of FIELDS) {
      if (x[k] != null && x[k] !== '') console.log(`  ${k}: ${String(x[k]).slice(0, 400)}`);
    }
  });
}
