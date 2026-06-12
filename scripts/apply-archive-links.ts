// 트랙 2 — 시드 정의 링크(개념↔변인, 변인↔측정도구) DB 반영 점검·적용 (멱등, 양방향)
// 실행: npx tsx scripts/apply-archive-links.ts          (드라이런)
//       npx tsx scripts/apply-archive-links.ts --apply  (적용)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { SEED_CONCEPT_VARIABLE_LINKS, SEED_VARIABLE_MEASUREMENT_LINKS } from "../src/lib/archive-seed";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function main() {
  const [conceptsSnap, variablesSnap, measSnap] = await Promise.all([
    db.collection("archive_concepts").get(),
    db.collection("archive_variables").get(),
    db.collection("archive_measurements").get(),
  ]);
  const byName = (snap: FirebaseFirestore.QuerySnapshot) =>
    new Map(snap.docs.map((d) => [(d.data() as { name?: string }).name ?? "", { id: d.id, ...d.data() } as { id: string; [k: string]: unknown }]));
  const C = byName(conceptsSnap);
  const V = byName(variablesSnap);
  const M = byName(measSnap);

  let added = 0;
  const now = new Date().toISOString();

  // ① 개념 → 변인 (+역방향)
  for (const [cName, vNames] of Object.entries(SEED_CONCEPT_VARIABLE_LINKS)) {
    const c = C.get(cName);
    if (!c) { console.log(`[누락 개념] ${cName}`); continue; }
    const curV = new Set((c.variableIds as string[]) ?? []);
    for (const vName of vNames) {
      const v = V.get(vName);
      if (!v) { console.log(`[누락 변인] ${vName} (개념 ${cName})`); continue; }
      if (curV.has(v.id)) continue;
      added += 1;
      console.log(`[개념↔변인] ${cName} ↔ ${vName}`);
      if (APPLY) {
        await db.collection("archive_concepts").doc(c.id).update({ variableIds: FieldValue.arrayUnion(v.id), updatedAt: now });
        await db.collection("archive_variables").doc(v.id).update({ conceptIds: FieldValue.arrayUnion(c.id), updatedAt: now });
      }
    }
  }

  // ② 변인 → 측정도구 (+역방향)
  for (const [vName, mNames] of Object.entries(SEED_VARIABLE_MEASUREMENT_LINKS)) {
    const v = V.get(vName);
    if (!v) { console.log(`[누락 변인] ${vName}`); continue; }
    const curM = new Set((v.measurementIds as string[]) ?? []);
    for (const mName of mNames) {
      const m = M.get(mName);
      if (!m) { console.log(`[누락 측정도구] ${mName} (변인 ${vName})`); continue; }
      if (curM.has(m.id)) continue;
      added += 1;
      console.log(`[변인↔측정] ${vName} ↔ ${mName}`);
      if (APPLY) {
        await db.collection("archive_variables").doc(v.id).update({ measurementIds: FieldValue.arrayUnion(m.id), updatedAt: now });
        await db.collection("archive_measurements").doc(m.id).update({ variableIds: FieldValue.arrayUnion(v.id), updatedAt: now });
      }
    }
  }

  console.log(`\n=== ${APPLY ? "적용 완료" : "드라이런"} — 신규 링크 ${added}건 ===`);
}

void main();
