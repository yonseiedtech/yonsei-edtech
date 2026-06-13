// 사이클 79 — 연구방법 ↔ 통계방법 링크 (statisticalMethodIds 채움 + 역방향 relatedResearchMethodIds)
//  · 표준 교과서적 연관만 매핑(실험→t·ANOVA, 척도개발→EFA·CFA·CVI 등). 질적/개념 방법은 제외.
//  · 멱등(이미 있으면 보존). 실행: npx tsx ... [--apply]
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

// 연구방법 이름 → 통계방법 이름들
const MAP: Record<string, string[]> = {
  "실험연구": ["t-test (독립/대응표본)", "ANOVA (일원분산분석)", "ANCOVA (공분산분석)", "MANOVA (다변량분산분석)"],
  "준실험연구": ["t-test (독립/대응표본)", "ANOVA (일원분산분석)", "ANCOVA (공분산분석)"],
  "설문조사연구": ["상관분석", "다중회귀분석", "탐색적 요인분석(EFA)", "카이제곱 검정 (χ²)"],
  "개발연구": ["내용타당도지수(CVI)"],
  "척도(측정도구) 개발 연구": ["탐색적 요인분석(EFA)", "확인적 요인분석(CFA)", "내용타당도지수(CVI)"],
  "교육 프로그램 개발과 타당화": ["내용타당도지수(CVI)", "t-test (독립/대응표본)", "ANOVA (일원분산분석)"],
  "델파이 기법": ["내용타당도지수(CVI)"],
  "구조방정식모형(SEM)": ["구조방정식모형(SEM)", "확인적 요인분석(CFA)"],
};

async function main() {
  const [rm, sm] = await Promise.all([
    db.collection("archive_research_methods").get(),
    db.collection("archive_statistical_methods").get(),
  ]);
  const statByName = new Map(sm.docs.map((d) => [(d.data() as { name?: string }).name ?? "", d.id]));
  const rmByName = new Map(rm.docs.map((d) => [(d.data() as { name?: string }).name ?? "", d.id]));
  // 역방향 누적: statId -> rmIds
  const reverse = new Map<string, Set<string>>();
  for (const d of sm.docs) reverse.set(d.id, new Set((d.data() as { relatedResearchMethodIds?: string[] }).relatedResearchMethodIds ?? []));

  let fwd = 0;
  for (const [rmName, statNames] of Object.entries(MAP)) {
    const rmId = rmByName.get(rmName);
    if (!rmId) { console.log(`⚠ 연구방법 미발견: ${rmName}`); continue; }
    const statIds = statNames.map((n) => { const id = statByName.get(n); if (!id) console.log(`  ⚠ 통계 미발견: ${n}`); return id; }).filter((x): x is string => !!x);
    const rmDoc = rm.docs.find((d) => d.id === rmId)!;
    const cur = (rmDoc.data() as { statisticalMethodIds?: string[] }).statisticalMethodIds ?? [];
    const merged = [...new Set([...cur, ...statIds])];
    if (merged.length !== cur.length) {
      fwd++;
      console.log(`+ ${rmName} → ${statNames.join(", ")}`);
      if (APPLY) await db.collection("archive_research_methods").doc(rmId).update({ statisticalMethodIds: merged, updatedAt: new Date().toISOString() });
    }
    for (const sId of statIds) reverse.get(sId)?.add(rmId);
  }
  // 역방향 적용
  let rev = 0;
  for (const d of sm.docs) {
    const cur = (d.data() as { relatedResearchMethodIds?: string[] }).relatedResearchMethodIds ?? [];
    const next = [...(reverse.get(d.id) ?? [])];
    if (next.length !== cur.length) {
      rev++;
      if (APPLY) await db.collection("archive_statistical_methods").doc(d.id).update({ relatedResearchMethodIds: next, updatedAt: new Date().toISOString() });
    }
  }
  console.log(`\n연구방법 ${fwd}건 · 통계방법 역링크 ${rev}건 · ${APPLY ? "=== 적용 ===" : "=== 드라이런 ==="}`);
}
void main();
