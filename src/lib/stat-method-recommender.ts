// ── 설계 조건 기반 통계방법 추천 (순수 함수) ──
//
// 집단 비교(효과 검증) 연구에서 통계방법은 설계 조건에 따라 달라진다:
//   · 2집단↑ + 사전검사 + 무선할당·사전 동질성 확보 → 사후검사 t-test/ANOVA
//   · 2집단↑ + 사전검사 + 사전 차이/동질성 불확실(준실험·비동등 집단) → ANCOVA(사전점수 공변량 통제)
//   · 단일집단 사전-사후 → 대응표본 t-test (내적타당도 위협 한계)
//   · 3집단 이상 → ANOVA/ANCOVA (사후검정)
//   · 사전검사 없음(사후만) → 독립표본 t-test/ANOVA
// 관계·예측/요인/매개·조절 등 집단 비교가 아닌 설계는 이 추천 대상이 아니다(groupCount 미입력 → 빈 결과).
//
// 추천 결과의 name 은 statistical-methods-seed.ts SEED_STATISTICAL_METHODS 의 정식 명칭과
// 일치시켜, 선택 시 설계 폼 selectedStatMethods 에 그대로 반영된다. I/O·fetch 없는 순수 함수.

import type { DesignConditions } from "@/types/research-design";

/** 통계-시드 정식 명칭 (selectedStatMethods 반영 가능하도록 일치) */
const STAT = {
  tTest: "t-test (독립/대응표본)",
  anova: "ANOVA (일원분산분석)",
  ancova: "ANCOVA (공분산분석)",
} as const;

export interface StatMethodRecommendation {
  /** SEED_STATISTICAL_METHODS 정식 명칭 */
  name: string;
  /** 추천 사유 */
  rationale: string;
}

export interface StatMethodRecommendResult {
  recommended: StatMethodRecommendation[];
  /** 설계상 주의·한계 문구 */
  cautions: string[];
}

/**
 * 설계 조건으로부터 집단 비교용 통계방법을 추천한다.
 * groupCount 가 없으면(집단 비교 설계가 아니거나 미입력) 빈 결과를 반환한다.
 */
