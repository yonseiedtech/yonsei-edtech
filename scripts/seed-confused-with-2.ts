// 사이클 78b — confusedWith 잔여 명확 페어 보강
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const cw = (label: string, distinction: string) => ({ confusedTermLabel: label, distinction });
const MAP: Record<string, { confusedTermLabel: string; distinction: string }[]> = {
  "t값 (t 통계량)": [cw("F값 (F 통계량)", "둘 다 검정통계량이다. t는 두 평균 차이(t-test)나 개별 회귀계수에서, F는 셋 이상 집단 분산비(ANOVA)나 모형 전체 검정에서 나온다. 두 집단 비교에서는 F=t² 로 동치.")],
  "F값 (F 통계량)": [cw("t값 (t 통계량)", "F는 분산의 비율(집단 간/집단 내)로 ANOVA 계열에서, t는 평균 차이의 표준화 값으로 t-test에서 나온다. 집단이 둘뿐이면 F=t².")],
  "자유도 (df)": [cw("표본 크기", "자유도는 표본 크기에서 파생되지만(독립표본 t는 N−2 등) 같지 않다. df는 검정통계량의 분포 모양을, 표본 크기는 검정력을 좌우한다.")],
  "사전-사후 설계": [cw("준실험연구", "사전-사후 설계는 '측정 시점 구조'(처치 전후 측정), 준실험연구는 '무선배정이 없는 연구방법 범주'. 준실험이 사전-사후 설계를 자주 쓰지만 진실험·단일집단에서도 사전-사후를 쓴다.")],
};
async function main() {
  const ft = await db.collection("archive_foundation_terms").get();
  let updated = 0;
  for (const [term, items] of Object.entries(MAP)) {
    const doc = ft.docs.find((d) => (d.data() as { term?: string }).term === term);
    if (!doc) { console.log(`⚠ 미발견: ${term}`); continue; }
    const x = doc.data() as { confusedWith?: unknown[] };
    if (Array.isArray(x.confusedWith) && x.confusedWith.length > 0) { console.log(`skip(보유): ${term}`); continue; }
    updated++;
    console.log(`+ ${term} ← ${items.map((i) => i.confusedTermLabel).join(", ")}`);
    if (APPLY) await db.collection("archive_foundation_terms").doc(doc.id).update({
      confusedWith: items.map((i) => ({ id: randomUUID(), confusedTermLabel: i.confusedTermLabel, distinction: i.distinction })),
      updatedAt: new Date().toISOString(),
    });
  }
  console.log(`\n갱신 ${updated} · ${APPLY ? "=== 적용 ===" : "=== 드라이런 ==="}`);
}
void main();
