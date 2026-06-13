// 사이클 58 — 측정 척도·변수 유형 기초 용어 8종 시드 (사용자 요청)
//  · 명목/서열/등간/비율 척도 + 범주형/연속형 + 질적/양적 척도 + 모수/비모수 통계
//  · 참고 페이지(quickdata.tistory.com)는 구조 참고만 — 본문은 Stevens(1946, Crossref 검증) 등
//    학술 통설 기반 재서술. 연구 참고 목적으로 허용 통계량·분석 선택 기준·흔한 실수를 구체 수록.
//  · 멱등: term 존재 시 스킵. 실행: npx tsx scripts/seed-measurement-scales.ts [--apply]
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const now = () => new Date().toISOString();
const ex = (text: string) => ({ id: randomUUID(), text });

const TERMS = [
  {
    term: "명목척도",
    englishName: "Nominal Scale",
    category: "measurement",
    summary:
      "대상을 서로 다른 범주로 구분만 하는 가장 낮은 수준의 측정이다(Stevens, 1946). 숫자를 부여해도(1=남, 2=여) 그 숫자에 크기·순서 의미가 없어 같다/다르다(=, ≠)만 판단할 수 있다. 허용 통계량은 빈도와 최빈값이며, 분석은 카이제곱 검정·로지스틱 회귀(결과변수)처럼 범주를 다루는 기법에 한정된다. 성별·전공·학교급·실험/통제집단 구분이 대표적이다. 명목 변수의 평균을 구하는 것(예: 성별 평균 1.4)은 무의미하므로 코딩 숫자를 산술에 사용하지 않도록 주의한다.",
    accessibleSummary:
      "'이름표'만 붙이는 척도예요. 1번 반·2번 반처럼 숫자가 있어도 크기가 아니라 구분 표시일 뿐 — 셀 수는 있지만(빈도) 더할 수는 없습니다.",
    examples: [
      ex("연구 대상의 성별, 소속 학교급(초·중·고), 전공 계열은 명목척도로 측정하였다."),
      ex("실험집단과 통제집단의 구분은 명목 변수이므로 집단 간 비율 비교에 카이제곱 검정을 적용하였다."),
    ],
  },
  {
    term: "서열척도",
    englishName: "Ordinal Scale",
    category: "measurement",
    summary:
      "범주 구분에 더해 순서(크다/작다) 정보를 갖지만, 순위 간 간격이 동일하다고 보장하지 못하는 측정이다(Stevens, 1946). 석차 1등과 2등의 실력 차이가 2등과 3등의 차이와 같다고 말할 수 없다. 허용 통계량은 중앙값·백분위이고, 분석은 Spearman 순위상관, Mann-Whitney U, Kruskal-Wallis 같은 비모수 기법이 원칙이다. 석차, 수상 등급(금·은·동), 만족도(상·중·하)가 대표적이다. 리커트형 단일 문항은 엄밀히 서열척도이며, 여러 문항의 합산 점수를 등간으로 취급하는 것은 관행임을 논문 작성 시 인지해야 한다.",
    accessibleSummary:
      "'순위'까지만 아는 척도예요. 달리기 1·2·3등은 순서는 알지만 1등과 2등의 기록 차이가 얼마인지는 말해주지 않습니다 — 그래서 평균 대신 중앙값을 씁니다.",
    examples: [
      ex("학업 성취 수준을 상·중·하 3단계 서열척도로 구분하고 집단 간 차이는 Kruskal-Wallis 검정으로 분석하였다."),
      ex("두 평정자의 순위 일치도는 Spearman 순위상관계수로 산출하였다."),
    ],
  },
  {
    term: "등간척도",
    englishName: "Interval Scale",
    category: "measurement",
    summary:
      "순서에 더해 측정값 사이의 간격이 동일한 척도다(Stevens, 1946). 덧셈·뺄셈이 의미를 갖고 평균·표준편차를 쓸 수 있어 t-검정, ANOVA, 회귀분석, Pearson 상관 등 대부분의 모수 통계가 가능해진다. 다만 절대 영점이 없어(0이 '없음'을 뜻하지 않음) 비율 해석은 불가하다 — 섭씨 20도가 10도의 '2배 더움'이 아니고, IQ 0이 지능 없음이 아니다. 표준화 점수(T점수·Z점수), 온도, 그리고 관행상 리커트 문항 합산 점수가 등간으로 취급된다. 교육 연구 종속변인의 다수가 이 수준이다.",
    accessibleSummary:
      "눈금 간격이 일정한 자예요. 더하고 빼고 평균 낼 수 있지만, 0이 '진짜 없음'이 아니라서 '2배'라는 말은 못 씁니다. 시험 0점이 '지식이 전혀 없음'을 뜻하지 않는 것과 같아요.",
    examples: [
      ex("학습몰입은 5점 리커트 척도 12문항의 합산 점수를 등간척도로 간주하여 평균과 표준편차를 보고하였다."),
      ex("사전·사후 표준화 점수(T점수)의 차이를 대응표본 t-검정으로 분석하였다."),
    ],
  },
  {
    term: "비율척도",
    englishName: "Ratio Scale",
    category: "measurement",
    summary:
      "등간의 속성에 절대 영점(0 = 정말 없음)까지 갖춘 가장 높은 수준의 측정이다(Stevens, 1946). 곱셈·나눗셈이 의미를 가져 'A가 B의 2배'라는 비율 해석이 가능하고, 기하평균·변동계수를 포함한 모든 통계량을 쓸 수 있다. 학습시간(분), 로그인 횟수, 정답 개수, 과제 수행 시간, 발화 빈도처럼 행동 로그 기반 변수가 대부분 여기 속한다. 학습분석(LA) 연구에서 다루는 클릭스트림·체류시간 변수들이 전형적 비율척도이며, 분포가 치우친 경우가 많아 로그 변환 등의 전처리를 함께 검토한다.",
    accessibleSummary:
      "0이 '진짜 0'인 척도예요. 학습시간 0분은 정말 안 한 것이고, 60분은 30분의 정확히 2배입니다 — 모든 계산이 가능한 가장 정보가 많은 척도입니다.",
    examples: [
      ex("LMS 로그에서 추출한 주당 학습시간(분)과 강의 영상 시청 횟수는 비율척도 변수로 수집하였다."),
      ex("과제 수행 시간이 우측으로 치우쳐 로그 변환 후 회귀분석을 실시하였다."),
    ],
  },
  {
    term: "범주형 변수와 연속형 변수",
    englishName: "Categorical vs. Continuous Variable",
    category: "measurement",
    summary:
      "분석 기법 선택의 1차 기준이 되는 구분이다. 범주형은 명목·서열척도(구분/순위), 연속형은 등간·비율척도(양)를 묶어 부르는 실무 분류다. 독립·종속변인의 조합이 분석을 결정한다: 독립 범주형 × 종속 연속형 → t-검정/ANOVA, 독립·종속 모두 연속형 → 상관·회귀, 모두 범주형 → 카이제곱, 독립 연속형 × 종속 범주형 → 로지스틱 회귀. 횟수처럼 정수만 갖는 이산형 변수도 값의 범위가 넓으면 연속형으로 취급하는 것이 관행이다. 변수 설계 단계에서 이 구분을 정해두면 연구계획서의 분석 방법 절을 일관되게 쓸 수 있다.",
    accessibleSummary:
      "'어느 분석을 쓸까'의 첫 갈림길이에요. 독립변인과 종속변인이 각각 범주(집단)인지 숫자(점수)인지만 정해도 t-test·ANOVA·상관·회귀·카이제곱 중 무엇이 맞는지 거의 결정됩니다.",
    examples: [
      ex("독립변인(수업 유형: 범주형)과 종속변인(성취도 점수: 연속형)의 구조이므로 집단 간 평균 비교(ANOVA)를 채택하였다."),
      ex("두 변인이 모두 범주형(성별 × 이수 여부)이어서 교차분석(카이제곱)을 실시하였다."),
    ],
  },
  {
    term: "질적 척도와 양적 척도",
    englishName: "Qualitative vs. Quantitative Scale",
    category: "measurement",
    summary:
      "측정 수준 4가지를 두 묶음으로 나누는 분류다. 질적 척도(명목·서열)는 속성의 '종류와 순위'를, 양적 척도(등간·비율)는 속성의 '양'을 측정한다. 주의할 점은 '질적 척도'와 '질적 연구'는 다른 개념이라는 것이다 — 질적 척도는 양적 연구 안에서 변수의 측정 수준을 가리키는 말이고, 질적 연구는 면담·관찰 자료를 해석하는 연구 패러다임이다. 설문에서 성별(질적 척도)을 묻고 만족도 평균(양적 척도)을 구하는 연구는 여전히 양적 연구다. 논문의 측정 도구 절에서 각 변수의 척도 수준을 명시하면 분석 방법의 정당화가 쉬워진다.",
    accessibleSummary:
      "명목·서열은 '질적 척도'(종류·순위), 등간·비율은 '양적 척도'(양)로 묶어 불러요. '질적 척도'라는 말이 '질적 연구'를 뜻하는 게 아니라는 점만 헷갈리지 않으면 됩니다.",
    examples: [
      ex("인구통계학적 변인(성별·학년)은 질적 척도로, 학습동기·자기효능감은 양적 척도로 측정하였다."),
    ],
  },
  {
    term: "모수 통계",
    englishName: "Parametric Statistics",
    category: "measurement",
    summary:
      "모집단이 특정 분포(주로 정규분포)를 따른다는 가정 위에서 평균·분산 같은 모수를 추정·검정하는 통계다. t-검정, ANOVA(ANCOVA·MANOVA 포함), 회귀분석, Pearson 상관이 대표적이다. 적용 조건은 통상 ① 종속변인이 등간척도 이상 ② 정규성(Shapiro-Wilk 등으로 확인) ③ 집단 비교 시 등분산성이다. 가정이 충족되면 같은 표본으로 비모수보다 높은 검정력을 얻는다. 표본이 충분히 크면(통상 집단당 30 이상) 중심극한정리에 의해 평균의 분포가 정규에 근사하므로 정규성 위반에 비교적 견고해진다. 논문에는 가정 검정 결과를 분석에 앞서 보고하는 것이 관례다.",
    accessibleSummary:
      "'자료가 정규분포를 따른다'는 약속 위에서 쓰는 통계예요(t-test, ANOVA, 회귀…). 약속이 지켜지면 차이를 더 민감하게 잡아내지만, 먼저 정규성 검정으로 약속을 확인하고 논문에 보고해야 합니다.",
    examples: [
      ex("정규성(Shapiro-Wilk)과 등분산성(Levene) 가정을 확인한 뒤 모수 통계인 독립표본 t-검정을 적용하였다."),
      ex("종속변인이 등간척도이고 집단당 표본이 30을 넘어 모수 검정을 채택하였다."),
    ],
  },
  {
    term: "비모수 통계",
    englishName: "Nonparametric Statistics",
    category: "measurement",
    summary:
      "모집단 분포에 대한 가정 없이(distribution-free) 주로 순위 정보로 검정하는 통계다. 모수 기법과의 대응이 핵심이다: 독립표본 t-검정 ↔ Mann-Whitney U, 대응표본 t-검정 ↔ Wilcoxon 부호순위, 일원분산분석 ↔ Kruskal-Wallis, Pearson 상관 ↔ Spearman 순위상관. 선택 기준은 ① 종속변인이 서열척도이거나 ② 표본이 작고(통상 집단당 30 미만) 정규성이 깨졌거나 ③ 극단치 영향이 클 때다. 교육 현장 연구처럼 한 학급 단위 소표본 실험에서 자주 쓰인다. 가정이 충족되는 상황에서는 모수 검정보다 검정력이 낮으므로 '안전하니까 무조건 비모수'는 좋은 전략이 아니다.",
    accessibleSummary:
      "분포 약속 없이 '순위'로 비교하는 통계예요. 표본이 작거나(학급 1~2개) 정규성이 깨졌을 때의 대안 — t-test 대신 Mann-Whitney U, ANOVA 대신 Kruskal-Wallis 를 쓰는 식의 짝을 기억해두면 됩니다.",
    examples: [
      ex("집단당 표본이 15명으로 작고 정규성이 기각되어 Mann-Whitney U 검정을 적용하였다."),
      ex("사전·사후 변화는 표본 수를 고려해 Wilcoxon 부호순위 검정으로 분석하였다."),
    ],
  },
];

async function main() {
  const snap = await db.collection("archive_foundation_terms").get();
  const existing = new Set(snap.docs.map((d) => (d.data() as { term?: string }).term ?? ""));
  let added = 0;
  for (const t of TERMS) {
    if (existing.has(t.term)) {
      console.log(`skip (존재): ${t.term}`);
      continue;
    }
    added += 1;
    console.log(`+ ${t.term} (${t.englishName})`);
    if (APPLY) {
      await db.collection("archive_foundation_terms").add({
        ...t,
        published: true,
        createdBy: "system:orchestra-cycle58",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }
  console.log(`\n신규 ${added} · ${APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ==="}`);
}
void main();
