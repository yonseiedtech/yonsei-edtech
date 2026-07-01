// 연구방법 추천 마법사 — 결정 트리 로직 (UI 비의존, 순수 함수)
//  · 연구 목적/상황에 답하면 적합한 연구방법(들)을 추천한다.
//  · ★한 연구에 여러 방법이 쓰일 수 있음을 반영 — 혼합설계는 구성 방법(질적+양적)과 분석 통계를 함께 제시.
//  · seedKey 는 scripts/seed-research-method*-2026-07-01.ts 가 각 방법에 부여한 안정 키.
//  · ⚠ 참고용 추천이며 최종 설계는 지도교수와 상의.

export type RFAnswers = Record<string, string>;

export interface RFOption {
  value: string;
  label: string;
  hint?: string;
}
export interface RFTermHelp {
  term: string;
  def: string;
}
export interface RFQuestion {
  id: string;
  when?: (a: RFAnswers) => boolean;
  title: string;
  help?: string;
  terms?: RFTermHelp[];
  options: RFOption[];
}

/** 함께 쓰이는(구성) 연구방법 */
export interface RFCombine {
  seedKey: string;
  role: string; // 예: "1단계 양적", "질적 자료"
}

export interface RFResult {
  /** 추천 연구방법 seedKey (research-method:{slug}) */
  primary: string;
  /** 한 연구에 함께 쓰이는 구성/대안 방법 */
  combines: RFCombine[];
  /** 분석 단계에서 쓸 통계방법 seedKey (statistical-method:{slug}) — 통계 마법사와 연계 */
  statMethods: string[];
  /** 통계(양적) 단계가 있는가 → '통계방법 찾기' 연결 노출 */
  hasQuantStrand: boolean;
  rationale: string;
}

const RM = (slug: string) => `research-method:${slug}`;
const SM = (slug: string) => `statistical-method:${slug}`;

export const RF_QUESTIONS: RFQuestion[] = [
  {
    id: "goal",
    title: "이 연구로 무엇을 하려고 하나요?",
    help: "연구 목적의 성격을 고르면 그에 맞는 갈래로 안내합니다. (한 연구에 여러 방법이 함께 쓰일 수도 있습니다.)",
    terms: [
      {
        term: "양적 vs 질적",
        def: "양적 = 수치로 측정·비교(설문·실험 등). 질적 = 경험·의미를 말·글로 깊이 이해(면담·관찰 등). 둘을 합치면 혼합.",
      },
    ],
    options: [
      { value: "explore", label: "현상·경험을 깊이 이해·탐색", hint: "아직 수치화 이전 — 왜/어떻게를 파고듦 (질적)" },
      { value: "verify", label: "변수 간 관계·차이·효과를 측정·검증", hint: "가설을 수치로 확인 (양적)" },
      { value: "both", label: "탐색과 검증을 한 연구에서 함께", hint: "질적+양적 결합 (혼합)" },
      { value: "develop", label: "측정도구·프로그램을 개발·타당화", hint: "척도·수업·산출물 개발" },
      { value: "synthesize", label: "이미 나온 여러 연구 결과를 종합", hint: "메타분석" },
    ],
  },
  // 질적
  {
    id: "qualFocus",
    when: (a) => a.goal === "explore",
    title: "질적 탐구의 초점은 무엇인가요?",
    options: [
      { value: "experience", label: "개인이 겪은 체험의 본질·의미", hint: "예: 원격수업의 고립 경험" },
      { value: "culture", label: "집단·공동체의 문화·상호작용", hint: "예: 학교의 기기 사용 문화" },
      { value: "story", label: "한 사람의 삶·이야기(생애)", hint: "예: 교사의 교직 서사" },
      { value: "process_theory", label: "과정을 설명할 이론을 자료에서 생성", hint: "근거이론" },
      { value: "one_case", label: "경계가 뚜렷한 특정 사례를 심층 분석", hint: "사례연구" },
      { value: "documents", label: "문서·개방형 응답의 주제 분석", hint: "질적 내용분석" },
      { value: "improve_field", label: "현장 문제를 참여적으로 개선", hint: "액션리서치" },
      { value: "consensus", label: "전문가 집단의 합의 도출", hint: "델파이" },
    ],
  },
  // 양적
  {
    id: "quantDesign",
    when: (a) => a.goal === "verify",
    title: "무엇을 검증하나요?",
    terms: [
      { term: "무선배치", def: "참가자를 실험/통제 집단에 '무작위로' 배정하는 것. 가능하면 실험연구, 어려우면(기존 학급 등) 준실험." },
    ],
    options: [
      { value: "exp_random", label: "처치(개입) 효과 — 무선배치 가능", hint: "실험연구" },
      { value: "exp_norandom", label: "처치 효과 — 기존 집단이라 무선배치 어려움", hint: "준실험연구" },
      { value: "relationship", label: "개입 없이 변수 간 관계·예측을 조사", hint: "설문조사연구" },
      { value: "latent", label: "잠재변인 간 구조·인과 모형 검증", hint: "구조방정식모형(SEM)" },
    ],
  },
  // 혼합
  {
    id: "mixedTiming",
    when: (a) => a.goal === "both",
    title: "양적과 질적을 어떻게 결합하나요?",
    options: [
      { value: "simultaneous", label: "동시에 모아 서로 비교·보완", hint: "수렴적 병렬" },
      { value: "quant_first", label: "먼저 수치로 확인 → 인터뷰로 설명", hint: "설명적 순차" },
      { value: "qual_first", label: "먼저 질적으로 탐색 → 수치로 검증", hint: "탐색적 순차" },
    ],
  },
  // 개발
  {
    id: "developTarget",
    when: (a) => a.goal === "develop",
    title: "무엇을 개발하나요?",
    options: [
      { value: "scale", label: "측정도구(척도·검사)", hint: "척도 개발 연구" },
      { value: "program", label: "교육 프로그램·수업", hint: "프로그램 개발·타당화" },
      { value: "iterative", label: "현장에서 반복 설계·개선하는 산출물/모형", hint: "설계기반연구(DBR)" },
    ],
  },
];

