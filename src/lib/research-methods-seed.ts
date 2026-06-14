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
  /** 연구절차 — 개발연구 등 단계별 step + 보조설명 */
  procedures?: { step: string; detail?: string }[];
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
  // 질적 (6)
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
  {
    name: "문화기술지",
    kind: "qualitative",
    summary:
      "특정 집단이 공유하는 문화 — 행동·신념·상호작용·언어 패턴 — 을 연구자가 장기간 현장에 참여하며 관찰·면담·기록을 통해 내부자 관점에서 총체적으로 기술·해석하는 질적 연구 방법.",
    accessibleSummary:
      "연구자가 한 집단(예: 한 교실·동아리·온라인 커뮤니티)에 오래 머무르며 '이들이 실제로 어떻게 생활하고 무엇을 당연하게 여기는가' 를 안에서 관찰·기록하는 방법. 인류학자가 한 마을에 들어가 함께 살며 그 문화를 이해하는 것과 비슷합니다.",
  },
  {
    name: "현상학",
    kind: "qualitative",
    summary:
      "어떤 현상을 실제로 체험한 사람들의 진술을 심층 면담으로 수집해, 그 체험에 공통적으로 내재한 본질적 의미 구조를 드러내는 질적 연구 방법.",
    accessibleSummary:
      "'그 일을 직접 겪은 사람에게 그것은 어떤 의미였는가' 를 깊이 인터뷰해 여러 사람의 경험에서 공통된 본질을 끌어내는 방법. 예: 처음 원격수업을 맡은 교사들이 공통적으로 느낀 경험의 의미를 밝히는 연구.",
  },
  {
    name: "내러티브 탐구",
    kind: "qualitative",
    summary:
      "개인이 자신의 경험을 이야기 형식으로 풀어낸 내러티브를 수집하고, 시간적 흐름과 맥락에 따라 재구성하여 그 의미를 해석하는 질적 연구 방법.",
    accessibleSummary:
      "한 사람의 경험을 '이야기' 로 듣고 그 줄거리·전환점·맥락을 따라가며 의미를 풀어내는 방법. 예: 한 학습자가 들려주는 성장 스토리를 시간순으로 재구성해 학습 경험의 의미를 이해하는 연구.",
  },
  // 혼합/개발연구 (3) — 사이클 103: 교육공학 개발연구 계열
  {
    name: "교육 프로그램 개발과 타당화",
    kind: "mixed",
    summary:
      "교육 프로그램(수업·연수·콘텐츠)을 체계적으로 개발하고, 전문가 검토·사용성 평가·현장 적용을 통해 타당성을 입증하는 연구 방법.",
    accessibleSummary:
      "'좋은 교육 프로그램을 만들고, 정말 효과·타당한지 단계적으로 검증한다' 는 접근. 만들기(개발)와 검증하기(타당화)가 한 연구 안에서 순환합니다.",
    procedures: [
      { step: "요구분석", detail: "학습자·현장의 요구와 문제를 분석하고 선행 프로그램·문헌을 고찰합니다." },
      { step: "설계", detail: "학습목표·내용·교수전략·매체 등 구성요소와 설계원리를 도출합니다." },
      { step: "개발", detail: "차시·학습자료·활동을 포함한 프로그램 초안을 개발합니다." },
      { step: "전문가 타당화", detail: "내용 전문가가 타당성을 검토(내용타당도 CVI 등)하고 수정합니다." },
      { step: "사용성·형성평가", detail: "소수 대상 예비 적용으로 사용성·이해도·난이도를 점검합니다." },
      { step: "현장 적용·효과 검증", detail: "실제 현장에 적용해 만족도·성취 등 효과를 검증합니다." },
      { step: "수정·보완", detail: "결과를 반영해 최종 프로그램과 운영 지침을 확정합니다." },
    ],
  },
  {
    name: "모형 개발과 타당화",
    kind: "mixed",
    summary:
      "교수설계·운영·역량 등에 대한 모형(구성요소·절차·관계)을 개발하고, 전문가 타당화와 현장 적용으로 타당성을 검증하는 연구 방법.",
    accessibleSummary:
      "복잡한 과정을 '구성요소와 단계로 그린 지도(모형)' 로 만들고, 그 지도가 현장에서 통하는지 전문가·적용으로 검증하는 연구입니다.",
    procedures: [
      { step: "문헌·사례 분석", detail: "관련 이론·기존 모형·실천 사례를 분석합니다." },
      { step: "모형 구안", detail: "구성요소·절차·요소 간 관계를 갖춘 잠정 모형을 구안합니다." },
      { step: "전문가 타당화", detail: "델파이·전문가 검토로 구성요소·절차의 타당성을 평가·수정합니다." },
      { step: "사용성 평가", detail: "모형을 실제 설계·운영에 적용해 사용성·적용가능성을 점검합니다." },
      { step: "현장 적용·효과 검증", detail: "현장 적용 결과로 모형의 효과·적합성을 확인합니다." },
      { step: "최종 모형 확정", detail: "수정·보완해 최종 모형과 활용 지침을 제시합니다." },
    ],
  },
  {
    name: "측정도구 개발과 타당화",
    kind: "mixed",
    summary:
      "특정 구성개념을 측정하는 검사·척도를 개발하고, 신뢰도와 타당도(내용·구인·준거)로 검증하는 연구 방법.",
    accessibleSummary:
      "'무엇을 어떻게 잴지' 를 정하고, 그 잣대(검사·설문)가 일관되고(신뢰도) 제대로 재는지(타당도) 통계로 검증해 만드는 연구입니다.",
    procedures: [
      { step: "구성개념 정의", detail: "측정하려는 개념을 이론적으로 정의하고 하위요인을 도출합니다." },
      { step: "문항 개발", detail: "문항 풀(pool)을 작성하고 응답 척도를 설계합니다." },
      { step: "내용타당도 검증", detail: "전문가가 문항-구성개념 일치도를 평가합니다(내용타당도 CVI)." },
      { step: "예비조사", detail: "소수 대상 예비조사로 모호한 문항을 정련합니다." },
      { step: "본조사·신뢰도", detail: "본조사 자료로 신뢰도(Cronbach α 등)를 확인합니다." },
      { step: "구인타당도 검증", detail: "요인분석(탐색적·확인적)으로 요인구조를 검증합니다." },
      { step: "준거타당도·확정", detail: "외부 준거와의 상관으로 타당도를 보강하고 최종 도구를 확정합니다." },
    ],
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
      procedures: entry.procedures?.map((p, i) => ({
        id: `p${i + 1}`,
        step: p.step,
        detail: p.detail,
      })),
      published: false,
      createdBy: userId,
    });
    created += 1;
  }
  return { created, skipped };
}
