// 교육공학 연구방법 가이드 — 기본 8종 시드 (published: false 로 적재)
//
// 운영자가 검수 후 published=true 로 토글하여 공개. 학술적 책임 회피를 위해
// summary 만 객관적인 짧은 정의로 채우고, 강점·약점·교육공학 예 등은 운영자
// 재량으로 채우도록 비워둠.

import { researchMethodsApi } from "./bkend";
import type { ResearchMethod, ResearchMethodKind } from "@/types";

interface SeedEntry {
  name: string;
  kind: ResearchMethodKind;
  summary: string;
  accessibleSummary?: string;
}

const SEED_RESEARCH_METHODS: SeedEntry[] = [
  // 양적 (5)
  {
    name: "설문조사연구",
    kind: "quantitative",
    summary:
      "표집된 대상에게 구조화된 설문 도구로 자료를 수집해 변인 간 관계·분포·차이를 통계적으로 분석하는 연구 방법.",
    accessibleSummary:
      "여러 사람에게 같은 질문지를 돌려 '이 집단이 평균적으로 어떻게 생각·행동하는가' 의 큰 그림을 그리는 방법. 인구조사·여론조사가 익숙한 예시.",
  },
  {
    name: "실험연구",
    kind: "quantitative",
    summary:
      "독립변인을 인위적으로 조작하고 무선할당으로 가외변인을 통제하여 처치 효과를 인과적으로 검증하는 연구 방법.",
    accessibleSummary:
      "약 A 와 B 의 효과를 비교하려고 무작위로 환자를 둘로 나눠 한쪽씩 주고 차이를 보는 것 — 같은 논리를 교육 변인에 적용한 연구.",
  },
  {
    name: "준실험연구",
    kind: "quantitative",
    summary:
      "교육 현장 특성상 무선할당이 어려울 때 기존 집단을 활용해 처치 효과를 검증하는 연구 방법.",
    accessibleSummary:
      "실험연구와 같은 비교를 하고 싶은데 무작위 배정이 어려운 현실(예: 이미 나뉜 반)에서, 사전 점수 등으로 차이를 보정하면서 효과를 추정하는 방법.",
  },
  {
    name: "메타분석",
    kind: "quantitative",
    summary:
      "동일 주제를 다룬 다수 선행 연구의 효과크기를 종합·통합하여 전체 효과와 조절변인을 통계적으로 분석하는 연구 방법.",
    accessibleSummary:
      "여러 논문이 각자 다른 결과를 내놓을 때, 그 결과들을 모아 '평균적으로 얼마나 큰 효과인가' 를 종합 계산. 여러 평론을 모아 '대체로 이런 평이다' 정리하는 것과 비슷.",
  },
  {
    name: "구조방정식모형(SEM)",
    kind: "quantitative",
    summary:
      "잠재변인을 포함한 다중 인과 관계를 동시에 추정하고 모형 적합도를 평가하는 다변량 통계 분석 방법.",
    accessibleSummary:
      "여러 변수들의 인과·관계 지도를 한 번에 그리고, 그 지도가 실제 데이터와 얼마나 맞는지 검증하는 방법. 화살표로 그린 큰 그림을 통계로 점검.",
  },
  // 질적 (3)
  {
    name: "사례연구",
    kind: "qualitative",
    summary:
      "하나 또는 소수의 사례를 다양한 자료원을 통해 심층적·맥락적으로 기술·분석하는 질적 연구 방법.",
    accessibleSummary:
      "한두 명·한 학교 같은 작은 단위를 깊이 들여다보며 'why·how' 를 풀어내는 방법. 의사가 환자 한 명을 정밀하게 분석하는 것과 비슷.",
  },
  {
    name: "근거이론",
    kind: "qualitative",
    summary:
      "자료에서 출발해 지속적 비교와 개방·축·선택 코딩을 거쳐 실체이론을 생성하는 질적 연구 방법.",
    accessibleSummary:
      "현장에서 모은 자료를 코딩·범주화·통합해 '왜 이런 일이 벌어지는가' 를 설명하는 새로운 이론을 만들어내는 방법.",
  },
  {
    name: "액션리서치",
    kind: "qualitative",
    summary:
      "실천가가 자신의 실천 맥락에서 문제를 진단하고 계획·실행·관찰·성찰의 순환을 통해 개선을 도모하는 참여적 연구 방법.",
    accessibleSummary:
      "교사가 자기 수업을 개선하려고 '계획→실행→관찰→반성' 사이클을 돌리며 변화를 시도하는 방법. 연구자 본인이 실행자.",
  },
];

export interface ResearchMethodSeedResult {
  created: number;
  skipped: number;
}

/** 동일 이름의 항목은 스킵하고 나머지를 draft 로 일괄 생성. */
export async function seedResearchMethods(
  userId: string,
  existing: ResearchMethod[],
): Promise<ResearchMethodSeedResult> {
  const existingNames = new Set(existing.map((m) => m.name.trim()));
  let created = 0;
  let skipped = 0;
  for (const entry of SEED_RESEARCH_METHODS) {
    if (existingNames.has(entry.name)) {
      skipped += 1;
      continue;
    }
    await researchMethodsApi.create({
      name: entry.name,
      kind: entry.kind,
      summary: entry.summary,
      accessibleSummary: entry.accessibleSummary,
      published: false,
      createdBy: userId,
    });
    created += 1;
  }
  return { created, skipped };
}
