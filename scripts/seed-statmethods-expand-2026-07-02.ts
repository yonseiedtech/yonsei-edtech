/**
 * 통계방법 가이드 확장 시드 (2026-07-02)
 *
 * 1) 카테고리 정정 — enum 밖 자유 텍스트로 저장돼 목록 배지가 공백이던 4개 문서:
 *    카이제곱→nonparametric, 상관분석→basic, 중심극한정리/정규성→basic, CVI→measurement
 * 2) 신규 7개 방법 (published):
 *    반복측정 ANOVA(anova_family) · 다층모형 HLM(multilevel)
 *    Mann-Whitney U · Wilcoxon 부호순위 · Kruskal-Wallis H · Friedman (nonparametric)
 *    신뢰도 분석 Cronbach's α (measurement)
 * 3) 신규 비모수 문서에 기존 모수 검정으로의 alternativeMethods 상호 링크
 *
 * 실행: npx tsc scripts/seed-statmethods-expand-2026-07-02.ts --module commonjs --outDir .seed-tmp \
 *        --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck
 *       node .seed-tmp/seed-statmethods-expand-2026-07-02.js [--apply]
 * 기본 드라이런. 멱등: seedKey(`statistical-method:{slug}`) upsert.
 */

import * as fs from "fs";
import * as path from "path";
import * as admin from "firebase-admin";

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(__dirname, "..");

const envLine = fs
  .readFileSync(path.join(ROOT, ".env.local"), "utf8")
  .split("\n")
  .find((l) => l.startsWith("FIREBASE_SERVICE_ACCOUNT_KEY="));
if (!envLine) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY not found");
const key = JSON.parse(Buffer.from(envLine.split("=")[1].trim(), "base64").toString());
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();
db.settings({ preferRest: true });

const COL = "archive_statistical_methods";
const now = () => new Date().toISOString();

// ── 1) 카테고리 정정 ──
const CATEGORY_FIXES: { seedKey: string; category: string }[] = [
  { seedKey: "statistical-method:chi-square", category: "nonparametric" },
  { seedKey: "statistical-method:correlation", category: "basic" },
  { seedKey: "statistical-method:clt-normality", category: "basic" },
  { seedKey: "statistical-method:cvi", category: "measurement" },
];

// ── 2) 신규 문서 ──
interface Assump {
  id: string; name: string; description: string;
  howToCheck?: string; threshold?: string; ifViolated?: string;
}
interface Step { id: string; step: string; detail?: string }
interface Ref { id: string; title: string; author?: string; year?: number }

function doc(d: {
  slug: string; name: string; category: string; summary: string;
  accessibleSummary: string; whenToUse: string;
  assumptions: Assump[]; procedure: Step[];
  spssCommand?: string; rCommand?: string;
  interpretationKeys: string[];
  comparisonProfile: Record<string, unknown>;
  references: Ref[];
}) {
  return {
    seedKey: `statistical-method:${d.slug}`,
    name: d.name,
    category: d.category,
    summary: d.summary,
    accessibleSummary: d.accessibleSummary,
    whenToUse: d.whenToUse,
    assumptions: d.assumptions,
    procedure: d.procedure,
    spssCommand: d.spssCommand ?? "",
    rCommand: d.rCommand ?? "",
    interpretationKeys: d.interpretationKeys,
    comparisonProfile: d.comparisonProfile,
    references: d.references,
    published: true,
    createdBy: "seed-script",
  };
}

