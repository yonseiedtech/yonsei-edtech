// 사이클 53 — analysis 재추출 후 연동 ID 재구축 (제거 반영, 멱등)
//  · thesis.statMethodIds = analysis.statMethods 기준 재계산 (set — add만 하던 link 스크립트와 달리 제거 반영)
//  · archive_statistical_methods.alumniThesisIds = 역방향 전체 재계산
//  · researchMethodIds 는 이번 재추출에서 변동 없음 — 통계만 재구축
// 실행: npx tsx scripts/rebuild-thesis-method-links.ts          (드라이런)
//       npx tsx scripts/rebuild-thesis-method-links.ts --apply  (적용)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function main() {
  const [theses, stats] = await Promise.all([
    db.collection("alumni_theses").get(),
    db.collection("archive_statistical_methods").get(),
  ]);
  const statByName = new Map(stats.docs.map((d) => [(d.data() as { name?: string }).name ?? "", d.id]));
  const reverse = new Map<string, string[]>(); // statDocId -> thesisIds

  let thesisChanged = 0;
  for (const d of theses.docs) {
    const x = d.data() as { analysis?: { statMethods?: string[] }; statMethodIds?: string[] };
    if (!x.analysis) continue;
    const nextIds = [...new Set((x.analysis.statMethods ?? []).map((n) => statByName.get(n)).filter((v): v is string => !!v))];
    for (const id of nextIds) reverse.set(id, [...(reverse.get(id) ?? []), d.id]);
    const prevIds = x.statMethodIds ?? [];
    const same = prevIds.length === nextIds.length && prevIds.every((v) => nextIds.includes(v));
    if (!same) {
      thesisChanged += 1;
      console.log(`thesis ${d.id}: ${prevIds.length} -> ${nextIds.length}`);
      if (APPLY) await db.collection("alumni_theses").doc(d.id).update({ statMethodIds: nextIds, updatedAt: new Date().toISOString() });
    }
  }

  let guideChanged = 0;
  for (const d of stats.docs) {
    const prev = ((d.data() as { alumniThesisIds?: string[] }).alumniThesisIds ?? []).sort();
    const next = (reverse.get(d.id) ?? []).sort();
    const same = prev.length === next.length && prev.every((v, i) => v === next[i]);
    if (!same) {
      guideChanged += 1;
      console.log(`guide ${(d.data() as { name?: string }).name}: ${prev.length} -> ${next.length}`);
      if (APPLY) await db.collection("archive_statistical_methods").doc(d.id).update({ alumniThesisIds: next, updatedAt: new Date().toISOString() });
    }
  }
  console.log(`\n논문 ${thesisChanged}건 · 가이드 ${guideChanged}건 변경`);
  console.log(APPLY ? "=== 적용 완료 ===" : "=== 드라이런 ===");
}
void main();
