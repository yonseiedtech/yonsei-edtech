// 사이클 63 — 결과표 통계 기호 기초 용어 6종 (사용자 요청: 효과크기와 연계해 p·t·부분에타 등)
//  · 논문 결과표를 "읽는" 데 필요한 기호 체계 — p값·검정통계량(t/F/χ²)·자유도·partial η²·Cohen's d·신뢰구간
//  · 기존 "효과크기"(개괄)와 본문에서 상호 연계, p값↔효과크기 구분(가장 흔한 오해)을 반복 강조
//  · 멱등: term 존재 시 스킵. 실행: npx tsx scripts/seed-stat-symbols.ts [--apply]
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
    term: "p값 (유의확률)",
    englishName: "p-value",
    category: "measurement-scale",
    summary:
      "귀무가설(효과 없음)이 참이라고 가정했을 때, 지금 관찰된 것만큼 또는 그보다 극단적인 결과가 나올 확률이다. 관례적으로 p < .05면 '통계적으로 유의하다'고 판정하지만 이는 절단 규칙일 뿐이다. 세 가지 흔한 오해를 경계해야 한다: ① p는 효과의 크기가 아니다 — 표본이 크면 미미한 차이도 p < .001이 된다 (크기는 효과크기로 보고) ② p는 귀무가설이 참일 확률이 아니다 ③ p > .05가 '효과 없음의 증명'이 아니다. APA 보고 관례는 정확값 보고(p = .023)이며, SPSS가 .000으로 출력해도 p < .001로 쓴다.",
    accessibleSummary:
      "'우연이라고 보기엔 이상한 정도'를 나타내는 숫자예요. 작을수록 우연으로 설명하기 어렵다는 뜻이지만, 효과가 크다는 뜻은 아닙니다 — '있는가'는 p값이, '얼마나 큰가'는 효과크기가 답합니다.",
    examples: [
      ex("두 집단의 평균 차이는 통계적으로 유의하였다, t(58) = 2.31, p = .025, d = 0.60."),
      ex("SPSS 출력의 .000은 p < .001로 보고하였다."),
    ],
  },
  {
    term: "검정통계량 (t·F·χ²)",
    englishName: "Test Statistic",
    category: "measurement-scale",
    summary:
      "관찰된 데이터가 귀무가설로부터 얼마나 떨어져 있는지를 표준화한 거리로, 이 값에서 p값이 계산된다. 분석마다 짝이 정해져 있다: t는 두 평균 차이(t-test)나 개별 회귀계수 검정에서, F는 셋 이상 집단 분산 비교(ANOVA 계열)나 회귀모형 전체 검정에서, χ²는 범주형 교차분석이나 모형 적합도에서 쓰인다. 항상 자유도와 함께 보고한다 — t(58) = 2.31, F(2, 87) = 5.41, χ²(4) = 12.3 처럼. 값이 클수록(절대값 기준) 귀무가설에서 멀다는 뜻이고, 같은 값이라도 자유도에 따라 p가 달라진다.",
    accessibleSummary:
      "'차이가 우연 변동에 비해 몇 배나 큰가'를 나타내는 점수예요. t·F·χ² 중 무엇이 나오는지는 분석 종류가 정하고, 괄호 안 자유도와 세트로 읽으면 됩니다.",
    examples: [
      ex("수업 유형에 따른 성취도 차이는 유의하였다, F(2, 87) = 5.41, p = .006, partial η² = .11."),
    ],
  },
  {
    term: "자유도 (df)",
    englishName: "Degrees of Freedom",
    category: "measurement-scale",
    summary:
      "통계량을 계산할 때 자유롭게 변할 수 있는 정보의 개수로, 검정통계량의 분포 모양을 결정한다. 결과표 읽기에 실용적인 규칙: 독립표본 t-test의 df = 전체 사례 수 − 2 (t(58)이면 60명 내외), 일원분산분석 F(집단−1, 사례−집단) — F(2, 87)이면 3개 집단·90명, 카이제곱 χ²의 df = (행−1)×(열−1). 거꾸로 자유도에서 연구의 표본 규모를 역산할 수 있어, 논문을 비판적으로 읽을 때 유용하다.",
    accessibleSummary:
      "괄호 안 숫자(t(58), F(2, 87))는 장식이 아니라 '몇 집단, 몇 명으로 계산했는지'의 단서예요. F(2, 87)을 보면 세 집단에 약 90명 연구라는 걸 바로 알 수 있습니다.",
    examples: [
      ex("t(58) = 2.31에서 df = 58이므로 두 집단 합계 약 60명임을 알 수 있다."),
    ],
  },
  {
    term: "부분에타제곱 (partial η²)",
    englishName: "Partial Eta Squared",
    category: "measurement-scale",
    summary:
      "ANOVA 계열(ANOVA·ANCOVA·MANOVA)에서 쓰는 효과크기로, 다른 효과를 제거한 뒤 해당 요인이 설명하는 분산의 비율이다. Cohen의 관례 기준은 .01(작음)·.06(중간)·.14(큼)이다. SPSS의 '효과크기 표시' 옵션이 출력하는 것이 partial η²이므로, 논문에 η²로 잘못 표기하지 않도록 주의한다(요인이 하나뿐인 일원분산분석에서는 둘이 같다). p값과 반드시 함께 보고해 '유의하고 또한 중간 크기 효과'처럼 두 정보를 모두 제시하는 것이 관례다 — 효과크기 항목과 연계해 읽으면 좋다.",
    accessibleSummary:
      "ANOVA에서 '이 요인이 점수 차이의 몇 %를 설명하나'를 알려주는 효과크기예요. .06이면 중간, .14면 큰 효과 — SPSS가 자동으로 계산해 주는 값이 바로 이것(partial)입니다.",
    examples: [
      ex("처치 효과는 유의하였고 효과크기는 중간 수준이었다, F(1, 88) = 7.92, p = .006, partial η² = .08."),
    ],
  },
  {
    term: "Cohen's d",
    englishName: "Cohen's d",
    category: "measurement-scale",
    summary:
      "두 집단 평균 차이를 표준편차 단위로 표준화한 효과크기로, t-test와 짝을 이룬다. d = (M₁ − M₂) / 통합 표준편차이며, Cohen의 관례 기준은 0.2(작음)·0.5(중간)·0.8(큼)이다. '두 집단이 표준편차의 몇 배만큼 떨어져 있는가'로 읽으면 직관적이다 — d = 0.5면 평균이 반 표준편차 차이. 측정 단위가 달라도 비교 가능해 메타분석의 기본 통화로 쓰이고, 검정력 분석(G*Power)에서 필요 표본을 계산할 때의 입력값이기도 하다.",
    accessibleSummary:
      "두 집단 점수가 '표준편차 몇 개만큼' 떨어져 있는지예요. 0.5면 중간 크기 — 시험 점수든 만족도든 단위와 무관하게 효과의 크기를 같은 자로 잴 수 있게 해줍니다.",
    examples: [
      ex("실험집단의 성취도가 통제집단보다 유의하게 높았다, t(58) = 2.31, p = .025, d = 0.60 (중간 효과)."),
    ],
  },
  {
    term: "신뢰구간 (CI)",
    englishName: "Confidence Interval",
    category: "measurement-scale",
    summary:
      "모수(참값)가 있을 법한 범위를 데이터로부터 추정한 구간이다. 95% CI의 정확한 의미는 '같은 방식으로 반복 표집하면 구간들의 95%가 참값을 포함한다'이다. 해석 규칙: 평균 차이의 95% CI가 0을 포함하지 않으면 p < .05와 동치이고, 오즈비·상대위험의 CI는 1 포함 여부로 본다. 점 추정치 하나(p값)보다 효과의 크기와 불확실성을 동시에 보여주므로, 최근 학술지들은 효과크기와 CI 보고를 p값보다 우선 권장한다.",
    accessibleSummary:
      "'참값이 이 안 어딘가에 있을 것'이라는 범위예요. 구간이 0을 안 걸치면 유의한 차이 — 그리고 구간이 좁을수록 추정이 정밀하다는 보너스 정보까지 줍니다.",
    examples: [
      ex("평균 차이는 4.2점이었다, 95% CI [1.1, 7.3] — 구간이 0을 포함하지 않아 유의한 차이다."),
    ],
  },
];

async function main() {
  const ft = await db.collection("archive_foundation_terms").get();
  const existing = new Set(ft.docs.map((d) => (d.data() as { term?: string }).term ?? ""));
  let added = 0;
  for (const t of TERMS) {
    if (existing.has(t.term)) {
      console.log(`skip (존재): ${t.term}`);
      continue;
    }
    added += 1;
    console.log(`+ ${t.term}`);
    if (APPLY) {
      await db.collection("archive_foundation_terms").add({
        ...t,
        published: true,
        createdBy: "system:orchestra-cycle63",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }
  console.log(`\n신규 ${added} · ${APPLY ? "=== 적용 완료 ===" : "=== 드라이런 ==="}`);
}
void main();
