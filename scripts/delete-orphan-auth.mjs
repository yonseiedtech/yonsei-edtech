import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });

const auth = getAuth();
const db = getFirestore();

const TARGET_EMAIL = process.argv[2];
if (!TARGET_EMAIL) {
  console.error('Usage: node scripts/delete-orphan-auth.mjs <email>');
  process.exit(1);
}

const u = await auth.getUserByEmail(TARGET_EMAIL);
console.log(`Found auth user: uid=${u.uid} email=${u.email}`);
console.log(`  created=${u.metadata.creationTime}  lastSignIn=${u.metadata.lastSignInTime}`);

const fs = await db.collection('users').doc(u.uid).get();
if (fs.exists) {
  console.error(`ABORT: Firestore users/${u.uid} document EXISTS. Not orphan. Refusing to delete.`);
  console.error(JSON.stringify(fs.data(), null, 2));
  process.exit(2);
}
console.log('  Firestore users doc: NOT FOUND -> confirmed orphan');

await auth.deleteUser(u.uid);
console.log(`\nDeleted auth user ${u.uid} (${TARGET_EMAIL}).`);
