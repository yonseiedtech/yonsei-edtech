import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!b64) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY env missing');
  process.exit(1);
}
const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));

if (!getApps().length) {
  initializeApp({ credential: cert(sa) });
}

const db = getFirestore();
const auth = getAuth();

const TARGET = '2026431009';

async function main() {
  console.log(`\n=== Searching Firestore users for "${TARGET}" ===`);

  const queries = [
    { name: 'username', q: db.collection('users').where('username', '==', TARGET) },
    { name: 'studentId', q: db.collection('users').where('studentId', '==', TARGET) },
  ];

  const foundUids = new Set();
  for (const { name, q } of queries) {
    const snap = await q.get();
    console.log(`\n[users where ${name} == "${TARGET}"] -> ${snap.size} doc(s)`);
    snap.docs.forEach((d) => {
      foundUids.add(d.id);
      const data = d.data();
      console.log(`  uid=${d.id}`);
      console.log(`    name=${data.name} email=${data.email}`);
      console.log(`    username=${data.username} studentId=${data.studentId}`);
      console.log(`    role=${data.role} approved=${data.approved}`);
      console.log(`    createdAt=${data.createdAt} updatedAt=${data.updatedAt}`);
    });
  }

  console.log(`\n=== Searching Firebase Auth for emails containing "${TARGET}" ===`);
  let pageToken = undefined;
  let totalScanned = 0;
  const matchedAuth = [];
  do {
    const list = await auth.listUsers(1000, pageToken);
    totalScanned += list.users.length;
    for (const u of list.users) {
      const email = (u.email || '').toLowerCase();
      if (
        email.includes(TARGET) ||
        u.uid === TARGET ||
        foundUids.has(u.uid) ||
        (u.displayName && u.displayName.includes(TARGET))
      ) {
        matchedAuth.push(u);
      }
    }
    pageToken = list.pageToken;
  } while (pageToken);

  console.log(`Scanned ${totalScanned} auth users; matched ${matchedAuth.length}`);
  for (const u of matchedAuth) {
    console.log(`  uid=${u.uid}`);
    console.log(`    email=${u.email} emailVerified=${u.emailVerified}`);
    console.log(`    displayName=${u.displayName}`);
    console.log(`    disabled=${u.disabled}`);
    console.log(`    created=${u.metadata.creationTime} lastSignIn=${u.metadata.lastSignInTime}`);
    const hasFsDoc = (await db.collection('users').doc(u.uid).get()).exists;
    console.log(`    has Firestore users/${u.uid}? ${hasFsDoc}`);
  }

  // Try common email shapes
  const candidates = [
    `${TARGET}@yonsei.ac.kr`,
    `${TARGET}@gmail.com`,
  ];
  console.log(`\n=== Trying common email shapes ===`);
  for (const e of candidates) {
    try {
      const u = await auth.getUserByEmail(e);
      console.log(`  HIT ${e} -> uid=${u.uid}`);
    } catch (err) {
      console.log(`  miss ${e} (${err.code || err.message})`);
    }
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
