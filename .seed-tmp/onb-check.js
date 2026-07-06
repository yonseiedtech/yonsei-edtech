const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });
(async () => {
  const snap = await db.collection("onboarding_checklist").get();
  const items = snap.docs.map(d => d.data());
  const enabled = items.filter(i => i.enabled !== false);
  const newTypes = ["set.thesisJourneyStage", "used.literatureMatrix", "used.researchModel", "visited.studio", "participated.commBoard"];
  const hasNew = newTypes.map(t => `${t}:${items.some(i => i.completionType === t) ? "있음" : "없음"}`);
  console.log(`onboarding_checklist: 총 ${snap.size} · 활성 ${enabled.length}`);
  console.log(hasNew.join(" | "));
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
