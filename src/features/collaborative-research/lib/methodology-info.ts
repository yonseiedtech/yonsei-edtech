// ────────────────────────────────────────────────────────────
// features/collaborative-research/lib/methodology-info.ts
//
// 연구 유형(MethodologyKind)·연구 설계(MethodologyDesign) 별 정의·유의점.
// 동적 도움말로 메타 폼에서 사용자가 선택할 때 실시간 표시.
// ────────────────────────────────────────────────────────────

import type { MethodologyKind, MethodologyDesign } from "@/types";

export interface MethodologyInfo {
  /** 짧은 정의 (1-2문장) */
  definition: string;
  /** 유의해야 할 점 (3~5개 bullet) */
  cautions: string[];
  /** 적합한 사례 (선택) */
  examples?: string[];
}

export const METHODOLOGY_KIND_INFO: Record<MethodologyKind, MethodologyInfo> = {
  quantitative: {
    definition:
      "수치 데이터를 수집·통계 분석하여 변인 간 관계, 효과의 크기, 일반화 가능성을 검증하는 연구 패러다임.",
    cautions: [
      "변인의 조작적 정의가 명확해야 측정 타당도가 확보됩니다.",
      "표본 크기(power analysis)를 사전 산출하여 효과 검출력을 확보하세요.",
      "결측값·이상치 처리 기준을 사전에 정의하고 보고하세요.",
      "통계 가정(정규성·등분산·독립성)을 검증 후 적절한 검정 선택.",
    ],
    examples: ["마이크로러닝 학습효과 실험", "TPACK 척도 타당화", "LMS 사용패턴 회귀분석"],
  },
  qualitative: {
    definition:
      "현상·맥락·의미를 텍스트·관찰·인터뷰 등 비수치 자료로 깊이 있게 이해하는 연구 패러다임.",
    cautions: [
      "연구자 자신이 도구이므로 reflexivity(성찰성)을 기록·보고해야 합니다.",
      "참여자 선정의 의도성(purposive sampling) 근거를 명시하세요.",
      "삼각검증(triangulation), member check 등 신뢰성 확보 절차 필요.",
      "데이터 포화(saturation) 달성 여부를 판단·기록.",
      "맥락 의존적 결과이므로 일반화보다는 전이가능성(transferability) 관점에서 해석.",
    ],
    examples: ["대학원생 학습경험 내러티브", "원격수업 교사 적응 사례연구"],
  },
  mixed: {
    definition:
      "양적·질적 방법을 의도적으로 통합하여 단일 패러다임으로는 답할 수 없는 복합 연구 문제를 다루는 연구.",
    cautions: [
      "통합의 목적(보완·확장·발견)을 명확히 사전 정의하세요.",
      "설계 유형(병렬·순차·내포)을 선택하고 우선순위(QUAN+qual / QUAL+quan)를 표기.",
      "양쪽 데이터의 통합 시점(분석·해석)을 분명히.",
      "단일 패러다임 연구 2개의 합이 아니라, 진정한 통합 해석을 산출해야 합니다.",
    ],
    examples: ["스마트교육 효과 측정(설문) + 실천 사례 해석(인터뷰)"],
  },
};

