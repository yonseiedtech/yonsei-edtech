// 사이클 77 — 통계 가이드에 SPSS 실습 절차(toolGuides) 추가 (사용자 요청)
//  · jamovi 와 동일 6종에 SPSS 메뉴 경로. 가정 검정·위반 대응 옵션 위치 명시.
//  · 메뉴 명칭은 SPSS 영문판 표준. 멱등(spss 항목 없을 때만). 실행: npx tsx ... [--apply]
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const SPSS: Record<string, { steps: string[]; note?: string }> = {
  "t-test (독립/대응표본)": {
    steps: [
      "독립표본: Analyze → Compare Means → Independent-Samples T Test",
      "Test Variable(s)에 종속변인, Grouping Variable에 집단 변수 지정 후 Define Groups로 두 집단 값 입력",
      "출력의 Levene's Test(등분산 검정) 확인 — 유의(위반)하면 'Equal variances not assumed' 행을 보고",
      "Options에서 신뢰구간(Confidence Interval) 설정 가능",
      "대응표본: Analyze → Compare Means → Paired-Samples T Test 에서 사전·사후 변수 쌍 지정",
    ],
    note: "효과크기(Cohen's d)는 최신 버전 출력에 포함되거나 별도 계산이 필요합니다.",
  },
  "ANOVA (일원분산분석)": {
    steps: [
      "Analyze → Compare Means → One-Way ANOVA",
      "Dependent List에 종속변인, Factor에 집단 변수 지정",
      "Options → Homogeneity of variance test(Levene) 체크",
      "등분산 위반 시 Options에서 Welch 통계량 체크해 그 값을 보고",
      "Post Hoc → 등분산이면 Tukey, 이분산이면 Games-Howell 체크",
      "Options → Descriptive 로 집단별 기술통계 확인",
    ],
  },
  "ANCOVA (공분산분석)": {
    steps: [
      "Analyze → General Linear Model → Univariate",
      "Dependent Variable(사후점수)·Fixed Factor(집단)·Covariate(사전점수) 지정",
      "Model → Custom 에서 집단×공변인 상호작용 항을 임시 추가해 회귀의 동질성 확인(비유의해야 가정 충족)",
      "가정 충족 시 상호작용 항 제거 후 본분석",
      "Options → Estimated Marginal Means 에 집단 투입(교정평균 출력) + Estimates of effect size(partial η²) 체크",
    ],
    note: "보고 시 원평균이 아니라 교정된 평균(adjusted means)을 제시합니다.",
  },
  "상관분석": {
    steps: [
      "Analyze → Correlate → Bivariate",
      "분석할 연속 변수들을 Variables에 투입",
      "Correlation Coefficients에서 Pearson 기본, 서열·비정규 자료면 Spearman 체크",
      "Options → Means and standard deviations 로 기술통계 확인",
      "선형성·이상치는 Graphs → Scatter/Dot 로 산점도를 먼저 확인",
    ],
  },
  "카이제곱 검정 (χ²)": {
    steps: [
      "Analyze → Descriptive Statistics → Crosstabs",
      "Row(s)·Column(s)에 두 범주형 변수 지정",
      "Statistics → Chi-square 체크 (필요 시 Phi and Cramer's V 로 효과크기)",
      "Cells → Expected(기대빈도) 체크 — 기대빈도 5 미만 셀 비율 확인",
      "2×2 표는 출력의 연속성 수정(Continuity Correction)·Fisher's Exact Test 값을 참고",
    ],
  },
  "탐색적 요인분석(EFA)": {
    steps: [
      "Analyze → Dimension Reduction → Factor",
      "분석 문항 전체를 Variables에 투입",
      "Descriptives → KMO and Bartlett's test of sphericity 체크(KMO ≥ .60 확인)",
      "Extraction → Method를 Principal axis factoring(정규성 우려 시), 고유값 1 또는 고정 요인수 지정",
      "Rotation → 요인 간 상관 가정 시 Promax(또는 Direct Oblimin)",
      "Options → Sorted by size + Suppress small coefficients(.30~.40) 로 교차적재 점검",
    ],
  },
};

async function main() {
  const sm = await db.collection("archive_statistical_methods").get();
  let updated = 0;
  for (const d of sm.docs) {
    const x = d.data() as { name?: string; toolGuides?: { tool: string }[] };
    const guide = SPSS[x.name ?? ""];
    if (!guide) continue;
    const tg = x.toolGuides ?? [];
    if (tg.some((g) => g.tool === "spss")) { console.log(`skip(보유): ${x.name}`); continue; }
    updated++;
    console.log(`+ SPSS: ${x.name} (${guide.steps.length}단계)`);
    if (APPLY) await db.collection("archive_statistical_methods").doc(d.id).update({
      toolGuides: [...tg, { tool: "spss", steps: guide.steps, ...(guide.note ? { note: guide.note } : {}) }],
      updatedAt: new Date().toISOString(),
    });
  }
  console.log(`\n갱신 ${updated} · ${APPLY ? "=== 적용 ===" : "=== 드라이런 ==="}`);
}
void main();