export function recommendStatMethods(cond: DesignConditions): StatMethodRecommendResult {
  const groupCount = cond.groupCount;
  if (!groupCount) return { recommended: [], cautions: [] };

  const threePlus = groupCount === "3plus";
  const posthocNote =
    "3집단 이상에서 유의한 차이가 나오면 사후검정(Scheffé·Tukey 등)으로 어느 집단 간 차이인지 확인하세요.";

  // ── 단일집단 ──
  if (groupCount === "1") {
    if (cond.hasPretest) {
      return {
        recommended: [
          {
            name: STAT.tTest,
            rationale:
              "동일 집단의 사전-사후 평균 차이를 검정하는 대응표본 t-검정이 적합합니다.",
          },
        ],
        cautions: [
          "단일집단 사전-사후 설계는 통제집단이 없어 성숙·검사효과·역사 등 내적타당도 위협에 취약합니다. 사후 향상을 처치 효과로만 단정하기 어렵다는 한계를 함께 밝히세요.",
        ],
      };
    }
    return {
      recommended: [],
      cautions: [
        "단일집단에 사전검사도 없으면 비교 기준이 없어 집단 비교·효과 검증 통계가 성립하지 않습니다. 사전검사를 추가하거나 비교집단을 두는 설계를 고려하세요.",
      ],
    };
  }

  // ── 2집단 이상 ──
  if (cond.hasPretest) {
    const equivalence = cond.pretestEquivalence ?? "unknown";
    // 무선할당 + 사전 동질성 확보 → 사후검사 t-test / ANOVA
    if (cond.randomAssignment === true && equivalence === "equivalent") {
      const recommended: StatMethodRecommendation[] = threePlus
        ? [
            {
              name: STAT.anova,
              rationale:
                "무선할당으로 집단이 사전에 동질하므로 사후검사 점수에 대한 일원분산분석(ANOVA)으로 처치 효과를 검증할 수 있습니다.",
            },
          ]
        : [
            {
              name: STAT.tTest,
              rationale:
                "무선할당으로 집단이 사전에 동질하므로 사후검사 점수의 집단 간 차이를 독립표본 t-검정으로 검증할 수 있습니다.",
            },
          ];
      return {
        recommended,
        cautions: [
          "사전-사후를 함께 분석하려면 시점×집단 상호작용을 보는 반복측정 ANOVA·혼합 ANOVA도 대안이 됩니다.",
          ...(threePlus ? [posthocNote] : []),
        ],
      };
    }
    // 사전 차이 존재 / 동질성 불확실 (준실험·비동등 집단) → ANCOVA
    return {
      recommended: [
        {
          name: STAT.ancova,
          rationale:
            "무선할당이 보장되지 않아 집단이 사전에 동질하지 않을 수 있으므로, 사전점수를 공변량으로 투입해 사전 차이를 통계적으로 통제한 뒤 사후 차이를 검증하는 ANCOVA가 권장됩니다.",
        },
      ],
      cautions: [
        "비동등 집단(준실험) 설계에서는 사전 차이를 통계적으로 통제해야 처치 효과를 타당하게 추정할 수 있습니다.",
        "대안으로 시점×집단 상호작용을 보는 혼합 ANOVA, 사후-사전 차이를 종속변수로 하는 이득점수(gain score) 분석도 고려할 수 있습니다.",
        ...(threePlus
          ? ["3집단 이상이면 ANCOVA의 조정평균에 대한 사후검정으로 집단 간 차이를 확인하세요."]
          : []),
      ],
    };
  }

  // ── 사전검사 없음 (사후만) ──
  const recommended: StatMethodRecommendation[] = threePlus
    ? [
        {
          name: STAT.anova,
          rationale:
            "사전검사 없이 사후검사만 실시하는 설계에서는 집단 간 사후 평균 차이를 일원분산분석(ANOVA)으로 검증합니다.",
        },
      ]
    : [
        {
          name: STAT.tTest,
          rationale:
            "사전검사 없이 사후검사만 실시하는 설계에서는 두 집단의 사후 평균 차이를 독립표본 t-검정으로 검증합니다.",
        },
      ];
  const cautions: string[] = [];
  if (cond.randomAssignment !== true) {
    cautions.push(
      "무선할당이 없으면 집단 간 사전 차이를 통제할 수 없어 사후 차이를 처치 효과로 단정하기 어렵습니다. 가능하면 사전검사를 추가해 ANCOVA로 통제하세요.",
    );
  }
  if (threePlus) cautions.push(posthocNote);
  return { recommended, cautions };
}

/**
 * 설계 조건을 초안·요약용 한 문장으로 서술한다(예: "사전-사후 비동등 집단 설계로
 * 사전점수를 공변량으로 한 ANCOVA(공분산분석)를 실시한다"). groupCount 미입력 시 빈 문자열.
 */
export function buildDesignConditionSummary(cond: DesignConditions): string {
  const { groupCount } = cond;
  if (!groupCount) return "";

  if (groupCount === "1") {
    return cond.hasPretest
      ? "단일집단 사전-사후 설계로 대응표본 t-검정을 실시한다(통제집단 부재에 따른 내적타당도 한계 유의)."
      : "단일집단 설계로 비교 기준이 없어 별도 집단 비교 통계는 적용하기 어렵다(설계 보완 필요).";
  }

  const groupLabel = groupCount === "3plus" ? "3집단 이상" : "2집단";
  if (cond.hasPretest) {
    const equivalence = cond.pretestEquivalence ?? "unknown";
    if (cond.randomAssignment === true && equivalence === "equivalent") {
      const method = groupCount === "3plus" ? "일원분산분석(ANOVA)" : "독립표본 t-검정";
      return `무선할당된 ${groupLabel} 사전-사후 설계로 사전 동질성을 확인한 뒤 사후검사에 대한 ${method}을 실시한다.`;
    }
    return `사전-사후 비동등 집단(${groupLabel}) 설계로 사전점수를 공변량으로 한 ANCOVA(공분산분석)를 실시한다.`;
  }
  const method = groupCount === "3plus" ? "일원분산분석(ANOVA)" : "독립표본 t-검정";
  return `${groupLabel} 사후검사 설계로 사후 점수의 집단 간 차이를 ${method}으로 검증한다.`;
}
