// ── 연구방법 추천 결정 로직 (순수 함수) ──
//
// 연구 설계 도구의 '가이드로 내 연구에 맞는 연구방법 찾기' 팝업에서 사용한다.
// 간단한 결정 도우미 질문(연구 목적·처치 여부·무선할당 가능성·개발 대상·이해 초점)에
// 답하면 후보 연구방법 1~3개를 추천한다. I/O·fetch 없는 순수 함수라 단위 테스트가 쉽다.
// 추천 결과의 methodName 은 research-methods-seed.ts SEED_RESEARCH_METHODS 의 정식 명칭과
// 일치시켜, 선택 시 설계 폼의 연구방법(select)·접근(kind)에 그대로 반영된다.

import type { ResearchMethodKind } from "@/types/research-method";

/** 연구의 근본 목적 */
export type RecommenderGoal = "" | "verify" | "understand" | "develop";
/** (develop) 무엇을 개발하는가 */
export type RecommenderDevelopKind = "" | "program" | "model" | "instrument";
/** (understand) 어떤 측면에 초점을 두는가 */
export type RecommenderUnderstandFocus =
  | ""
  | "experience"
  | "process"
  | "culture"
  | "story"
  | "case";

export interface RecommenderAnswers {
  /** 연구의 근본 목적 — 숫자로 검증(verify)/의미 이해(understand)/직접 개발(develop) */
  goal?: RecommenderGoal;
  /** (verify) 처치·프로그램을 적용해 집단을 비교하는가 */
  hasTreatment?: boolean | null;
  /** (verify + hasTreatment) 무선할당이 가능한가 */
  canRandomize?: boolean | null;
  /** (develop) 개발 대상 */
  developKind?: RecommenderDevelopKind;
  /** (understand) 이해 초점 */
  understandFocus?: RecommenderUnderstandFocus;
}

export interface MethodRecommendation {
  /** SEED_RESEARCH_METHODS 정식 명칭 */
  methodName: string;
  /** 연구 접근 — 선택 시 설계 폼 approach 에 반영 */
  kind: ResearchMethodKind;
  /** 추천 사유 (요약이 없을 때 대체 설명으로도 사용) */
  reason: string;
}

/**
 * 답변으로부터 후보 연구방법 1~3개를 추천한다.
 * 답이 부족하면(목적 미선택 등) 빈 배열을 반환한다.
 */