const NEW_DOCS = [
  doc({
    slug: "rm-anova",
    name: "반복측정 분산분석 (RM-ANOVA)",
    category: "anova_family",
    summary: "같은 대상을 여러 시점(또는 조건)에서 반복 측정한 자료에서 시점 간 평균 차이를 검정한다. 개인 내 변동을 오차에서 분리해 검정력이 높다.",
    accessibleSummary: "같은 학생들의 성적을 3월·6월·9월에 재서 '시간이 지나며 정말 달라졌는지'를 보는 방법입니다. 같은 사람을 계속 재기 때문에 사람마다 원래 잘하고 못하는 차이는 빼고 변화만 봅니다.",
    whenToUse: "사전-중간-사후처럼 동일 집단을 3회 이상 측정했을 때, 또는 한 사람이 여러 조건을 모두 경험하는 설계(피험자내 설계)에서 시점·조건 간 평균 차이를 검정할 때.",
    assumptions: [
      { id: "a1", name: "구형성 (Sphericity)", description: "시점 쌍들 간 차이 점수의 분산이 동일해야 한다.", howToCheck: "Mauchly의 구형성 검정", threshold: "p > .05 이면 구형성 충족", ifViolated: "Greenhouse-Geisser 또는 Huynh-Feldt 보정된 자유도 사용 (SPSS 출력에 기본 포함)" },
      { id: "a2", name: "정규성", description: "각 시점의 종속변수(정확히는 차이 점수)가 정규분포를 따라야 한다.", howToCheck: "Shapiro-Wilk", threshold: "p > .05", ifViolated: "비모수 대안인 Friedman 검정 사용" },
      { id: "a3", name: "결측 없는 반복 자료", description: "모든 시점에 응답한 대상만 분석에 포함된다(listwise).", ifViolated: "결측이 많으면 다층모형(성장모형)이 더 적합 — 결측 시점이 있어도 개인을 버리지 않는다" },
    ],
    procedure: [
      { id: "p1", step: "자료를 와이드 형식으로 정리", detail: "한 행 = 한 사람, 시점별 점수를 별도 열로 (예: score_t1, score_t2, score_t3)" },
      { id: "p2", step: "구형성 검정 확인", detail: "Mauchly 검정 위반 시 Greenhouse-Geisser 보정값으로 보고" },
      { id: "p3", step: "주효과 F 검정", detail: "시점 주효과가 유의하면 시점 간 차이가 존재" },
      { id: "p4", step: "사후 비교 (대응별)", detail: "Bonferroni 보정 대응표본 비교로 어느 시점 간 차이인지 확인" },
      { id: "p5", step: "효과크기 보고", detail: "부분 에타제곱(η²p)과 시점별 평균·표준편차 표 제시" },
    ],
    spssCommand: "GLM score_t1 score_t2 score_t3\n  /WSFACTOR=time 3 Polynomial\n  /PRINT=DESCRIPTIVE ETASQ\n  /EMMEANS=TABLES(time) COMPARE ADJ(BONFERRONI)\n  /WSDESIGN=time.",
    rCommand: "library(afex)\naov_ez(id = \"id\", dv = \"score\", within = \"time\", data = long_df)",
    interpretationKeys: [
      "구형성 위반 여부를 먼저 보고(Mauchly p), 위반이면 Greenhouse-Geisser 보정 F와 보정 자유도로 보고한다.",
      "시점 주효과 F, p, η²p 를 보고하고, 유의하면 Bonferroni 사후비교로 어느 구간에서 변화했는지 특정한다.",
      "사전-사후 2시점뿐이면 대응표본 t검정과 동일하다 — 3시점 이상일 때 RM-ANOVA의 가치가 있다.",
    ],
    comparisonProfile: {
      focus: "동일 대상의 시점(조건) 간 평균 변화",
      dependentVariable: "연속형 1개 (반복 측정)",
      independentVariable: "시점/조건 (피험자내 요인)",
      minSampleSize: "시점 수보다 충분히 큰 n (통상 20명 이상 권장)",
      keyAssumptions: ["구형성", "정규성"],
      strengthOneliner: "개인차를 오차에서 제거해 같은 n으로 더 높은 검정력",
      limitationOneliner: "결측 시점이 있는 대상은 통째로 제외됨 (다층모형이 대안)",
      groupCount: "single",
      dependentVariableCount: "one",
      independentVariableCount: "one",
      designType: "within_subjects",
    },
    references: [
      { id: "r1", title: "Discovering statistics using IBM SPSS statistics (5th ed.)", author: "Field, A.", year: 2018 },
      { id: "r2", title: "Design and analysis: A researcher's handbook (4th ed.)", author: "Keppel, G., & Wickens, T. D.", year: 2004 },
    ],
  }),
  doc({
    slug: "hlm",
    name: "다층모형 (HLM/MLM)",
    category: "multilevel",
    summary: "학생이 학급에, 학급이 학교에 속하는 위계 자료에서 수준별 분산을 분리해 추정한다. 관측치 독립성 가정을 위반하는 군집 자료의 표준 해법이다.",
    accessibleSummary: "같은 반 학생들은 서로 비슷합니다(같은 선생님, 같은 분위기). 이런 '묶음'을 무시하고 일반 회귀를 돌리면 실제보다 차이가 쉽게 유의해 보입니다. 다층모형은 반 효과와 학생 효과를 나눠서 공정하게 계산합니다.",
    whenToUse: "학급·학교 단위로 수집한 자료(학생 수준 + 집단 수준 변수), 반복측정 종단자료(시점이 개인에 내포), 급내상관(ICC)이 무시할 수 없는 수준(통상 .05 이상)일 때.",
    assumptions: [
      { id: "a1", name: "수준별 잔차 정규성", description: "1수준(개인)과 2수준(집단) 잔차가 각각 정규분포를 따른다.", howToCheck: "수준별 잔차 플롯·Q-Q plot", ifViolated: "로버스트 표준오차 사용 또는 변수 변환" },
      { id: "a2", name: "충분한 집단 수", description: "2수준 단위(학급·학교)가 충분해야 집단 수준 효과를 안정적으로 추정한다.", threshold: "통상 2수준 단위 30개 이상 권장 (10개 미만이면 고정효과 접근 고려)", ifViolated: "집단 수가 적으면 집단을 더미변수로 통제하는 고정효과 모형 고려" },
      { id: "a3", name: "무선효과-설명변수 독립", description: "무선효과와 설명변수가 상관되지 않아야 한다.", ifViolated: "집단평균 중심화(group-mean centering)로 within/between 효과 분리" },
    ],
    procedure: [
      { id: "p1", step: "무조건 모형(영모형)으로 ICC 산출", detail: "ICC = 집단간분산/(집단간+집단내분산). 다층 구조 필요성의 근거" },
      { id: "p2", step: "1수준 설명변수 투입 (무선절편 모형)" },
      { id: "p3", step: "2수준 설명변수·층위 간 상호작용 투입", detail: "예: 학급 평균 SES × 개인 동기" },
      { id: "p4", step: "무선기울기 필요성 검토", detail: "기울기가 집단마다 다른지 우도비 검정으로 비교" },
      { id: "p5", step: "모형 비교·최종 보고", detail: "-2LL, AIC/BIC 변화와 고정효과 계수, 분산성분을 함께 보고" },
    ],
    spssCommand: "MIXED score WITH motiv ses_class\n  /FIXED=motiv ses_class\n  /RANDOM=INTERCEPT | SUBJECT(class_id)\n  /METHOD=REML\n  /PRINT=SOLUTION TESTCOV.",
    rCommand: "library(lme4)\nlmer(score ~ motiv + ses_class + (1 | class_id), data = df)",
    interpretationKeys: [
      "영모형 ICC를 먼저 보고해 다층모형 사용 근거를 제시한다 (ICC가 크면 일반 회귀는 1종 오류 위험).",
      "고정효과 계수는 회귀계수처럼, 분산성분은 '설명되지 않은 집단 간 차이'로 해석한다.",
      "개인 효과와 집단 효과(예: 개인 SES vs 학급 평균 SES)를 구분해 해석한다 — 중심화 방식에 따라 의미가 달라진다.",
    ],
    comparisonProfile: {
      focus: "위계(군집) 자료에서 수준별 효과 추정",
      dependentVariable: "연속형 1개",
      independentVariable: "개인 수준 + 집단 수준 변수",
      minSampleSize: "2수준 단위 30개 이상 권장 (집단당 평균 10명 내외도 가능)",
      keyAssumptions: ["수준별 잔차 정규성", "충분한 집단 수"],
      strengthOneliner: "군집 자료의 독립성 위반을 정면으로 처리 — 학교 연구의 표준",
      limitationOneliner: "집단 수가 적으면 2수준 효과 추정이 불안정",
      groupCount: "varies",
      dependentVariableCount: "one",
      independentVariableCount: "two_or_more",
      designType: "varies",
    },
    references: [
      { id: "r1", title: "Hierarchical linear models: Applications and data analysis methods (2nd ed.)", author: "Raudenbush, S. W., & Bryk, A. S.", year: 2002 },
      { id: "r2", title: "Multilevel analysis: Techniques and applications (3rd ed.)", author: "Hox, J. J., Moerbeek, M., & van de Schoot, R.", year: 2018 },
    ],
  }),
  doc({
    slug: "mann-whitney",
    name: "Mann-Whitney U 검정",
    category: "nonparametric",
    summary: "독립된 두 집단의 분포(순위) 차이를 검정하는 비모수 방법. 독립표본 t검정의 정규성 가정이 어려울 때의 표준 대안이다.",
    accessibleSummary: "점수를 그대로 비교하는 대신 '전체에서 몇 등인지'로 바꿔 두 반의 등수 분포를 비교합니다. 극단값 한두 명 때문에 평균이 왜곡되는 상황에서도 안전합니다.",
    whenToUse: "두 독립 집단 비교에서 표본이 작고(집단당 30 미만) 정규성이 확보되지 않을 때, 종속변수가 서열척도일 때.",
    assumptions: [
      { id: "a1", name: "관측 독립성", description: "두 집단의 관측치가 서로 독립이어야 한다.", ifViolated: "짝지어진 자료라면 Wilcoxon 부호순위 검정 사용" },
      { id: "a2", name: "서열화 가능한 종속변수", description: "종속변수가 최소 서열척도 이상이어야 순위를 매길 수 있다." },
      { id: "a3", name: "동형 분포 (중앙값 해석 시)", description: "'중앙값 차이'로 해석하려면 두 분포의 모양이 유사해야 한다. 아니면 '확률적 우월'로 해석.", ifViolated: "분포 모양이 다르면 결과를 '한 집단 값이 더 클 확률'로 해석" },
    ],
    procedure: [
      { id: "p1", step: "전체 자료를 합쳐 순위 부여", detail: "동점은 평균 순위" },
      { id: "p2", step: "집단별 순위합으로 U 통계량 계산" },
      { id: "p3", step: "유의확률 확인", detail: "n이 크면 정규근사 z, 작으면 정확검정" },
      { id: "p4", step: "효과크기 r 보고", detail: "r = z/√N (0.1 작음 / 0.3 중간 / 0.5 큼)" },
    ],
    spssCommand: "NPAR TESTS /M-W= score BY group(1 2).",
    rCommand: "wilcox.test(score ~ group, data = df)",
    interpretationKeys: [
      "U(또는 z), p 와 함께 집단별 중앙값·사분위범위를 보고한다 (평균 대신).",
      "효과크기 r = z/√N 을 함께 제시한다.",
      "유의하다 = '두 집단 분포의 위치가 다르다'이며, 분포 모양이 다르면 중앙값 차이로 단정하지 않는다.",
    ],
    comparisonProfile: {
      focus: "두 독립 집단의 순위(분포 위치) 차이",
      dependentVariable: "서열형 이상 1개",
      independentVariable: "범주형 1개 (2집단)",
      minSampleSize: "집단당 5명 이상이면 계산 가능 (작을수록 정확검정)",
      keyAssumptions: ["관측 독립성"],
      strengthOneliner: "정규성·극단값 걱정 없이 두 집단 비교",
      limitationOneliner: "표본이 충분히 크고 정규성이 만족되면 t검정보다 검정력 낮음",
      groupCount: "two",
      dependentVariableCount: "one",
      independentVariableCount: "one",
      designType: "between_subjects",
    },
    references: [
      { id: "r1", title: "Nonparametric statistics for the behavioral sciences (2nd ed.)", author: "Siegel, S., & Castellan, N. J.", year: 1988 },
      { id: "r2", title: "Discovering statistics using IBM SPSS statistics (5th ed.)", author: "Field, A.", year: 2018 },
    ],
  }),
  doc({
    slug: "wilcoxon-signed-rank",
    name: "Wilcoxon 부호순위 검정",
    category: "nonparametric",
    summary: "짝지어진 두 측정(사전-사후 등)의 차이를 순위로 검정하는 비모수 방법. 대응표본 t검정의 정규성 가정이 어려울 때의 대안이다.",
    accessibleSummary: "학생마다 '사후-사전' 변화량을 구한 뒤, 변화의 크기 순위와 방향(+/-)만으로 '전체적으로 올랐다고 볼 수 있는지'를 판정합니다.",
    whenToUse: "동일 대상 2회 측정(사전-사후)에서 표본이 작고 차이 점수의 정규성이 확보되지 않을 때, 종속변수가 서열척도일 때.",
    assumptions: [
      { id: "a1", name: "짝지어진 자료", description: "동일 대상의 두 측정 또는 매칭된 쌍이어야 한다." },
      { id: "a2", name: "차이 점수의 대칭 분포", description: "차이 점수 분포가 중앙값을 중심으로 대략 대칭이어야 한다.", ifViolated: "심하게 비대칭이면 부호검정(sign test) 사용" },
    ],
    procedure: [
      { id: "p1", step: "쌍별 차이 계산 (사후-사전)" },
      { id: "p2", step: "차이의 절대값에 순위 부여 (0 제외)" },
      { id: "p3", step: "+순위합/-순위합으로 W(T) 통계량 계산" },
      { id: "p4", step: "z 근사 유의확률과 효과크기 r 보고" },
    ],
    spssCommand: "NPAR TESTS /WILCOXON=pre WITH post (PAIRED).",
    rCommand: "wilcox.test(df$post, df$pre, paired = TRUE)",
    interpretationKeys: [
      "z, p 와 함께 사전·사후 중앙값을 보고한다.",
      "효과크기 r = z/√N (N = 쌍의 수).",
      "차이가 0인 쌍은 분석에서 제외된다 — 보고 시 유효 쌍 수를 명시한다.",
    ],
    comparisonProfile: {
      focus: "짝지어진 두 측정의 변화 (비모수)",
      dependentVariable: "서열형 이상 1개 (반복 측정)",
      independentVariable: "시점 2개 (피험자내)",
      minSampleSize: "유효 쌍 6개 이상 권장",
      keyAssumptions: ["짝지어진 자료", "차이의 대칭 분포"],
      strengthOneliner: "소표본 사전-사후에서 안전한 변화 검정",
      limitationOneliner: "3시점 이상이면 Friedman 검정 필요",
      groupCount: "single",
      dependentVariableCount: "one",
      independentVariableCount: "one",
      designType: "within_subjects",
    },
    references: [
      { id: "r1", title: "Nonparametric statistics for the behavioral sciences (2nd ed.)", author: "Siegel, S., & Castellan, N. J.", year: 1988 },
    ],
  }),
  doc({
    slug: "kruskal-wallis",
    name: "Kruskal-Wallis H 검정",
    category: "nonparametric",
    summary: "3개 이상 독립 집단의 분포(순위) 차이를 검정하는 비모수 방법. 일원분산분석(ANOVA)의 정규성·등분산 가정이 어려울 때의 대안이다.",
    accessibleSummary: "세 반 이상의 점수를 전부 합쳐 등수를 매긴 뒤, 반별 평균 등수가 우연이라 보기 어려울 만큼 다른지 확인합니다.",
    whenToUse: "3개 이상 집단 비교에서 집단별 표본이 작거나 정규성이 확보되지 않을 때, 종속변수가 서열척도일 때.",
    assumptions: [
      { id: "a1", name: "관측 독립성", description: "집단 간·집단 내 관측치가 독립이어야 한다." },
      { id: "a2", name: "서열화 가능한 종속변수", description: "종속변수가 최소 서열척도 이상." },
      { id: "a3", name: "유사한 분포 모양 (중앙값 해석 시)", description: "중앙값 차이로 해석하려면 집단 간 분포 모양이 유사해야 한다.", ifViolated: "분포 위치(확률적 우월)로 해석" },
    ],
    procedure: [
      { id: "p1", step: "전체 순위 부여 후 집단별 순위합 계산" },
      { id: "p2", step: "H 통계량 산출 (χ² 분포 근사, df = k-1)" },
      { id: "p3", step: "유의 시 사후검정", detail: "Dunn 검정 + Bonferroni 보정 (SPSS: 모든 쌍별 비교)" },
      { id: "p4", step: "효과크기 보고", detail: "η²H = (H - k + 1)/(N - k)" },
    ],
    spssCommand: "NPAR TESTS /K-W=score BY group(1 3).",
    rCommand: "kruskal.test(score ~ group, data = df)\n# 사후: FSA::dunnTest(score ~ group, data = df, method = \"bonferroni\")",
    interpretationKeys: [
      "H(χ²), df, p 와 집단별 중앙값을 보고한다.",
      "전체 검정이 유의해도 어느 집단 간 차이인지는 Dunn 사후검정으로 확인한다.",
      "집단 간 분포 모양이 다르면 '중앙값 차이'가 아니라 '분포 위치 차이'로 서술한다.",
    ],
    comparisonProfile: {
      focus: "3개 이상 독립 집단의 순위 차이",
      dependentVariable: "서열형 이상 1개",
      independentVariable: "범주형 1개 (3집단 이상)",
      minSampleSize: "집단당 5명 이상 권장",
      keyAssumptions: ["관측 독립성"],
      strengthOneliner: "소표본·비정규 다집단 비교의 표준 대안",
      limitationOneliner: "상호작용(이원 설계)은 다룰 수 없음",
      groupCount: "three_or_more",
      dependentVariableCount: "one",
      independentVariableCount: "one",
      designType: "between_subjects",
    },
    references: [
      { id: "r1", title: "Nonparametric statistics for the behavioral sciences (2nd ed.)", author: "Siegel, S., & Castellan, N. J.", year: 1988 },
      { id: "r2", title: "Discovering statistics using IBM SPSS statistics (5th ed.)", author: "Field, A.", year: 2018 },
    ],
  }),
  doc({
    slug: "friedman",
    name: "Friedman 검정",
    category: "nonparametric",
    summary: "동일 대상을 3개 이상 시점(조건)에서 반복 측정한 자료의 순위 차이를 검정하는 비모수 방법. 반복측정 ANOVA의 대안이다.",
    accessibleSummary: "학생 한 명 한 명에 대해 3월·6월·9월 점수에 등수(1~3등)를 매기고, 특정 시점이 계속 1등을 차지하는지 확인합니다.",
    whenToUse: "동일 집단 3회 이상 측정에서 표본이 작거나 정규성·구형성이 확보되지 않을 때.",
    assumptions: [
      { id: "a1", name: "짝지어진 반복 자료", description: "모든 대상이 모든 시점(조건)에 측정돼야 한다.", ifViolated: "결측 시점이 있으면 해당 대상 제외 — 많으면 다층모형 고려" },
      { id: "a2", name: "서열화 가능한 종속변수", description: "대상 내에서 시점 간 순위를 매길 수 있어야 한다." },
    ],
    procedure: [
      { id: "p1", step: "대상별로 시점 점수에 순위 부여" },
      { id: "p2", step: "시점별 순위합으로 χ²F 통계량 계산 (df = k-1)" },
      { id: "p3", step: "유의 시 사후검정", detail: "Wilcoxon 쌍별 비교 + Bonferroni 보정" },
      { id: "p4", step: "효과크기 보고", detail: "Kendall's W (0~1, 일치도)" },
    ],
    spssCommand: "NPAR TESTS /FRIEDMAN=score_t1 score_t2 score_t3.",
    rCommand: "friedman.test(as.matrix(df[, c(\"t1\",\"t2\",\"t3\")]))",
    interpretationKeys: [
      "χ²F, df, p 와 시점별 중앙값(또는 평균 순위)을 보고한다.",
      "유의하면 Wilcoxon 쌍별 사후검정(Bonferroni)으로 어느 시점 간 차이인지 특정한다.",
      "효과크기로 Kendall's W 를 제시하면 시점 간 순위 일관성 크기를 전달할 수 있다.",
    ],
    comparisonProfile: {
      focus: "동일 대상 3개 이상 시점의 순위 변화 (비모수)",
      dependentVariable: "서열형 이상 1개 (반복 측정)",
      independentVariable: "시점/조건 3개 이상 (피험자내)",
      minSampleSize: "10명 내외부터 계산 가능",
      keyAssumptions: ["짝지어진 반복 자료"],
      strengthOneliner: "소표본 다시점 변화를 가정 부담 없이 검정",
      limitationOneliner: "시점 간 '얼마나' 변했는지는 말해주지 않음 (순위만)",
      groupCount: "single",
      dependentVariableCount: "one",
      independentVariableCount: "one",
      designType: "within_subjects",
    },
    references: [
      { id: "r1", title: "Nonparametric statistics for the behavioral sciences (2nd ed.)", author: "Siegel, S., & Castellan, N. J.", year: 1988 },
    ],
  }),
  doc({
    slug: "cronbach-alpha",
    name: "신뢰도 분석 (Cronbach's α)",
    category: "measurement",
    summary: "여러 문항이 같은 구인을 일관되게 재는지(내적 일관성)를 0~1 계수로 평가한다. 설문 도구 보고의 사실상 필수 지표다.",
    accessibleSummary: "'학습 동기' 10문항이 정말 한 목소리를 내는지 확인하는 검사입니다. 문항들이 서로 따로 논다면 합산 점수를 믿기 어렵습니다.",
    whenToUse: "리커트형 다문항 척도의 신뢰도를 보고할 때 (측정도구 절의 표준 요소). 요인분석으로 하위요인을 확인한 뒤 요인별로 산출한다.",
    assumptions: [
      { id: "a1", name: "단일 차원성", description: "α는 문항들이 하나의 구인을 잰다는 전제에서 의미가 있다 — 다차원 척도는 하위요인별로 산출.", howToCheck: "EFA/CFA로 요인구조 확인", ifViolated: "하위요인별 α 산출 또는 McDonald's ω 사용" },
      { id: "a2", name: "동일 방향 코딩", description: "역채점 문항은 α 계산 전에 반드시 역코딩해야 한다.", ifViolated: "역코딩 누락 시 α가 비정상적으로 낮게 나옴 — 문항-총점 상관이 음수인 문항을 점검" },
    ],
    procedure: [
      { id: "p1", step: "역채점 문항 역코딩" },
      { id: "p2", step: "요인(하위척도)별로 α 산출" },
      { id: "p3", step: "문항-총점 상관과 '문항 제거 시 α' 점검", detail: "문항-총점 상관 .30 미만 문항은 검토 대상" },
      { id: "p4", step: "보고", detail: "요인별 문항 수와 α를 측정도구 절 표로 제시 (선행연구 α와 비교)" },
    ],
    spssCommand: "RELIABILITY /VARIABLES=q1 q2 q3 q4 q5\n  /MODEL=ALPHA\n  /SUMMARY=TOTAL.",
    rCommand: "psych::alpha(df[, c(\"q1\",\"q2\",\"q3\",\"q4\",\"q5\")])",
    interpretationKeys: [
      "통상 .70 이상 수용, .80 이상 양호, .90 이상 우수로 해석한다 (Nunnally 기준).",
      "α가 지나치게 높으면(.95+) 문항 중복(같은 질문 반복)을 의심한다.",
      "α는 '문항 수'에 민감하다 — 문항이 많을수록 커지므로 문항 수와 함께 해석한다.",
    ],
    comparisonProfile: {
      focus: "다문항 척도의 내적 일관성",
      dependentVariable: "리커트형 문항 묶음",
      independentVariable: "-",
      minSampleSize: "문항 수의 5~10배 권장",
      keyAssumptions: ["단일 차원성", "동일 방향 코딩"],
      strengthOneliner: "도구 신뢰도 보고의 표준 — 모든 설문 연구의 기본",
      limitationOneliner: "타당도(제대로 재는가)는 별개 — 신뢰도만으로 도구 정당화 불가",
      groupCount: "varies",
      dependentVariableCount: "varies",
      independentVariableCount: "varies",
      designType: "varies",
    },
    references: [
      { id: "r1", title: "Coefficient alpha and the internal structure of tests", author: "Cronbach, L. J.", year: 1951 },
      { id: "r2", title: "Psychometric theory (3rd ed.)", author: "Nunnally, J. C., & Bernstein, I. H.", year: 1994 },
    ],
  }),
];

