// 교육공학 통계방법 가이드 — 기본 시드 (published: false 로 적재)
//
// 운영자가 검수 후 published=true 로 토글하여 공개. 학술적 책임 회피를 위해
// summary 만 객관적인 짧은 정의로 채우고, 가정·절차·구문 등 상세는 운영자
// 재량으로 채우도록 비워둠.

import { statisticalMethodsApi } from "./bkend";
import type {
  ComparisonProfile,
  StatisticalMethod,
  StatisticalMethodCategory,
} from "@/types/statistical-method";

interface SeedEntry {
  name: string;
  category: StatisticalMethodCategory;
  summary: string;
  accessibleSummary?: string;
  whenToUse?: string;
  comparisonProfile?: ComparisonProfile;
}

const SEED_STATISTICAL_METHODS: SeedEntry[] = [
  // ANOVA 계열 (4)
  {
    name: "ANOVA (일원분산분석)",
    category: "anova_family",
    summary:
      "한 개의 범주형 독립변수에 따른 연속형 종속변수 평균이 집단 간에 통계적으로 차이가 있는지 검정하는 분산분석 기법.",
    accessibleSummary:
      "여러 집단(3개 이상)의 평균이 같은지 한꺼번에 비교. t-test 의 다집단 확장판.",
    comparisonProfile: {
      groupCount: "three_or_more",
      dependentVariableCount: "one",
      independentVariableCount: "one",
      designType: "between_subjects",
    },
  },
  {
    name: "ANCOVA (공분산분석)",
    category: "anova_family",
    summary:
      "공변량을 통제한 후 범주형 독립변수에 따른 연속형 종속변수의 집단 간 평균 차이를 검정하는 분산분석 확장 기법.",
    accessibleSummary:
      "ANOVA 에 '출발점 차이'(예: 사전점수)를 통제해 두는 것 — 순수 효과만 골라내는 ANOVA.",
    comparisonProfile: {
      groupCount: "three_or_more",
      dependentVariableCount: "one",
      independentVariableCount: "one",
      designType: "between_subjects",
    },
  },
  {
    name: "MANOVA (다변량분산분석)",
    category: "anova_family",
    summary:
      "두 개 이상의 연속형 종속변수에 대한 범주형 독립변수의 집단 간 평균 차이를 동시에 검정하는 다변량 분산분석 기법.",
    accessibleSummary:
      "ANOVA 인데 종속변수가 여러 개(예: 점수·동기·만족도 동시) — 한 번에 비교.",
    comparisonProfile: {
      groupCount: "three_or_more",
      dependentVariableCount: "two_or_more",
      independentVariableCount: "one",
      designType: "between_subjects",
    },
  },
  {
    name: "MANCOVA (다변량공분산분석)",
    category: "anova_family",
    summary:
      "공변량을 통제한 상태에서 두 개 이상의 연속형 종속변수에 대한 집단 간 평균 차이를 검정하는 MANOVA 확장 기법.",
    accessibleSummary:
      "MANOVA + 공변량 통제. '여러 결과를 동시에 보면서 출발점 차이를 빼는 것'.",
    comparisonProfile: {
      groupCount: "three_or_more",
      dependentVariableCount: "two_or_more",
      independentVariableCount: "one",
      designType: "between_subjects",
    },
  },
  // 기본 차이검정 (1)
  {
    name: "t-test (독립/대응표본)",
    category: "anova_family",
    summary:
      "두 집단의 평균 차이(독립표본) 또는 동일 표본의 두 시점 평균 차이(대응표본)를 검정하는 모수 통계 기법.",
    accessibleSummary:
      "두 집단(예: A반·B반)의 점수가 진짜로 다른지, 아니면 우연인지 가려내는 도구.",
    comparisonProfile: {
      groupCount: "two",
      dependentVariableCount: "one",
      independentVariableCount: "one",
      designType: "varies",
    },
  },
  // 회귀분석 (2)
  {
    name: "다중회귀분석",
    category: "regression",
    summary:
      "두 개 이상의 독립변수가 한 개의 연속형 종속변수를 어떻게 예측·설명하는지 회귀계수와 결정계수로 추정하는 기법.",
    accessibleSummary:
      "결과(예: 시험점수)에 여러 요인이 얼마나 영향을 주는지, 각 요인의 '무게추' 를 다는 도구.",
    whenToUse:
      "독립변수가 여러 개여도 종속변수가 1개(연속형)인 단순한 인과·예측 모형일 때. 모형이 간결하고 변수가 적어 양적연구 입문에 적합하며 SPSS 로도 충분합니다. 양적연구를 처음 시작한다면 SEM 보다 회귀부터 시작하는 것이 일반적으로 권장됩니다.",
    comparisonProfile: {
      focus: "여러 독립변수 → 1개 종속변수의 예측·설명",
      dependentVariable: "연속형 1개",
      independentVariable: "연속형/범주형(더미) 다수",
      minSampleSize: "독립변수 1개당 10~20명 이상 권장(모형·효과크기에 따라 가변)",
      strengthOneliner: "모형이 단순하고 SPSS 로 가능 — 입문에 최적",
      limitationOneliner: "종속변수 1개·개별 관계만 — 복잡한 경로는 동시 검증 불가",
      groupCount: "varies",
      dependentVariableCount: "one",
      independentVariableCount: "two_or_more",
      designType: "varies",
    },
  },
  {
    name: "로지스틱회귀분석",
    category: "regression",
    summary:
      "이분형(또는 다항) 종속변수의 발생 확률을 독립변수들로 예측하는 일반화선형모형 기반의 회귀 기법.",
    accessibleSummary:
      "결과가 합격/불합격처럼 두 종류일 때, 그렇게 될 확률을 예측. 다중회귀의 이분 종속변수 버전.",
    comparisonProfile: {
      groupCount: "varies",
      dependentVariableCount: "one",
      independentVariableCount: "two_or_more",
      designType: "varies",
    },
  },
  // 요인분석 (2)
  {
    name: "탐색적 요인분석(EFA)",
    category: "factor",
    summary:
      "관측변수들 사이의 상관 구조에서 잠재요인을 자료 기반으로 탐색하여 도구의 차원성을 확인하는 분석 기법.",
    accessibleSummary:
      "여러 문항을 묶어 '이 문항들은 자기효능감, 저 문항들은 동기' 같은 숨은 그룹을 찾아내는 분석.",
    comparisonProfile: {
      groupCount: "single",
      dependentVariableCount: "two_or_more",
      independentVariableCount: "varies",
      designType: "varies",
    },
  },
  {
    name: "확인적 요인분석(CFA)",
    category: "factor",
    summary:
      "사전에 가정된 요인 구조가 관측 자료에 적합한지 모형 적합도 지수로 검증하는 측정모형 분석 기법.",
    accessibleSummary:
      "EFA 와 달리 '이 문항들이 진짜 자기효능감을 측정한다' 라는 가설을 데이터로 검증.",
    comparisonProfile: {
      groupCount: "single",
      dependentVariableCount: "two_or_more",
      independentVariableCount: "varies",
      designType: "varies",
    },
  },
  // SEM (1)
  {
    name: "구조방정식모형(SEM)",
    category: "sem",
    summary:
      "잠재변인을 포함한 다중 인과 관계와 측정모형을 동시에 추정·평가하는 다변량 통계 분석 기법.",
    accessibleSummary:
      "여러 변수의 인과·관계 지도를 한 번에 그리고 검증 — 큰 그림 통계 모형.",
    whenToUse:
      "여러 변수 사이의 복잡한 경로(예: 조직문화 → 직무만족 → 조직몰입 → 이직의도)를 동시에 검증하고 싶을 때. 회귀가 개별 관계만 본다면 SEM 은 전체 경로를 한 번에 추정합니다. 주로 AMOS 등을 사용하며, 표본은 일반적으로 200명 이상이 권장됩니다(모형 복잡도·추정법에 따라 가변). 방법론 수준이 높은 연구실에서는 석사논문에서도 사용합니다.",
    comparisonProfile: {
      focus: "다수 변수 간 복잡한 경로를 동시 검증(측정모형 + 구조모형)",
      dependentVariable: "관측·잠재변수 다수(경로상 매개·결과 동시)",
      independentVariable: "관측·잠재변수 다수",
      minSampleSize: "200명 이상 권장(모형 복잡도·추정법에 따라 가변)",
      strengthOneliner: "전체 경로를 한 번에 검증 + 측정오차 통제",
      limitationOneliner: "표본·모형 부담이 크고 AMOS 등 별도 도구 필요",
      groupCount: "varies",
      dependentVariableCount: "two_or_more",
      independentVariableCount: "two_or_more",
      designType: "varies",
    },
  },
  // 매개·조절 (3) — 보편 지식 객관 서술. 자료의 "다음 시간 예고" 영역으로 강의 상세는 없음.
  {
    name: "매개효과 분석(Mediation)",
    category: "mediation_moderation",
    summary:
      "독립변수가 종속변수에 영향을 미치는 과정에서 제3의 변수(매개변수)를 경유하는 간접효과를 검증하는 분석.",
    accessibleSummary:
      "A가 B에 영향을 주는 '경로 중간'에 끼어드는 변수를 찾는 분석 — 'A는 왜/어떻게 B에 영향을 주는가'.",
    whenToUse:
      "'독립변수가 어떤 경로(메커니즘)를 통해 종속변수에 영향을 주는가'를 설명하고 싶을 때. 예: 스마트폰 과의존이 자기조절력을 거쳐 학업태도에 영향을 미치는지. 회귀 기반(예: PROCESS 매크로) 또는 SEM 으로 검증하며, 간접효과의 유의성은 부트스트래핑으로 확인하는 것이 일반적으로 권장됩니다.",
    comparisonProfile: {
      focus: "독립 → 매개 → 종속의 간접효과(경로의 '과정')",
      dependentVariable: "연속형 1개(일반적)",
      independentVariable: "독립 + 매개변수",
      strengthOneliner: "관계가 '왜/어떻게' 일어나는지 설명",
      limitationOneliner: "인과 방향 가정에 주의 — 횡단자료는 해석 한계",
      groupCount: "varies",
      dependentVariableCount: "one",
      independentVariableCount: "two_or_more",
      designType: "varies",
    },
  },
  {
    name: "조절효과 분석(Moderation)",
    category: "mediation_moderation",
    summary:
      "독립변수가 종속변수에 미치는 영향의 크기·방향이 제3의 변수(조절변수)의 수준에 따라 달라지는지를 상호작용항으로 검증하는 분석.",
    accessibleSummary:
      "'A가 B에 주는 영향이 C에 따라 달라지는가' — 영향의 '강도·방향'이 조건에 따라 바뀌는지 보는 분석.",
    whenToUse:
      "독립변수의 효과가 특정 조건·집단에서 더 크거나 작은지(언제/누구에게 더 강한지)를 보고 싶을 때. 예: 과의존이 학업태도에 주는 영향이 성별에 따라 다른지. 회귀의 상호작용항(독립 × 조절) 투입으로 검증하며, 연속형 조절변수는 평균중심화 후 투입하는 것이 일반적으로 권장됩니다.",
    comparisonProfile: {
      focus: "독립 × 조절의 상호작용(효과의 '강도·방향' 변화)",
      dependentVariable: "연속형 1개(일반적)",
      independentVariable: "독립 + 조절변수 + 상호작용항",
      strengthOneliner: "효과가 '언제/누구에게' 강한지 규명",
      limitationOneliner: "상호작용 검출에는 충분한 표본·검정력 필요",
      groupCount: "varies",
      dependentVariableCount: "one",
      independentVariableCount: "two_or_more",
      designType: "varies",
    },
  },
  {
    name: "조절된 매개효과 분석(Moderated Mediation)",
    category: "mediation_moderation",
    summary:
      "매개를 통한 간접효과의 크기가 조절변수의 수준에 따라 달라지는지를 통합적으로 검증하는 분석.",
    accessibleSummary:
      "매개(과정)와 조절(조건)을 한 모형에서 — '그 경로가 조건에 따라 강해지거나 약해지는가'.",
    whenToUse:
      "매개 경로(독립 → 매개 → 종속)의 간접효과 자체가 조절변수에 따라 달라지는지를 확인하고 싶을 때. 매개와 조절을 결합한 모형으로, PROCESS 매크로(조건부 간접효과) 또는 SEM 으로 검증합니다. 모형이 복잡해 충분한 표본과 명확한 이론적 근거가 필요합니다.",
    comparisonProfile: {
      focus: "조절변수 수준별 조건부 간접효과(매개 × 조절 통합)",
      dependentVariable: "연속형 1개(일반적)",
      independentVariable: "독립 + 매개 + 조절변수",
      minSampleSize: "모형 복잡도에 따라 충분한 표본 필요(부트스트래핑 권장)",
      strengthOneliner: "'과정'과 '조건'을 한 모형에서 통합 검증",
      limitationOneliner: "모형·해석 복잡 — 탄탄한 이론적 근거 필요",
      groupCount: "varies",
      dependentVariableCount: "one",
      independentVariableCount: "two_or_more",
      designType: "varies",
    },
  },
];

export interface StatisticalMethodSeedResult {
  created: number;
  skipped: number;
}

/** 동일 이름의 항목은 스킵하고 나머지를 draft 로 일괄 생성. */
export async function seedStatisticalMethods(
  userId: string,
  existing: StatisticalMethod[],
): Promise<StatisticalMethodSeedResult> {
  const existingNames = new Set(existing.map((m) => m.name.trim()));
  let created = 0;
  let skipped = 0;
  for (const entry of SEED_STATISTICAL_METHODS) {
    if (existingNames.has(entry.name)) {
      skipped += 1;
      continue;
    }
    await statisticalMethodsApi.create({
      name: entry.name,
      category: entry.category,
      summary: entry.summary,
      accessibleSummary: entry.accessibleSummary,
      whenToUse: entry.whenToUse,
      comparisonProfile: entry.comparisonProfile,
      published: false,
      createdBy: userId,
    });
    created += 1;
  }
  return { created, skipped };
}