export function rfNextQuestion(a: RFAnswers): RFQuestion | null {
  for (const q of RF_QUESTIONS) {
    if (q.when && !q.when(a)) continue;
    if (a[q.id] == null) return q;
  }
  return null;
}
export function rfActiveQuestions(a: RFAnswers): RFQuestion[] {
  return RF_QUESTIONS.filter((q) => !q.when || q.when(a));
}

export function rfRecommend(a: RFAnswers): RFResult | null {
  if (rfNextQuestion(a) != null) return null;
  const base = { combines: [] as RFCombine[], statMethods: [] as string[], hasQuantStrand: false };

  if (a.goal === "synthesize") {
    return { ...base, primary: RM("meta-analysis"), rationale: "이미 수행된 여러 연구의 결과를 통계적으로 종합하므로 메타분석이 적합합니다." };
  }

  if (a.goal === "explore") {
    const map: Record<string, [string, string]> = {
      experience: ["phenomenology", "개인 체험의 본질·의미를 탐구하므로 현상학적 연구가 적합합니다."],
      culture: ["ethnography", "집단·공동체의 문화를 현장에서 이해하므로 문화기술지가 적합합니다."],
      story: ["narrative-inquiry", "한 사람의 삶·이야기를 시간·맥락 속에서 해석하므로 내러티브 연구가 적합합니다."],
      process_theory: ["grounded-theory", "자료에서 과정을 설명할 이론을 생성하므로 근거이론이 적합합니다."],
      one_case: ["case-study", "경계가 뚜렷한 특정 사례를 심층 분석하므로 사례연구가 적합합니다."],
      documents: ["qualitative-content-analysis", "문서·응답의 의미를 범주화하므로 질적 내용분석이 적합합니다."],
      improve_field: ["action-research", "현장 문제를 참여적으로 개선하므로 액션리서치가 적합합니다."],
      consensus: ["delphi", "전문가 집단의 합의를 반복 조사로 도출하므로 델파이 기법이 적합합니다."],
    };
    const [slug, rationale] = map[a.qualFocus] || ["case-study", ""];
    return { ...base, primary: RM(slug), rationale };
  }

  if (a.goal === "verify") {
    if (a.quantDesign === "exp_random")
      return { ...base, primary: RM("experimental"), hasQuantStrand: true, statMethods: [SM("t-test"), SM("anova-oneway"), SM("ancova")], rationale: "무선배치로 처치 효과를 검증하므로 실험연구가 적합합니다. 집단 평균 비교엔 t검정·ANOVA(사전점수 보정 시 ANCOVA)를 씁니다." };
    if (a.quantDesign === "exp_norandom")
      return { ...base, primary: RM("quasi-experimental"), hasQuantStrand: true, statMethods: [SM("ancova"), SM("anova-oneway")], rationale: "무선배치가 어려운 기존 집단으로 처치 효과를 보므로 준실험연구가 적합합니다. 사전 차이 보정엔 ANCOVA가 흔히 쓰입니다." };
    if (a.quantDesign === "relationship")
      return { ...base, primary: RM("survey"), hasQuantStrand: true, statMethods: [SM("correlation"), SM("multiple-regression"), SM("t-test"), SM("chi-square")], rationale: "개입 없이 변수 간 관계·예측을 조사하므로 설문조사연구가 적합합니다. 분석엔 상관·회귀·집단비교 등을 씁니다." };
    return { ...base, primary: RM("sem"), hasQuantStrand: true, statMethods: [SM("sem"), SM("cfa")], rationale: "잠재변인 간 구조·인과 모형을 검증하므로 구조방정식모형(SEM)이 적합합니다." };
  }

  if (a.goal === "both") {
    if (a.mixedTiming === "simultaneous")
      return { primary: RM("convergent-parallel"), hasQuantStrand: true, combines: [{ seedKey: RM("survey"), role: "양적 자료" }, { seedKey: RM("qualitative-content-analysis"), role: "질적 자료" }], statMethods: [SM("t-test"), SM("correlation")], rationale: "양적·질적을 동시에 모아 비교·보완하므로 수렴적 병렬 설계가 적합합니다. 두 자료를 각각 분석한 뒤 통합 해석합니다." };
    if (a.mixedTiming === "quant_first")
      return { primary: RM("explanatory-sequential"), hasQuantStrand: true, combines: [{ seedKey: RM("survey"), role: "1단계 양적" }, { seedKey: RM("case-study"), role: "2단계 질적 설명" }], statMethods: [SM("anova-oneway"), SM("multiple-regression")], rationale: "먼저 수치로 확인하고 그 결과를 질적으로 설명하므로 설명적 순차 설계가 적합합니다." };
    return { primary: RM("exploratory-sequential"), hasQuantStrand: true, combines: [{ seedKey: RM("phenomenology"), role: "1단계 질적 탐색" }, { seedKey: RM("scale-development"), role: "2단계 양적 검증" }], statMethods: [SM("efa"), SM("cfa")], rationale: "먼저 질적으로 탐색해 요소를 찾고 수치로 검증하므로 탐색적 순차 설계가 적합합니다. 척도 개발과 잘 연결됩니다." };
  }

  // develop
  if (a.developTarget === "scale")
    return { primary: RM("scale-development"), hasQuantStrand: true, combines: [{ seedKey: RM("exploratory-sequential"), role: "권장 설계" }], statMethods: [SM("efa"), SM("cfa"), SM("correlation")], rationale: "측정도구(척도)를 개발·타당화하므로 척도 개발 연구가 적합합니다. 요인분석(EFA/CFA)으로 구조를 확인합니다." };
  if (a.developTarget === "program")
    return { ...base, primary: RM("program-development"), combines: [{ seedKey: RM("design-based-research"), role: "관련 접근" }], rationale: "교육 프로그램을 개발·타당화하므로 프로그램 개발과 타당화가 적합합니다." };
  return { ...base, primary: RM("design-based-research"), combines: [{ seedKey: RM("action-research"), role: "관련 접근" }], rationale: "현장에서 반복적으로 설계·개선하므로 설계기반연구(DBR)가 적합합니다." };
}
