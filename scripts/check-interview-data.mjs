import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

console.log('=== posts where category == "interview" ===');
const posts = await db.collection('posts').where('category', '==', 'interview').get();
console.log(`total: ${posts.size}`);
posts.docs.forEach((d) => {
  const p = d.data();
  console.log(`  id=${d.id}`);
  console.log(`    title=${p.title}`);
  console.log(`    category=${p.category} type=${p.type} responseCount=${p.responseCount}`);
  console.log(`    authorId=${p.authorId} authorName=${p.authorName}`);
  console.log(`    deletedAt=${p.deletedAt ?? '(none)'}`);
});

console.log('\n=== ALL interview_responses ===');
const all = await db.collection('interview_responses').get();
console.log(`total: ${all.size}`);
all.docs.forEach((d) => {
  const r = d.data();
  const ans = (() => {
    if (typeof r.answers === 'string') {
      try { return JSON.parse(r.answers).length; } catch { return 0; }
    }
    return Array.isArray(r.answers) ? r.answers.length : 0;
  })();
  console.log(`  id=${d.id}`);
  console.log(`    postId=${r.postId} status=${r.status}`);
  console.log(`    respondentId=${r.respondentId ?? '(undefined)'} respondentName=${r.respondentName ?? '(undefined)'}`);
  console.log(`    submittedAt=${r.submittedAt ?? '(none)'} updatedAt=${r.updatedAt ?? '(none)'}`);
  console.log(`    answers=${ans}`);
});
