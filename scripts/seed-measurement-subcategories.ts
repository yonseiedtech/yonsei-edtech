// 사이클 69 — 측정·평가 카테고리 25종을 4개 하위 그룹으로 분류 (사용자 요청: 과밀 → 세부 구분)
//  · 최상위 category(measurement)는 유지, subCategory 만 부여 → 랜딩 페이지가 카드 안에서 2차 그룹핑
//  · 매핑: 정확한 term 이름 기준. 25종 전수 커버(미매칭 0 검증)
//  · 멱등: 이미 동일 subCategory 면 스킵. 실행: npx tsx scripts/seed-measurement-subcategories.ts [--apply]
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

// term 이름 → subCategory 키
const MAP: Record<string, string> = {
  // 측정 척도·변수 유형
  "명목척도": "scale",
  "서열척도": "scale",
  "등간척도": "scale",
  "비율척도": "scale",
  "범주형 변수와 연속형 변수": "scale",
  "질적 척도와 양적 척도": "scale",
  "변인의 구인 영역 (인지·정의·행동)": "scale",
  // 신뢰도·타당도
  "신뢰도": "reliability-validity",
  "타당도": "reliability-validity",
  "타당성": "reliability-validity",
  "타당도 증거의 종류 (내용·구인·준거)": "reliability-validity",
  // 표집·모집단
  "모집단": "sampling",
  "표본": "sampling",
  "표집": "sampling",
  // 통계 검정·결과 해석
  "검정통계량 (t·F·χ²)": "statistics",
  "p값 (유의확률)": "statistics",
  "t값 (t 통계량)": "statistics",
  "F값 (F 통계량)": "statistics",
  "자유도 (df)": "statistics",
  "부분에타제곱 (partial η²)": "statistics",
  "Cohen's d": "statistics",
  "신뢰구간 (CI)": "statistics",
  "효과크기": "statistics",
  "모수 통계": "statistics",
  "비모수 통계": "statistics",
};

async function main() {
  const ft = await db.collection("archive_foundation_terms").get();
  const measurement = ft.docs.filter((d) => (d.data() as { category?: string }).category === "measurement");
  const counts: Record<string, number> = {};
  let updated = 0;
  const unmatched: string[] = [];

  for (const d of measurement) {
    const x = d.data() as { term?: string; subCategory?: string };
    const term = x.term ?? "";
    const sub = MAP[term];
    if (!sub) {
      unmatched.push(term);
      continue;
    }
    counts[sub] = (counts[sub] ?? 0) + 1;
    if (x.subCategory === sub) continue; // 멱등
    updated += 1;
    console.log(`~ ${term} → ${sub}`);
    if (APPLY) {
      await db.collection("archive_foundation_terms").doc(d.id).update({
        subCategory: sub,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  console.log(`\n측정 카테고리 ${measurement.length}종 · 갱신 ${updated}`);
  console.log("하위 그룹 분포:", Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" · "));
  if (unmatched.length) console.log("⚠ 미매칭(매핑 추가 필요):", unmatched.join(" | "));
  else console.log("✓ 전수 매핑 완료 (미매칭 0)");
  console.log(APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ===");
}
void main();
