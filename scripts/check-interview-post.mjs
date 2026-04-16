import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const POST_ID = process.argv[2] || 'rxFjKKeKd5r69NlAeMP3';

const post = await db.collection('posts').doc(POST_ID).get();
console.log(`\n=== posts/${POST_ID} ===`);
if (!post.exists) {
  console.log('(no such post)');
  process.exit(0);
}
const p = post.data();
console.log(`title=${p.title}`);
console.log(`category=${p.category}`);
console.log(`commentCount=${p.commentCount}`);
console.log(`responseCount=${p.responseCount}`);
console.log(`authorName=${p.authorName} authorId=${p.authorId}`);

console.log(`\n=== interview_responses where postId == ${POST_ID} ===`);
const snap = await db.collection('interview_responses').where('postId', '==', POST_ID).get();
console.log(`total: ${snap.size}`);
snap.docs.forEach((d) => {
  const r = d.data();
  console.log(`  id=${d.id}`);
  console.log(`    status=${r.status} userId=${r.userId} userName=${r.userName}`);
  console.log(`    createdAt=${r.createdAt} updatedAt=${r.updatedAt} submittedAt=${r.submittedAt}`);
  console.log(`    answers=${(r.answers || []).length} items`);
});

console.log(`\n=== comments where postId == ${POST_ID} ===`);
const cs = await db.collection('comments').where('postId', '==', POST_ID).get();
console.log(`total: ${cs.size}`);
cs.docs.forEach((d) => {
  const c = d.data();
  console.log(`  id=${d.id} authorName=${c.authorName} content=${(c.content || '').slice(0, 50)}`);
});
