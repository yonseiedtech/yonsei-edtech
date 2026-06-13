// 사이클 65 — 통계 가이드에 jamovi 실습 절차(toolGuides) 추가
//  · jamovi: 무료·오픈소스 통계 SW — SPSS 라이선스가 없는 원생의 실질 대안 (수업자료 jamovi_Ch.13 근거)
//  · 주요 6종 검정의 메뉴 경로·옵션 단계 수록. 메뉴 명칭은 jamovi 2.x 영문판 표준 표기.
//  · 가정 위반 대처(사이클 61)와 연결 — Welch·Games-Howell 등 위반 대응 옵션 위치 명시
//  · 멱등: toolGuides 에 jamovi 항목 없을 때만 추가. 실행: npx tsx scripts/seed-jamovi-guides.ts [--apply]
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const JAMOVI: Record<string, { steps: string[]; note?: string }> = {
  "t-test (독립/대응표본)": {
    steps: [
      "독립표본: Analyses → T-Tests → Independent Samples T-Test",
      "Dependent Variables 에 종속변인, Grouping Variable 에 집단 변수 지정",
      "Assumption Checks 에서 Normality test(Shapiro-Wilk)·Homogeneity test(Levene) 체크",
      "등분산 위반 시 Tests 에서 Welch's 체크 (Student's 대신 보고)",
      "Additional Statistics 에서 Effect size(Cohen's d)·Mean difference·Confidence interval 체크",
      "대응표본: Analyses → T-Tests → Paired Samples T-Test 에서 사전·사후 변수 쌍 지정",
    ],
    note: "결과 표의 Student/Welch 행 중 가정 충족 여부에 맞는 행을 보고한다.",
  },
  "ANOVA (일원분산분석)": {
    steps: [
      "Analyses → ANOVA → One-Way ANOVA",
      "Dependent Variables·Grouping Variable 지정",
      "Assumption Checks 에서 Normality·Homogeneity(Levene) 체크",
      "분산 동질 가정에 따라 Fisher's(충족) 또는 Welch's(위반) 선택",
      "Post-Hoc Tests 에서 Tukey(등분산) 또는 Games-Howell(이분산) 체크",
      "효과크기는 ANOVA(일반) 메뉴 사용 시 Effect Size 에서 η²·partial η² 체크",
    ],
  },
  "ANCOVA (공분산분석)": {
    steps: [
      "Analyses → ANOVA → ANCOVA",
      "Dependent Variable(사후점수)·Fixed Factors(집단)·Covariates(사전점수) 지정",
      "Model 에서 집단×공변인 상호작용 항을 임시 추가해 회귀 동질성 확인 (유의하면 가정 위반)",
      "가정 충족 시 상호작용 항 제거 후 본분석 — Effect Size 에서 partial η² 체크",
      "Estimated Marginal Means 에 집단 변수를 넣어 교정평균(adjusted means) 표·그림 출력",
    ],
    note: "보고 시 원평균이 아니라 교정평균을 제시한다.",
  },
  "상관분석": {
    steps: [
      "Analyses → Regression → Correlation Matrix",
      "분석할 연속 변수들을 모두 투입",
      "기본 Pearson 외에 정규성 위반·서열 자료면 Spearman 체크",
      "Additional Options 에서 Flag significant correlations·Confidence intervals 체크",
      "Plot 의 Correlation matrix 로 산점도 행렬을 함께 확인 (선형성·이상치 점검)",
    ],
  },
  "카이제곱 검정 (χ²)": {
    steps: [
      "Analyses → Frequencies → Independent Samples (χ² test of association)",
      "Rows·Columns 에 두 범주형 변수 지정",
      "Cells 에서 Expected counts 체크 — 기대빈도 5 미만 셀 비율 확인",
      "기대빈도 미달이면 Tests 에서 Fisher's exact test 체크해 그 값을 보고",
      "Nominal 에서 Phi/Cramer's V 체크 (효과크기)",
    ],
  },
  "탐색적 요인분석(EFA)": {
    steps: [
      "Analyses → Factor → Exploratory Factor Analysis",
      "분석 문항 전체 투입",
      "Method: 추출은 Principal axis(정규성 우려 시)·회전은 Oblimin(요인 간 상관 가정) 권장",
      "Assumption Checks 에서 Bartlett's test·KMO measure 체크 (KMO ≥ .60 확인)",
      "Number of Factors 는 Based on eigenvalue 또는 스크리도표 참고해 Fixed number 로 재실행",
      "Factor Loadings 의 Hide loadings below .30~.40 으로 교차적재 점검",
    ],
  },
};

async function main() {
  const sm = await db.collection("archive_statistical_methods").get();
  let updated = 0;
  for (const d of sm.docs) {
    const x = d.data() as { name?: string; toolGuides?: { tool: string }[] };
    const guide = JAMOVI[x.name ?? ""];
    if (!guide) continue;
    if ((x.toolGuides ?? []).some((g) => g.tool === "jamovi")) {
      console.log(`skip (보유): ${x.name}`);
      continue;
    }
    updated += 1;
    console.log(`+ jamovi 가이드: ${x.name} (${guide.steps.length}단계)`);
    if (APPLY) {
      await db.collection("archive_statistical_methods").doc(d.id).update({
        toolGuides: [...(x.toolGuides ?? []), { tool: "jamovi", steps: guide.steps, ...(guide.note ? { note: guide.note } : {}) }],
        updatedAt: new Date().toISOString(),
      });
    }
  }
  console.log(`\n갱신 ${updated} · ${APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ==="}`);
}
void main();