export const METHODOLOGY_DESIGN_INFO: Record<MethodologyDesign, MethodologyInfo> = {
  experimental: {
    definition:
      "참여자를 실험집단과 통제집단에 무작위 할당하고 처치 효과를 비교하여 인과관계를 검증하는 가장 엄격한 양적 설계.",
    cautions: [
      "무작위 할당(random assignment)이 핵심 — 단순 무작위 선정과 구분.",
      "처치 외 변인 통제(blinding, 동질성 확보) 절차 필수.",
      "검정력 확보를 위한 표본 크기 산정 (G*Power 등).",
      "윤리적 통제집단 설계 — 효과 검증 후 통제집단에도 처치 제공 검토.",
    ],
    examples: ["AB 테스트형 학습효과 검증", "약물·교수법 효과 비교 RCT"],
  },
  quasi_experimental: {
    definition:
      "무작위 할당이 불가능한 현장 상황에서 기존 집단(학급·학교)을 활용하여 처치 효과를 추정하는 설계.",
    cautions: [
      "사전검사로 두 집단 동질성을 검증·통제(ANCOVA 등).",
      "선택편향(selection bias)의 위협을 논의에서 명시해야 합니다.",
      "비교집단 미존재 시 단일집단 사전-사후 설계는 인과 해석 신중.",
      "이력·성숙·검사 효과 등 내적 타당도 위협 사전 점검.",
    ],
    examples: ["같은 학교 두 반에 다른 교수법 적용 후 비교"],
  },
  correlational: {
    definition:
      "변인 간 자연적 관계(상관·예측)를 측정하여 패턴을 발견하는 설계. 인과 추론은 어렵지만 가설 도출에 유용.",
    cautions: [
      "상관은 인과가 아님 — 결과 해석 시 단어 선택 주의.",
      "제3변수(잠재변수) 효과 가능성 항상 고려.",
      "다중공선성, 비선형 관계 확인 후 적절한 회귀 모형 선택.",
    ],
    examples: ["디지털리터러시와 학업성취 상관", "교사효능감 예측변인 회귀"],
  },
  case_study: {
    definition:
      "단일 또는 소수 사례를 다양한 자료원으로 깊이 분석하여 맥락 내 현상을 이해하는 질적 설계.",
    cautions: [
      "사례 선정 근거(특수성·전형성)를 명시.",
      "다중 자료원(인터뷰·관찰·문서)으로 삼각검증.",
      "결과의 전이가능성(transferability)을 위해 사례 맥락을 풍부히 기술(thick description).",
    ],
    examples: ["혁신학교 운영 사례", "온라인 수업 우수교사 1인 심층연구"],
  },
  ethnography: {
    definition:
      "특정 문화·공동체에 장기간 참여관찰하여 구성원의 관점에서 의미체계를 기술·해석하는 인류학적 설계.",
    cautions: [
      "현장 진입 협상과 라포 형성에 충분한 시간(보통 6개월~수년) 필요.",
      "내부자(emic)·외부자(etic) 관점을 모두 기록.",
      "연구자 영향(reactivity)을 성찰·기록.",
    ],
  },
  grounded_theory: {
    definition:
      "수집한 자료에서 귀납적·반복적 코딩(open→axial→selective)을 통해 이론을 생성하는 질적 설계.",
    cautions: [
      "선행이론에 얽매이지 않는 열린 자세 유지.",
      "이론적 표집(theoretical sampling) — 분석 결과에 따라 추가 자료 수집.",
      "포화(saturation) 도달까지 반복.",
      "지속적 비교(constant comparison) 방법론 준수.",
    ],
  },
  design_based_research: {
    definition:
      "실제 교육 맥락에서 설계·실행·평가·재설계의 반복(iteration)으로 학습 환경과 이론을 동시에 산출하는 설계.",
    cautions: [
      "최소 2~3 iteration의 반복 실행 계획 필요.",
      "교사·학생 등 실무자와의 협력(co-design) 구조화.",
      "설계 원리(design principles) 추출이 핵심 산출물.",
    ],
    examples: ["AI 기반 형성평가 도구 반복 개발·검증"],
  },
  action_research: {
    definition:
      "연구자(주로 실무자)가 자신의 실천 현장을 개선하기 위해 계획-실행-관찰-성찰의 순환을 수행하는 실천 지향 연구.",
    cautions: [
      "연구자=실천자 이중 역할의 윤리·이해상충 명시.",
      "참여자(학생·동료)와의 협력적 의사결정 구조화.",
      "최소 2 cycle 이상의 반복 실행 권장.",
    ],
  },
  phenomenology: {
    definition:
      "특정 경험에 대한 개인들의 본질적 의미를 그들의 관점에서 기술·해석하는 질적 설계 (후설 / 하이데거 전통).",
    cautions: [
      "연구자의 선입견을 괄호치기(bracketing) — 자료 분석 전 명시.",
      "심층 인터뷰(보통 8~15명) 후 본질적 주제(essence) 추출.",
      "참여자가 해당 경험을 충분히 한 사람이어야 (purposive sampling).",
    ],
  },
  narrative: {
    definition:
      "참여자가 들려주는 이야기(life story·서사)를 시간·맥락 속에서 재구성·해석하는 질적 설계.",
    cautions: [
      "이야기의 시간성·맥락성·관계성 3축으로 재구성.",
      "공동 구성(co-construction) — 참여자도 해석의 주체로 인정.",
      "이야기 다시쓰기(restorying)의 윤리적 책임.",
    ],
  },
  other: {
    definition: "기타 — 위 11개 표준 설계에 해당하지 않는 새로운 설계.",
    cautions: [
      "선택한 설계의 출처(논문·방법론서)와 채택 근거를 명시하세요.",
      "심사 단계에서 추가 설명이 요구될 가능성이 높습니다.",
    ],
  },
};

