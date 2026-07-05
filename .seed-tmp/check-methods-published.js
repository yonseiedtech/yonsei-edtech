// QA-v3: 질적·혼합 연구방법 초안 상태 확인/발행
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });

(async () => {
  const snap = await db.collection("archive_research_methods").get();
  const drafts = snap.docs.filter((d) => {
    const x = d.data();
    return x.published === false && typeof x.seedKey === "string" && x.seedKey.startsWith("research-method:");
  });
  console.log(`전체 ${snap.size} · 미발행 시드 ${drafts.length}`);
  for (const d of drafts) console.log(` - ${d.data().seedKey} (${d.data().name})`);
  if (APPLY && drafts.length) {
    const batch = db.batch();
    for (const d of drafts) batch.update(d.ref, { published: true, updatedAt: new Date().toISOString() });
    await batch.commit();
    console.log(`발행 완료: ${drafts.length}건`);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
