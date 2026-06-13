// 사이클 74 — 아카이브 크로스링크 양방향 동기화 (단방향만 걸린 링크를 역방향 보강)
//  · measurement.variableIds → variable.measurementIds (역링크)
//  · variable.conceptIds → concept.variableIds (역링크)
//  · variable.measurementIds → measurement.variableIds (역링크)
//  · 의미 판단 없이 "이미 존재하는 링크"의 역방향만 채움 (멱등·안전)
// 실행: npx tsx scripts/sync-archive-crosslinks.ts [--apply]
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const A = (x: unknown): string[] => (Array.isArray(x) ? (x as string[]) : []);

async function main() {
  const [con, vars, meas] = await Promise.all([
    db.collection("archive_concepts").get(),
    db.collection("archive_variables").get(),
    db.collection("archive_measurements").get(),
  ]);
  // 목표 집합 (역링크 포함 최종)
  const varMeas = new Map<string, Set<string>>(); // varId -> measIds
  const varCon = new Map<string, Set<string>>();   // varId -> conIds
  const conVar = new Map<string, Set<string>>();   // conId -> varIds
  const measVar = new Map<string, Set<string>>();  // measId -> varIds
  for (const d of vars.docs) {
    varMeas.set(d.id, new Set(A((d.data() as { measurementIds?: string[] }).measurementIds)));
    varCon.set(d.id, new Set(A((d.data() as { conceptIds?: string[] }).conceptIds)));
  }
  for (const d of con.docs) conVar.set(d.id, new Set(A((d.data() as { variableIds?: string[] }).variableIds)));
  for (const d of meas.docs) measVar.set(d.id, new Set(A((d.data() as { variableIds?: string[] }).variableIds)));

  // 양방향 채우기
  for (const d of meas.docs) for (const vId of A((d.data() as { variableIds?: string[] }).variableIds)) varMeas.get(vId)?.add(d.id);
  for (const d of vars.docs) {
    for (const mId of A((d.data() as { measurementIds?: string[] }).measurementIds)) measVar.get(mId)?.add(d.id);
    for (const cId of A((d.data() as { conceptIds?: string[] }).conceptIds)) conVar.get(cId)?.add(d.id);
  }
  for (const d of con.docs) for (const vId of A((d.data() as { variableIds?: string[] }).variableIds)) varCon.get(vId)?.add(d.id);

  let changes = 0;
  const upd = async (col: string, id: string, field: string, before: string[], after: Set<string>) => {
    const next = [...after].filter((x) => x);
    if (next.length === before.length && next.every((x) => before.includes(x))) return;
    changes++;
    console.log(`${col}/${id.slice(0, 6)} ${field}: ${before.length}→${next.length}`);
    if (APPLY) await db.collection(col).doc(id).update({ [field]: next, updatedAt: new Date().toISOString() });
  };
  for (const d of vars.docs) {
    const x = d.data() as { measurementIds?: string[]; conceptIds?: string[] };
    await upd("archive_variables", d.id, "measurementIds", A(x.measurementIds), varMeas.get(d.id)!);
    await upd("archive_variables", d.id, "conceptIds", A(x.conceptIds), varCon.get(d.id)!);
  }
  for (const d of con.docs) await upd("archive_concepts", d.id, "variableIds", A((d.data() as { variableIds?: string[] }).variableIds), conVar.get(d.id)!);
  for (const d of meas.docs) await upd("archive_measurements", d.id, "variableIds", A((d.data() as { variableIds?: string[] }).variableIds), measVar.get(d.id)!);

  console.log(`\n변경 ${changes}건 · ${APPLY ? "=== 적용 ===" : "=== 드라이런 ==="}`);
}
void main();
