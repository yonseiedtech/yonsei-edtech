// 사이클 44a — 논문 analysis 의 통계/연구방법명 → 가이드 문서 ID 연동 (멱등)
// 실행: npx tsx scripts/link-thesis-methods.ts          (드라이런)
//       npx tsx scripts/link-thesis-methods.ts --apply  (적용)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function main() {
  const [theses, stats, methods] = await Promise.all([
    db.collection("alumni_theses").get(),
    db.collection("archive_statistical_methods").get(),
    db.collection("archive_research_methods").get(),
  ]);
  const statByName = new Map(stats.docs.map((d) => [(d.data() as { name?: string }).name ?? "", d.id]));
  const methodByName = new Map(methods.docs.map((d) => [(d.data() as { name?: string }).name ?? "", d.id]));

  let linkedStat = 0;
  let linkedMethod = 0;
  const unmatchedStat = new Map<string, number>();
  const unmatchedMethod = new Map<string, number>();

  for (const d of theses.docs) {
    const x = d.data() as {
      analysis?: { statMethods?: string[]; researchMethods?: string[] };
      statMethodIds?: string[];
      researchMethodIds?: string[];
    };
    const a = x.analysis;
    if (!a) continue;

    const statIds = new Set(x.statMethodIds ?? []);
    const methodIds = new Set(x.researchMethodIds ?? []);
    let changed = false;

    for (const name of a.statMethods ?? []) {
      const id = statByName.get(name);
      if (!id) {
        unmatchedStat.set(name, (unmatchedStat.get(name) ?? 0) + 1);
        continue;
      }
      if (!statIds.has(id)) {
        statIds.add(id);
        linkedStat += 1;
        changed = true;
      }
    }
    for (const name of a.researchMethods ?? []) {
      const id = methodByName.get(name);
      if (!id) {
        // 사전 라벨이 가이드에 없는 것 (질적연구(면담) 등) — 의도적 미연동
        unmatchedMethod.set(name, (unmatchedMethod.get(name) ?? 0) + 1);
        continue;
      }
      if (!methodIds.has(id)) {
        methodIds.add(id);
        linkedMethod += 1;
        changed = true;
      }
    }

    if (changed && APPLY) {
      await db.collection("alumni_theses").doc(d.id).update({
        statMethodIds: [...statIds],
        researchMethodIds: [...methodIds],
        updatedAt: new Date().toISOString(),
      });
    }
  }

  console.log(`통계방법 연동 +${linkedStat} · 연구방법 연동 +${linkedMethod}`);
  if (unmatchedStat.size) console.log("미매칭 통계:", [...unmatchedStat.entries()].map(([n, c]) => `${n}(${c})`).join(", "));
  if (unmatchedMethod.size) console.log("미매칭 방법:", [...unmatchedMethod.entries()].map(([n, c]) => `${n}(${c})`).join(", "));
  console.log(APPLY ? "=== 적용 완료 ===" : "=== 드라이런 ===");
}

void main();