// ── 3) 비모수 ↔ 모수 상호 대안 링크 ──
const ALT_LINKS: { fromSlug: string; toSeedKey: string; reason: string }[] = [
  { fromSlug: "mann-whitney", toSeedKey: "statistical-method:t-test", reason: "정규성이 확보되고 표본이 충분하면 독립표본 t검정이 검정력이 더 높다" },
  { fromSlug: "wilcoxon-signed-rank", toSeedKey: "statistical-method:t-test", reason: "차이 점수가 정규분포이면 대응표본 t검정 사용" },
  { fromSlug: "kruskal-wallis", toSeedKey: "statistical-method:anova-oneway", reason: "정규성·등분산이 확보되면 일원분산분석 사용" },
  { fromSlug: "friedman", toSeedKey: "statistical-method:rm-anova", reason: "정규성·구형성이 확보되면 반복측정 ANOVA가 크기 정보까지 제공" },
  { fromSlug: "rm-anova", toSeedKey: "statistical-method:friedman", reason: "소표본·비정규 자료면 Friedman 검정으로 대체" },
  { fromSlug: "hlm", toSeedKey: "statistical-method:multiple-regression", reason: "군집 구조가 약하면(ICC ≈ 0) 일반 다중회귀로 충분" },
];

(async () => {
  const snap = await db.collection(COL).get();
  const bySeedKey = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const d of snap.docs) {
    const sk = (d.data() as { seedKey?: string }).seedKey;
    if (sk) bySeedKey.set(sk, d);
  }

  // 1) 카테고리 정정
  for (const fix of CATEGORY_FIXES) {
    const target = bySeedKey.get(fix.seedKey);
    if (!target) {
      console.log(`[fix] SKIP (not found): ${fix.seedKey}`);
      continue;
    }
    const cur = (target.data() as { category?: string }).category;
    if (cur === fix.category) {
      console.log(`[fix] OK (already): ${fix.seedKey} = ${fix.category}`);
      continue;
    }
    console.log(`[fix] ${fix.seedKey}: "${cur}" → "${fix.category}"`);
    if (APPLY) await target.ref.update({ category: fix.category, updatedAt: now() });
  }

  // 2) 신규 문서 upsert
  for (const d of NEW_DOCS) {
    const existing = bySeedKey.get(d.seedKey);
    if (existing) {
      console.log(`[new] UPDATE: ${d.seedKey} (${d.name})`);
      if (APPLY) await existing.ref.update({ ...d, updatedAt: now() });
    } else {
      console.log(`[new] CREATE: ${d.seedKey} (${d.name})`);
      if (APPLY) {
        const ref = await db.collection(COL).add({ ...d, createdAt: now(), updatedAt: now() });
        bySeedKey.set(d.seedKey, (await ref.get()) as FirebaseFirestore.QueryDocumentSnapshot);
      }
    }
  }

  // 3) 대안 링크 (APPLY 시에만 — 문서 id 필요)
  if (APPLY) {
    const fresh = await db.collection(COL).get();
    const freshBySeed = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const d of fresh.docs) {
      const sk = (d.data() as { seedKey?: string }).seedKey;
      if (sk) freshBySeed.set(sk, d);
    }
    for (const link of ALT_LINKS) {
      const from = freshBySeed.get(`statistical-method:${link.fromSlug}`);
      const to = freshBySeed.get(link.toSeedKey);
      if (!from || !to) {
        console.log(`[alt] SKIP: ${link.fromSlug} → ${link.toSeedKey}`);
        continue;
      }
      const cur = ((from.data() as { alternativeMethods?: { methodId: string }[] }).alternativeMethods) ?? [];
      if (cur.some((a) => a.methodId === to.id)) {
        console.log(`[alt] OK (already): ${link.fromSlug} → ${link.toSeedKey}`);
        continue;
      }
      await from.ref.update({
        alternativeMethods: [...cur, { methodId: to.id, reason: link.reason }],
        updatedAt: now(),
      });
      console.log(`[alt] LINKED: ${link.fromSlug} → ${link.toSeedKey}`);
    }
  } else {
    console.log(`[alt] 드라이런 — 대안 링크 ${ALT_LINKS.length}건은 --apply 시 연결`);
  }

  console.log(APPLY ? "✅ 적용 완료" : "드라이런 완료 — --apply 로 실행하세요");
})();