export function recommendResearchMethods(
  answers: RecommenderAnswers,
): MethodRecommendation[] {
  const { goal, hasTreatment, canRandomize, developKind, understandFocus } =
    answers;

  if (goal === "develop") {
    switch (developKind) {
      case "program":
        return [
          {
            methodName: "교육 프로그램 개발과 타당화",
            kind: "mixed",
            reason:
              "수업·연수·콘텐츠 프로그램을 체계적으로 개발하고 전문가 검토·현장 적용으로 타당화하려는 목적에 적합합니다.",
          },
          {
            methodName: "설계 개발 연구",
            kind: "mixed",
            reason:
              "산출물을 만드는 과정 자체를 절차·판단과 함께 체계적으로 연구·기록하려는 경우 함께 고려하세요.",
          },
        ];
      case "model":
        return [
          {
            methodName: "모형 개발과 타당화",
            kind: "mixed",
            reason:
              "교수설계·운영·역량 모형(구성요소·절차·관계)을 구안하고 델파이·현장 적용으로 검증하려는 목적에 적합합니다.",
          },
          {
            methodName: "설계 개발 연구",
            kind: "mixed",
            reason: "모형 개발 과정을 연구 대상으로 삼는 경우 함께 고려하세요.",
          },
        ];
      case "instrument":
        return [
          {
            methodName: "측정도구 개발과 타당화",
            kind: "mixed",
            reason:
              "검사·척도를 개발하고 신뢰도·타당도(내용·구인·준거)로 검증하려는 목적에 적합합니다.",
          },
        ];
      default:
        return [
          {
            methodName: "설계 개발 연구",
            kind: "mixed",
            reason:
              "무언가를 개발하는 연구 전반에 적용됩니다. 개발 대상(프로그램·모형·측정도구)을 고르면 더 구체적으로 추천됩니다.",
          },
          {
            methodName: "교육 프로그램 개발과 타당화",
            kind: "mixed",
            reason: "프로그램을 개발한다면 이 방법을 우선 고려하세요.",
          },
        ];
    }
  }

  if (goal === "verify") {
    if (hasTreatment === true) {
      if (canRandomize === true) {
        return [
          {
            methodName: "실험연구",
            kind: "quantitative",
            reason:
              "처치를 조작하고 무선할당이 가능하므로 인과 추론력이 가장 강한 실험연구가 적합합니다.",
          },
          {
            methodName: "준실험연구",
            kind: "quantitative",
            reason: "현장 여건상 무선할당이 어려워지면 대안으로 고려하세요.",
          },
        ];
      }
      if (canRandomize === false) {
        return [
          {
            methodName: "준실험연구",
            kind: "quantitative",
            reason:
              "처치는 있으나 무선할당이 어려운 현장(기존 학급 등)에서 사전점수를 통제해 처치 효과를 검증합니다.",
          },
        ];
      }
      // 무선할당 여부 미응답 — 두 후보를 함께 제시
      return [
        {
          methodName: "준실험연구",
          kind: "quantitative",
          reason:
            "처치 효과를 비교하는 연구입니다. 무선할당이 가능하면 실험연구를 우선 고려하세요.",
        },
        {
          methodName: "실험연구",
          kind: "quantitative",
          reason: "무선할당이 가능하다면 인과 추론력이 가장 강합니다.",
        },
      ];
    }
    // 처치 없음 → 조사·관계 검증
    return [
      {
        methodName: "설문조사연구",
        kind: "quantitative",
        reason:
          "처치 없이 변인 간 관계·분포·차이를 구조화된 설문으로 조사·검증하는 데 적합합니다.",
      },
      {
        methodName: "구조방정식모형(SEM)",
        kind: "quantitative",
        reason:
          "여러 변인 간 복잡한 인과 경로·매개효과를 동시에 검증하려면 함께 고려하세요.",
      },
    ];
  }

  if (goal === "understand") {
    switch (understandFocus) {
      case "experience":
        return [
          {
            methodName: "현상학",
            kind: "qualitative",
            reason:
              "어떤 현상을 직접 체험한 사람들의 진술에서 공통된 본질적 의미 구조를 밝히는 데 적합합니다.",
          },
        ];
      case "process":
        return [
          {
            methodName: "근거이론",
            kind: "qualitative",
            reason:
              "현장 자료에서 출발해 '왜·어떻게 이런 일이 일어나는가'를 설명하는 이론을 생성하는 데 적합합니다.",
          },
        ];
      case "culture":
        return [
          {
            methodName: "문화기술지",
            kind: "qualitative",
            reason:
              "한 집단의 문화·상호작용을 장기간 참여관찰로 내부자 관점에서 총체적으로 기술하는 데 적합합니다.",
          },
        ];
      case "story":
        return [
          {
            methodName: "내러티브 탐구",
            kind: "qualitative",
            reason:
              "개인의 경험을 이야기로 수집해 시간 흐름·맥락에 따라 재구성·해석하는 데 적합합니다.",
          },
        ];
      case "case":
        return [
          {
            methodName: "사례연구",
            kind: "qualitative",
            reason:
              "하나 또는 소수 사례를 다양한 자료원으로 심층·맥락적으로 기술·분석하는 데 적합합니다.",
          },
        ];
      default:
        return [
          {
            methodName: "사례연구",
            kind: "qualitative",
            reason: "소수 사례를 깊이 이해하려는 질적 연구의 대표적 방법입니다.",
          },
          {
            methodName: "현상학",
            kind: "qualitative",
            reason: "체험의 의미에 초점을 둔다면 현상학을 고려하세요.",
          },
          {
            methodName: "근거이론",
            kind: "qualitative",
            reason: "자료에서 새로운 이론을 만들려면 근거이론을 고려하세요.",
          },
        ];
    }
  }

  return [];
}
