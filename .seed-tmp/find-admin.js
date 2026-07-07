const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });
(async () => {
  const snap = await db.collection("users").where("role", "in", ["sysadmin", "admin", "president"]).limit(10).get();
  for (const d of snap.docs) {
    const x = d.data();
    console.log(`${d.id} | ${x.role} | ${x.name} | ${x.email ?? "(email 없음)"}`);
  }
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
