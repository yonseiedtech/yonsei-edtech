import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const RESPONSE_ID = process.argv[2];
if (!RESPONSE_ID) {
  console.error('Usage: node scripts/delete-orphan-interview-response.mjs <responseId>');
  process.exit(1);
}

const ref = db.collection('interview_responses').doc(RESPONSE_ID);
const snap = await ref.get();
if (!snap.exists) {
  console.error(`No such doc: interview_responses/${RESPONSE_ID}`);
  process.exit(2);
}
const r = snap.data();
console.log(`Found: status=${r.status} userId=${r.userId ?? 'undefined'} userName=${r.userName ?? 'undefined'} answers=${(r.answers || []).length}`);

if (r.userId || r.userName) {
  console.error('ABORT: response has userId/userName (not orphan). Refusing to delete.');
  process.exit(3);
}

await ref.delete();
console.log(`\nDeleted interview_responses/${RESPONSE_ID}.`);