/** 분석 방법 사전 — 양적/질적/혼합에 따라 추천 후보 */
export interface AnalysisMethodOption {
  /** 분류 (양적/질적/혼합) */
  kind: MethodologyKind | "all";
  /** 짧은 이름 */
  name: string;
  /** 1-2문장 설명 */
  desc: string;
}

export const ANALYSIS_METHOD_LIBRARY: AnalysisMethodOption[] = [
  // ─── 양적 ───
  { kind: "quantitative", name: "기술통계 (평균·표준편차·빈도)", desc: "변인 분포 요약. 본격 분석 전 필수." },
  { kind: "quantitative", name: "t-검정 (독립·대응표본)", desc: "두 집단 평균 차이 검증." },
  { kind: "quantitative", name: "ANOVA / ANCOVA", desc: "3개 이상 집단 평균 비교 또는 공변량 통제 후 비교." },
  { kind: "quantitative", name: "회귀분석 (단순·다중)", desc: "독립변인이 종속변인을 얼마나 설명·예측하는지 분석." },
  { kind: "quantitative", name: "구조방정식모형 (SEM)", desc: "잠재변인 간 인과 경로와 매개·조절 효과를 통합 검증." },
  { kind: "quantitative", name: "확인적/탐색적 요인분석 (CFA/EFA)", desc: "척도 구성 타당도 검증 또는 요인 구조 발견." },
  { kind: "quantitative", name: "위계적 선형 모형 (HLM)", desc: "학교-학급-학생 등 다층 데이터 구조에서 무선효과 추정." },
  { kind: "quantitative", name: "메타분석", desc: "다수 선행연구의 효과 크기를 양적 통합." },
  // ─── 질적 ───
  { kind: "qualitative", name: "주제분석 (thematic analysis)", desc: "데이터에서 반복되는 패턴·주제 추출 (Braun & Clarke 6단계)." },
  { kind: "qualitative", name: "내용분석", desc: "텍스트·미디어를 범주화하여 빈도·맥락 분석." },
  { kind: "qualitative", name: "근거이론 코딩 (open→axial→selective)", desc: "귀납적 3단계 코딩으로 이론 생성." },
  { kind: "qualitative", name: "현상학적 분석 (Colaizzi·Giorgi)", desc: "경험의 본질적 의미 단위 추출." },
  { kind: "qualitative", name: "내러티브 분석", desc: "이야기의 구조·시간성·맥락 해석." },
  { kind: "qualitative", name: "담화분석 (discourse analysis)", desc: "언어 사용의 사회적·권력적 작동 분석." },
  // ─── 혼합 ───
  { kind: "mixed", name: "양적→질적 설명적 순차", desc: "양적 결과를 질적으로 깊이 해석." },
  { kind: "mixed", name: "질적→양적 탐색적 순차", desc: "질적으로 발견된 개념을 양적 척도로 검증." },
  { kind: "mixed", name: "병렬 통합", desc: "양적·질적을 동시 수집 후 결과를 통합 해석." },
];

export function getAnalysisOptionsByKind(kind: MethodologyKind | "" | undefined): AnalysisMethodOption[] {
  if (!kind) return ANALYSIS_METHOD_LIBRARY;
  return ANALYSIS_METHOD_LIBRARY.filter((o) => o.kind === kind || o.kind === "all");
}
