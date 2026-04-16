import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });

const auth = getAuth();
const db = getFirestore();

const list = await auth.listUsers(1000);
console.log(`Total auth users: ${list.users.length}\n`);
for (const u of list.users) {
  const fs = await db.collection('users').doc(u.uid).get();
  const d = fs.exists ? fs.data() : null;
  console.log(`uid=${u.uid}`);
  console.log(`  email=${u.email}  verified=${u.emailVerified}  disabled=${u.disabled}`);
  console.log(`  created=${u.metadata.creationTime}  lastSignIn=${u.metadata.lastSignInTime}`);
  if (d) {
    console.log(`  FS: name=${d.name} username=${d.username} studentId=${d.studentId} role=${d.role} approved=${d.approved}`);
  } else {
    console.log(`  FS: (no users/${u.uid} doc — orphan auth user!)`);
  }
  console.log();
}
