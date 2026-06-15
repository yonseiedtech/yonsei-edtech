// 진단평가 문제은행 시드 (published: true 로 적재 — 검수 완료된 객관적 문항만 포함)
//
// 대학원생이 아카이브 개념(통계방법·연구방법·교육공학 핵심개념)을 얼마나 아는지
// 진단하는 문제은행. 8유형 혼합:
//  - mcq      : 4지선다 객관식 (options·answerIndex)
//  - ordering : 절차 순서 정렬 (items 를 정답 순서로 저장, 런타임에 셔플해 제시)
//  - term     : 단어 맞추기 (prompt 정의 → answer 개념명, acceptedAnswers 동의어)
//  - ox       : 참/거짓 (statement·answerBool)
//  - compare  : 유사개념 구분 (options·answerIndex)
//  - matching : 짝짓기 (leftItems·rightItems·correctMap)
//  - scenario : 상황 적용 — 연구설계·통계 실전 적용(조건제시·논문서술·연구문제·절차추론) (options·answerIndex)
//  - passage  : 지문 분석 — 가상 연구 서술을 읽고 방법·기법 식별 또는 한계·누락요소 식별 (passage·options·answerIndex)
//  - diagram  : 연구모형 도형 — 인라인 SVG 연구모형(매개·조절·경로·집단설계)을 보고 모형 유형·적합 분석 식별 (svg·options·answerIndex)
// 외부 LLM 없이 검증된 정의·표준 절차로 대량 생성하고, 런타임에 영역별 랜덤 출제한다.
// scenario·passage 는 졸업생 학위논문 전형 기반 — relatedMethodName/relatedStatMethodName 으로
// 추후 "이 방법을 쓴 졸업생 논문 보기"(/alumni/thesis) 연결용 메타를 남긴다.
//
// ⚠️ 저작권·정확성 원칙 ⚠️
//  - 학자 원설명/척도 문항을 그대로 복제하지 않는다. 객관적 서술로 변형.
//  - 검증 가능한 명백한 정의·구성요소·표준 절차만 출제. 애매하면 제외(보수적).
//  - 출처: src/lib/statistical-methods-seed.ts (통계), src/lib/research-methods-seed.ts (연구방법 절차),
//    src/lib/archive-seed.ts SEED_CONCEPTS (개념). 모두 영문 정전 교과서 기반 정의 활용.
//  - ordering 의 단계 순서는 research-methods-seed.ts 의 procedures(검수된 표준 절차)와 일치.
//
// 개념 문항은 conceptSeedKey 로 아카이브 개념(archive_concepts.seedKey)과 연결한다.
// 런타임에 seedKey → 실제 문서 id 를 매핑해 약점 개념을 /archive/concept/[id] 로 링크.

import { diagnosticQuestionsApi } from "./bkend";
import type {
  CognitiveLevel,
  DiagnosticArea,
  DiagnosticQuestion,
  DiagnosticQuestionType,
} from "@/types";
import { questionType } from "@/types";

export interface SeedDiagnosticQuestion {
  /** 시드 멱등성 키. `dx:{area}:{n}` 형식 — 재시드 시 동일 문항 인식. */
  seedKey: string;
  /** 문항 유형 — 미지정 시 "mcq" (하위호환) */
  type?: DiagnosticQuestionType;
  area: DiagnosticArea;
  /** Bloom 인지수준 태깅 (선택) — 리포트 인지수준별 정답률 집계용. */
  cognitiveLevel?: CognitiveLevel;
  /** archive_concepts.seedKey (개념 영역 문항만). 런타임에 실제 conceptId 로 변환. */
  conceptSeedKey?: string;
  /** mcq·ordering·compare·scenario·passage 의 문제(질문). term 은 prompt, ox 는 statement 사용. */
  question?: string;
  /** [mcq·compare·scenario·passage] 보기 */
  options?: string[];
  /** [mcq·compare·scenario·passage] 정답 인덱스 */
  answerIndex?: number;
  /** [passage] 지문 — 짧은 가상 연구 서술(초록/방법 문단). 실제 논문 복제 금지. */
  passage?: string;
  /** [diagram] 인라인 SVG 연구모형 마크업(코드로 그린 박스+화살표). 외부 이미지 금지·다크모드 대응 currentColor. */
  svg?: string;
  /** [ordering] 정답 순서로 나열한 단계 목록 */
  items?: string[];
  /** [term] 개념 정의 서술 (문제 본문) */
  prompt?: string;
  /** [term] 정답 개념명 */
  answer?: string;
  /** [term] 허용 동의어·영문 표기 */
  acceptedAnswers?: string[];
  /** [ox] 참/거짓 판단 진술 */
  statement?: string;
  /** [ox] 진술의 참/거짓 정답 */
  answerBool?: boolean;
  /** [matching] 왼쪽 항목(개념·이론) */
  leftItems?: string[];
  /** [matching] 오른쪽 항목(학자·모델·기법) */
  rightItems?: string[];
  /** [matching] 정답 매핑 — 왼쪽 index → 오른쪽 index */
  correctMap?: number[];
  /** [scenario·passage] 졸업생 논문 연계 메타 — 연구방법 이름(archive_research_methods.name 대응). */
  relatedMethodName?: string;
  /** [scenario·passage] 졸업생 논문 연계 메타 — 통계기법 이름(선택). */
  relatedStatMethodName?: string;
  explanation?: string;
}

export const SEED_DIAGNOSTIC_QUESTIONS: SeedDiagnosticQuestion[] = [
  // ─────────────────────────────────────────────────────────────
  // 통계방법 (statistics) — 10문항. 출처: statistical-methods-seed.ts
  // ─────────────────────────────────────────────────────────────
  {
    seedKey: "dx:statistics:1",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "세 개 이상 집단의 평균이 서로 차이가 있는지 한 번에 검정하는 데 가장 적절한 통계 기법은?",
    options: ["독립표본 t-검정", "일원분산분석(ANOVA)", "단순회귀분석", "카이제곱 검정"],
    answerIndex: 1,
    explanation:
      "일원분산분석(ANOVA)은 하나의 범주형 독립변수에 따른 연속형 종속변수의 평균이 집단 간에 차이가 있는지를 검정하는 기법으로, t-검정의 다집단 확장판이다.",
  },
  {
    seedKey: "dx:statistics:2",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "공변량(예: 사전점수)의 영향을 통제한 뒤 집단 간 종속변수 평균 차이를 검정하는 기법은?",
    options: [
      "ANCOVA(공분산분석)",
      "탐색적 요인분석(EFA)",
      "로지스틱회귀분석",
      "대응표본 t-검정",
    ],
    answerIndex: 0,
    explanation:
      "ANCOVA는 공변량을 통제한 상태에서 범주형 독립변수에 따른 집단 간 평균 차이를 검정하는 분산분석의 확장 기법이다.",
  },
  {
    seedKey: "dx:statistics:3",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "statistics",
    question: "종속변수가 '합격/불합격'처럼 이분형일 때 그 발생 확률을 예측하는 회귀 기법은?",
    options: ["다중회귀분석", "로지스틱회귀분석", "정준상관분석", "MANOVA"],
    answerIndex: 1,
    explanation:
      "로지스틱회귀분석은 이분형(또는 다항) 종속변수의 발생 확률을 독립변수들로 예측하는 일반화선형모형 기반 기법이다. 다중회귀는 연속형 종속변수에 사용한다.",
  },
  {
    seedKey: "dx:statistics:4",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "여러 문항(관측변수) 사이의 상관 구조에서 숨은 잠재요인을 '자료 기반으로 탐색'하여 도구의 차원성을 확인하는 분석은?",
    options: [
      "확인적 요인분석(CFA)",
      "탐색적 요인분석(EFA)",
      "경로분석",
      "군집분석",
    ],
    answerIndex: 1,
    explanation:
      "EFA는 사전에 요인구조를 가정하지 않고 관측변수의 상관에서 잠재요인을 탐색한다. 반면 CFA는 사전에 가정된 요인구조의 적합도를 검증한다.",
  },
  {
    seedKey: "dx:statistics:5",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "'이 문항들이 사전에 가정한 요인구조에 부합하는가'를 모형 적합도 지수로 검증하는 측정모형 분석은?",
    options: [
      "탐색적 요인분석(EFA)",
      "확인적 요인분석(CFA)",
      "다중회귀분석",
      "일원분산분석(ANOVA)",
    ],
    answerIndex: 1,
    explanation:
      "CFA는 사전에 가정된 요인구조가 관측 자료에 적합한지 적합도 지수(CFI·TLI·RMSEA 등)로 검증하는 측정모형 분석이다.",
  },
  {
    seedKey: "dx:statistics:6",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "잠재변인을 포함한 다중 인과 관계와 측정모형을 동시에 추정·평가하는 다변량 분석 기법은?",
    options: [
      "구조방정식모형(SEM)",
      "독립표본 t-검정",
      "이원분산분석",
      "상관분석",
    ],
    answerIndex: 0,
    explanation:
      "SEM은 잠재변인 간 인과 경로와 측정모형을 동시에 추정하고 모형-자료 적합도를 평가하는 다변량 통계 기법이다.",
  },
  {
    seedKey: "dx:statistics:7",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "두 개 이상의 연속형 종속변수에 대한 집단 간 평균 차이를 동시에 검정하는 기법은?",
    options: [
      "일원분산분석(ANOVA)",
      "다변량분산분석(MANOVA)",
      "단순회귀분석",
      "대응표본 t-검정",
    ],
    answerIndex: 1,
    explanation:
      "MANOVA는 두 개 이상의 연속형 종속변수를 동시에 다루어 집단 간 평균 차이를 검정하는 다변량 분산분석이다. ANOVA는 종속변수가 1개일 때 사용한다.",
  },
  {
    seedKey: "dx:statistics:8",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "두 집단 간 평균 차이를 검정하는 가장 기본적인 통계 기법으로, 독립표본과 대응표본 유형으로 구분되는 것은?",
    options: ["일원분산분석(ANOVA)", "t-검정", "카이제곱 검정", "다중회귀분석"],
    answerIndex: 1,
    explanation:
      "t-검정(t-test)은 두 집단(또는 두 조건)의 평균 차이를 검정하는 기본 기법으로, 서로 다른 집단을 비교하는 독립표본과 같은 대상을 반복 측정하는 대응표본으로 구분된다.",
  },
  {
    seedKey: "dx:statistics:9",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "여러 개의 독립변수로 하나의 연속형 종속변수를 예측하고 각 변수의 상대적 설명력을 추정하는 통계 기법은?",
    options: ["다중회귀분석", "로지스틱회귀분석", "탐색적 요인분석(EFA)", "t-검정"],
    answerIndex: 0,
    explanation:
      "다중회귀분석은 두 개 이상의 독립변수로 연속형 종속변수를 예측·설명하며, 표준화 계수로 각 변수의 상대적 기여도를 비교한다. 종속변수가 이분형이면 로지스틱회귀를 쓴다.",
  },
  {
    seedKey: "dx:statistics:10",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "두 개 이상의 연속형 종속변수를 동시에 다루면서 공변량의 영향까지 통제하는 분산분석 기법은?",
    options: [
      "MANOVA(다변량분산분석)",
      "MANCOVA(다변량공분산분석)",
      "ANCOVA(공분산분석)",
      "구조방정식모형(SEM)",
    ],
    answerIndex: 1,
    explanation:
      "MANCOVA는 여러 종속변수를 동시에 분석하는 MANOVA에 공변량 통제를 더한 기법이다. ANCOVA는 종속변수가 1개, MANOVA는 공변량 통제가 없다.",
  },

  // ─────────────────────────────────────────────────────────────
  // 연구방법 (method) — 10문항. 출처: research-methods-seed.ts
  // ─────────────────────────────────────────────────────────────
  {
    seedKey: "dx:method:1",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "독립변인을 인위적으로 조작하고 참가자를 무선할당하여 처치의 인과 효과를 검증하는 연구 방법은?",
    options: ["설문조사연구", "실험연구", "사례연구", "문화기술지"],
    answerIndex: 1,
    explanation:
      "실험연구는 독립변인 조작과 무선할당을 통해 가외변인을 통제하고 처치 효과를 인과적으로 검증한다. 무선할당이 핵심 특징이다.",
  },
  {
    seedKey: "dx:method:2",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "교육 현장 특성상 무선할당이 어려워 이미 편성된 학급 등 기존 집단을 활용해 처치 효과를 검증하는 연구 방법은?",
    options: ["진실험연구", "준실험연구", "메타분석", "근거이론"],
    answerIndex: 1,
    explanation:
      "준실험연구는 무선할당 없이 기존(비동등) 집단을 처치·비교집단으로 활용하며, 사전점수를 공변인으로 통제하는 방식이 흔하다.",
  },
  {
    seedKey: "dx:method:3",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "동일 주제를 다룬 다수 선행 연구의 효과크기를 통계적으로 종합·통합하는 연구 방법은?",
    options: ["메타분석", "델파이조사", "현상학", "내러티브 탐구"],
    answerIndex: 0,
    explanation:
      "메타분석은 여러 선행 연구의 효과크기를 표준화해 통합하고 전체 효과와 조절변인을 분석하는 양적 종합 방법이다.",
  },
  {
    seedKey: "dx:method:4",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "자료에서 출발해 지속적 비교와 개방·축·선택 코딩을 거쳐 새로운 실체이론을 생성하는 질적 연구 방법은?",
    options: ["사례연구", "근거이론", "실험연구", "설문조사연구"],
    answerIndex: 1,
    explanation:
      "근거이론(Grounded Theory)은 자료에 근거해 개방코딩→축코딩→선택코딩과 지속적 비교를 통해 이론을 생성하는 질적 방법이다.",
  },
  {
    seedKey: "dx:method:5",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "교사 등 실천가가 자신의 실천 맥락에서 '계획-실행-관찰-성찰'의 순환을 통해 개선을 도모하는 참여적 연구 방법은?",
    options: ["액션리서치(실행연구)", "문화기술지", "메타분석", "구조방정식모형"],
    answerIndex: 0,
    explanation:
      "액션리서치는 연구자 본인이 실행자가 되어 계획·실행·관찰·성찰의 순환을 반복하며 자신의 실천을 개선하는 방법이다.",
  },
  {
    seedKey: "dx:method:6",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "어떤 현상을 직접 체험한 사람들의 진술에서 그 체험에 공통적으로 내재한 '본질적 의미 구조'를 드러내는 질적 연구 방법은?",
    options: ["현상학", "준실험연구", "사례연구", "설문조사연구"],
    answerIndex: 0,
    explanation:
      "현상학은 체험자의 심층 면담 자료에서 의미단위를 분석해 경험의 본질적 구조를 드러내는 질적 연구 방법이다.",
  },
  {
    seedKey: "dx:method:7",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "method",
    question: "다음 중 일반적으로 '질적 연구 방법'으로 분류되는 것은?",
    options: ["설문조사연구", "사례연구", "다중회귀분석", "실험연구"],
    answerIndex: 1,
    explanation:
      "사례연구는 소수 사례를 다양한 자료원으로 심층·맥락적으로 분석하는 질적 연구 방법이다. 설문조사·실험연구는 양적, 회귀분석은 통계기법이다.",
  },
  {
    seedKey: "dx:method:8",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "표집된 대상에게 구조화된 설문 도구로 자료를 수집해 변인 간 관계·분포·차이를 통계적으로 분석하는 양적 연구 방법은?",
    options: ["실험연구", "설문조사연구", "근거이론", "현상학"],
    answerIndex: 1,
    explanation:
      "설문조사연구는 구조화된 설문으로 표본의 응답을 수집해 변인 간 관계·분포·차이를 통계 분석하는 대표적 양적 연구 방법이다.",
  },
  {
    seedKey: "dx:method:9",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "특정 집단의 문화(행동·신념·상호작용)를 연구자가 장기간 현장에 참여관찰하며 내부자 관점에서 총체적으로 기술하는 질적 연구 방법은?",
    options: ["사례연구", "문화기술지", "메타분석", "설문조사연구"],
    answerIndex: 1,
    explanation:
      "문화기술지(ethnography)는 연구자가 현장에 장기간 참여관찰하며 집단이 공유하는 문화를 내부자(emic) 관점에서 두껍게 기술하는 질적 방법이다.",
  },
  {
    seedKey: "dx:method:10",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "개인이 경험을 이야기 형식으로 풀어낸 내러티브를 시간 흐름·맥락에 따라 재구성하여 그 의미를 해석하는 질적 연구 방법은?",
    options: ["내러티브 탐구", "실험연구", "준실험연구", "메타분석"],
    answerIndex: 0,
    explanation:
      "내러티브 탐구는 개인의 경험 이야기를 시간성·사회적 상호작용·장소의 3차원으로 분석하고 줄거리 있는 서사로 재구성해 의미를 해석하는 질적 방법이다.",
  },

  // ─────────────────────────────────────────────────────────────
  // 교육공학 핵심개념 (concept) — 13문항. 출처: archive-seed.ts SEED_CONCEPTS
  // conceptSeedKey 로 약점 개념 링크.
  // ─────────────────────────────────────────────────────────────
  {
    seedKey: "dx:concept:1",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:self-efficacy",
    question:
      "'특정 과제를 수행하는 데 필요한 행동을 조직하고 실행할 수 있다는 자신의 능력에 대한 신념'을 가리키는 개념은?",
    options: ["자기효능감", "메타인지", "인지부하", "사회적 실재감"],
    answerIndex: 0,
    explanation:
      "자기효능감(self-efficacy)은 Bandura의 사회인지이론 핵심 구인으로, 특정 과제 수행 능력에 대한 신념을 의미한다.",
  },
  {
    seedKey: "dx:concept:2",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:cognitive-load",
    question:
      "학습 과제 수행 중 작업기억에 부과되는 정신적 처리 요구량을 가리키며, 내재적·외재적·본유적 부하로 구분되는 개념은?",
    options: ["학습몰입", "인지부하", "학업성취도", "디지털 리터러시"],
    answerIndex: 1,
    explanation:
      "인지부하(cognitive load)는 Sweller의 인지부하이론에서 비롯되며, 내재적·외재적·본유적 부하로 구분된다.",
  },
  {
    seedKey: "dx:concept:3",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:metacognition",
    question: "'인지에 대한 인지'로, 자신의 학습 과정을 점검·계획·조절하는 능력을 뜻하는 개념은?",
    options: ["메타인지", "테크놀로지 수용", "협력학습", "게이미피케이션"],
    answerIndex: 0,
    explanation:
      "메타인지(metacognition)는 Flavell이 제안한 '인지에 대한 인지'로, 메타인지 지식과 메타인지 조절로 구분된다.",
  },
  {
    seedKey: "dx:concept:4",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:tpack",
    question:
      "내용지식(CK)·교수지식(PK)·테크놀로지지식(TK)의 교집합에서 형성되는 교사의 통합 지식 프레임워크는?",
    options: ["SAMR 모델", "ADDIE 모델", "TPACK", "ARCS 모형"],
    answerIndex: 2,
    explanation:
      "TPACK은 Mishra & Koehler가 Shulman의 PCK를 확장한 것으로, CK·PK·TK의 통합 지식을 가리킨다.",
  },
  {
    seedKey: "dx:concept:5",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:addie-model",
    question:
      "교수설계 절차 모델 중 '분석-설계-개발-실행-평가'의 5단계 순환으로 구성된 가장 보편적인 모델은?",
    options: ["SAMR 모델", "ADDIE 모델", "TPACK", "4C/ID 모델"],
    answerIndex: 1,
    explanation:
      "ADDIE는 Analysis-Design-Development-Implementation-Evaluation의 5단계로 구성된 대표적 교수설계 절차 모델이다.",
  },
  {
    seedKey: "dx:concept:6",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:samr-model",
    question:
      "테크놀로지 통합 수준을 '대체(S)-증강(A)-변형(M)-재정의(R)'의 4단계로 진단하는 프레임워크는?",
    options: ["ADDIE 모델", "TPACK", "SAMR 모델", "ARCS 모형"],
    answerIndex: 2,
    explanation:
      "SAMR(Substitution-Augmentation-Modification-Redefinition)은 디지털 도구 활용의 깊이를 4단계로 진단하는 프레임워크이다.",
  },
  {
    seedKey: "dx:concept:7",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:flipped-learning",
    question:
      "개념 학습은 사전 영상·자료로 가정에서, 적용·토론·문제해결은 교실에서 진행하도록 순서를 뒤집은 혼합학습 모델은?",
    options: ["플립러닝", "마이크로러닝", "적응학습", "게이미피케이션"],
    answerIndex: 0,
    explanation:
      "플립러닝(거꾸로 학습)은 전통적 교실 수업과 가정 학습의 순서를 뒤집어, 교실에서 적용·상호작용에 집중하는 혼합학습 모델이다.",
  },
  {
    seedKey: "dx:concept:8",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:computational-thinking",
    question:
      "문제를 컴퓨터가 처리할 수 있는 형태로 표현·해결하는 사고로, 분해·패턴 인식·추상화·알고리즘을 핵심 요소로 하는 개념은?",
    options: ["디지털 리터러시", "컴퓨팅 사고력", "학습분석", "마이크로러닝"],
    answerIndex: 1,
    explanation:
      "컴퓨팅 사고력(Computational Thinking)은 Wing이 제시한 개념으로, 분해·패턴 인식·추상화·알고리즘의 4가지 핵심 요소를 포함한다.",
  },
  {
    seedKey: "dx:concept:9",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:learning-analytics",
    question:
      "학습자의 행동·맥락·산출 데이터를 수집·분석·보고하여 학습과 학습환경을 이해·최적화하는 교육공학 분야는?",
    options: ["적응학습", "학습분석", "디지털 리터러시", "마이크로러닝"],
    answerIndex: 1,
    explanation:
      "학습분석(Learning Analytics)은 학습자 데이터를 수집·측정·분석·보고해 학습과 학습환경을 최적화하는 분야로, LMS 로그 기반 위험학습자 조기 진단이 대표 활용이다.",
  },
  {
    seedKey: "dx:concept:10",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:ctml",
    question:
      "시각·청각 이중 채널, 제한된 작업기억, 능동적 처리를 가정하고 12가지 멀티미디어 설계 원리를 제시한 Mayer의 이론은?",
    options: [
      "인지부하이론",
      "멀티미디어 학습 인지이론(CTML)",
      "자기결정성이론",
      "상황학습이론",
    ],
    answerIndex: 1,
    explanation:
      "멀티미디어 학습 인지이론(CTML)은 Mayer가 이중 채널·작업기억 한계·능동적 처리 가정 위에 정합성·신호·중복 등 12개 설계 원리를 도출한 이론이다.",
  },
  {
    seedKey: "dx:concept:11",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:social-presence",
    question:
      "온라인 학습에서 학습자가 다른 참여자를 '실제 사람'으로 지각하는 정도로, Garrison의 탐구공동체(CoI) 모델 3요소 중 하나는?",
    options: ["사회적 실재감", "자기효능감", "인지부하", "메타인지"],
    answerIndex: 0,
    explanation:
      "사회적 실재감(social presence)은 Garrison·Anderson·Archer의 탐구공동체(CoI) 모델에서 교수적 실재감·인지적 실재감과 함께 작동하는 핵심 요소다.",
  },
  {
    seedKey: "dx:concept:12",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:microlearning",
    question:
      "5~15분 분량의 짧은 단위 콘텐츠로 단일 학습 목표 하나를 즉시 학습·적용하는 모바일 친화적 학습 형식은?",
    options: ["플립러닝", "마이크로러닝", "적응학습", "게이미피케이션"],
    answerIndex: 1,
    explanation:
      "마이크로러닝(microlearning)은 5~15분의 짧은 단위로 단일 목표를 즉시 학습·적용하는 형식으로, 모바일·just-in-time 학습 흐름과 결합된다.",
  },
  {
    seedKey: "dx:concept:13",
    type: "mcq",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:adaptive-learning",
    question:
      "학습자의 사전지식·수행·선호 데이터에 기반해 콘텐츠·난이도·학습 경로를 실시간으로 개인화하는 학습 시스템은?",
    options: ["적응학습", "협력학습", "플립러닝", "게이미피케이션"],
    answerIndex: 0,
    explanation:
      "적응학습(adaptive learning)은 학습자 데이터에 기반해 콘텐츠·난이도·경로·피드백을 실시간 개인화하며, 지능형 튜터링 시스템(ITS)이 기술 기반이다.",
  },

  // ═════════════════════════════════════════════════════════════
  // 절차 순서 정렬 (ordering) — items 를 정답 순서로 저장. 출처: research-methods-seed.ts procedures
  // ═════════════════════════════════════════════════════════════
  // ── 통계방법 ordering (3) ──
  {
    seedKey: "dx:statistics:ord:1",
    type: "ordering",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "구조방정식모형(SEM) 분석의 일반적 절차를 순서대로 배열하세요.",
    items: [
      "이론모형 설정",
      "측정모형 검증(CFA)",
      "구조모형 추정",
      "적합도 평가",
      "매개효과 검증·해석",
    ],
    explanation:
      "SEM은 이론에 근거한 모형 설정 → 측정모형(CFA)으로 잠재변인 측정 검증 → 구조모형의 경로계수 추정 → 적합도 지수 평가 → 매개효과 검증·해석 순으로 진행한다.",
  },
  {
    seedKey: "dx:statistics:ord:2",
    type: "ordering",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "척도(측정도구)의 요인구조를 통계적으로 검증하는 일반적 순서를 배열하세요.",
    items: [
      "문항 응답 자료 수집",
      "신뢰도(Cronbach α) 확인",
      "탐색적 요인분석(EFA)",
      "확인적 요인분석(CFA)",
      "준거타당도 검증",
    ],
    explanation:
      "자료 수집 후 내적 일관성(신뢰도)을 확인하고, 자료 기반으로 요인을 탐색(EFA)한 뒤 가정한 요인구조를 검증(CFA)하고, 외부 준거와의 상관으로 준거타당도를 보강하는 순서가 일반적이다.",
  },
  {
    seedKey: "dx:statistics:ord:3",
    type: "ordering",
    cognitiveLevel: "understand",
    area: "statistics",
    question:
      "양적 가설 검정 연구의 통계 분석 진행 순서를 배열하세요.",
    items: [
      "연구가설·영가설 설정",
      "측정·자료수집",
      "기술통계 확인",
      "통계 가정 점검",
      "추론통계로 가설 검정",
      "효과크기·결과 해석",
    ],
    explanation:
      "가설 설정 → 자료수집 → 기술통계로 분포 파악 → 정규성·등분산성 등 가정 점검 → 추론통계로 가설 검정 → 효과크기와 함께 결과를 해석하는 흐름이 표준이다.",
  },

  // ── 연구방법 ordering (4) — research-methods-seed.ts procedures 와 일치 ──
  {
    seedKey: "dx:method:ord:1",
    type: "ordering",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "측정도구(척도) 개발과 타당화 연구의 절차를 순서대로 배열하세요.",
    items: [
      "구성개념 정의",
      "문항 개발",
      "내용타당도 검증",
      "예비조사",
      "본조사·신뢰도",
      "구인타당도 검증",
      "준거타당도·확정",
    ],
    explanation:
      "측정하려는 개념을 정의하고 문항을 개발한 뒤, 전문가 내용타당도 → 예비조사로 문항 정련 → 본조사 신뢰도 → 요인분석 구인타당도 → 준거타당도 검증·최종 확정 순으로 진행한다.",
  },
  {
    seedKey: "dx:method:ord:2",
    type: "ordering",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "실험연구의 일반적 수행 절차를 순서대로 배열하세요.",
    items: [
      "가설 설정",
      "변인 정의·도구 확정",
      "실험설계 선택",
      "무선할당",
      "처치·사후측정",
      "통계분석·해석",
    ],
    explanation:
      "이론에 근거한 가설 설정 → 변인 조작적 정의 → 내적타당도를 확보할 설계 선택 → 참가자 무선할당 → 처치 실행 후 측정 → 통계분석으로 효과 검증 순으로 진행한다.",
  },
  {
    seedKey: "dx:method:ord:3",
    type: "ordering",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "근거이론(Grounded Theory)의 코딩·이론 생성 절차를 순서대로 배열하세요.",
    items: [
      "이론적 표집",
      "개방코딩",
      "축코딩",
      "선택코딩",
      "이론 생성(포화)",
    ],
    explanation:
      "근거이론은 이론 생성을 향한 이론적 표집 → 자료를 분해하는 개방코딩 → 범주 간 관계를 잇는 축코딩 → 핵심범주 중심의 선택코딩 → 이론적 포화에서 실체이론 생성 순으로 진행한다.",
  },
  {
    seedKey: "dx:method:ord:4",
    type: "ordering",
    cognitiveLevel: "understand",
    area: "method",
    question:
      "액션리서치(실행연구)의 한 순환(cycle) 절차를 순서대로 배열하세요.",
    items: ["문제 진단", "실행 계획", "실행", "관찰·자료수집", "성찰"],
    explanation:
      "액션리서치는 실천 맥락의 문제 진단 → 해결 전략 계획 → 현장 실행 → 변화 관찰·자료수집 → 비판적 성찰의 순환을 반복하며 실천을 개선한다.",
  },

  // ── 교육공학 핵심개념 ordering (3) — 표준 모델 단계 ──
  {
    seedKey: "dx:concept:ord:1",
    type: "ordering",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:addie-model",
    question:
      "교수설계 ADDIE 모델의 5단계를 순서대로 배열하세요.",
    items: ["분석(Analysis)", "설계(Design)", "개발(Development)", "실행(Implementation)", "평가(Evaluation)"],
    explanation:
      "ADDIE는 Analysis(분석)→Design(설계)→Development(개발)→Implementation(실행)→Evaluation(평가)의 5단계로 구성되며, 각 단계 산출물이 다음 단계 입력이 된다.",
  },
  {
    seedKey: "dx:concept:ord:2",
    type: "ordering",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:samr-model",
    question:
      "테크놀로지 통합 수준을 진단하는 SAMR 모델의 4단계를 낮은 수준부터 순서대로 배열하세요.",
    items: ["대체(Substitution)", "증강(Augmentation)", "변형(Modification)", "재정의(Redefinition)"],
    explanation:
      "SAMR은 대체(S)→증강(A)→변형(M)→재정의(R) 순으로, 위 단계로 갈수록 테크놀로지가 수업의 본질을 변화시키는 정도가 커진다.",
  },
  {
    seedKey: "dx:concept:ord:3",
    type: "ordering",
    cognitiveLevel: "understand",
    area: "concept",
    conceptSeedKey: "concept:self-regulated-learning",
    question:
      "Zimmerman의 자기조절학습 순환 모형 3단계를 순서대로 배열하세요.",
    items: ["사전계획(Forethought)", "수행(Performance)", "자기성찰(Self-reflection)"],
    explanation:
      "Zimmerman의 자기조절학습은 사전계획(forethought)→수행(performance)→자기성찰(self-reflection)의 3단계가 순환하는 모형이다.",
  },

  // ═════════════════════════════════════════════════════════════
  // 단어 맞추기 (term) — prompt(정의) → answer(개념명). acceptedAnswers 로 동의어·영문 허용.
  // 출처: archive-seed.ts SEED_CONCEPTS / statistical·research-methods-seed.ts 정의
  // ═════════════════════════════════════════════════════════════
  // ── 통계방법 term (5) ──
  {
    seedKey: "dx:statistics:term:1",
    type: "term",
    cognitiveLevel: "remember",
    area: "statistics",
    prompt:
      "두 집단의 평균 차이(독립표본) 또는 동일 표본의 두 시점 평균 차이(대응표본)를 검정하는 가장 기본적인 모수 통계 기법은? (한글 또는 영문)",
    answer: "t-검정",
    acceptedAnswers: ["t검정", "t-test", "t test", "티검정", "티-검정"],
    explanation:
      "t-검정(t-test)은 두 집단 또는 두 시점의 평균 차이를 검정하는 기본 기법이다.",
  },
  {
    seedKey: "dx:statistics:term:2",
    type: "term",
    cognitiveLevel: "remember",
    area: "statistics",
    prompt:
      "한 개의 범주형 독립변수에 따른 연속형 종속변수의 평균이 세 집단 이상에서 차이가 있는지 검정하는 분산분석 기법의 이름은? (약어 또는 한글)",
    answer: "ANOVA",
    acceptedAnswers: ["분산분석", "일원분산분석", "아노바", "일원배치분산분석", "oneway anova"],
    explanation:
      "ANOVA(분산분석)는 범주형 독립변수에 따른 집단 간 평균 차이를 검정하며, t-검정의 다집단 확장판이다.",
  },
  {
    seedKey: "dx:statistics:term:3",
    type: "term",
    cognitiveLevel: "remember",
    area: "statistics",
    prompt:
      "관측변수들의 상관 구조에서 잠재요인을 자료 기반으로 탐색하여 도구의 차원성을 확인하는 분석 기법은? (한글 또는 영문 약어)",
    answer: "탐색적 요인분석",
    acceptedAnswers: ["EFA", "탐색적요인분석", "exploratory factor analysis"],
    explanation:
      "탐색적 요인분석(EFA)은 사전에 요인구조를 가정하지 않고 관측변수의 상관에서 잠재요인을 탐색한다.",
  },
  {
    seedKey: "dx:statistics:term:4",
    type: "term",
    cognitiveLevel: "remember",
    area: "statistics",
    prompt:
      "잠재변인을 포함한 다중 인과 관계와 측정모형을 동시에 추정하고 모형 적합도를 평가하는 다변량 통계 기법은? (한글 또는 영문 약어)",
    answer: "구조방정식모형",
    acceptedAnswers: ["SEM", "구조방정식", "structural equation modeling", "structural equation model"],
    explanation:
      "구조방정식모형(SEM)은 잠재변인 간 경로와 측정모형을 동시에 추정·평가하는 다변량 기법이다.",
  },
  {
    seedKey: "dx:statistics:term:5",
    type: "term",
    cognitiveLevel: "remember",
    area: "statistics",
    prompt:
      "종속변수가 합격/불합격처럼 이분형일 때 그 발생 확률을 독립변수들로 예측하는 회귀 기법은? (한글 또는 영문)",
    answer: "로지스틱회귀분석",
    acceptedAnswers: ["로지스틱회귀", "logistic regression", "로지스틱 회귀분석", "로지스틱 회귀"],
    explanation:
      "로지스틱회귀분석은 이분형(또는 다항) 종속변수의 발생 확률을 예측하는 일반화선형모형 기반 기법이다.",
  },

  // ── 연구방법 term (5) ──
  {
    seedKey: "dx:method:term:1",
    type: "term",
    cognitiveLevel: "remember",
    area: "method",
    prompt:
      "독립변인을 직접 조작하고 참가자를 처치집단·통제집단에 무선할당하여 처치의 인과 효과를 검증하는, 양적 연구의 대표적 방법을 한 단어로 쓰면? (한글 또는 영문)",
    answer: "실험연구",
    acceptedAnswers: ["실험", "experiment", "experimental research", "실험 연구"],
    explanation:
      "실험연구는 독립변인 조작과 무선할당으로 가외변인을 통제하고 처치 효과를 인과적으로 검증한다.",
  },
  {
    seedKey: "dx:method:term:2",
    type: "term",
    cognitiveLevel: "remember",
    area: "method",
    prompt:
      "동일 주제를 다룬 다수 선행 연구의 효과크기를 표준화해 통계적으로 종합·통합하는 양적 연구 방법은? (한글 또는 영문)",
    answer: "메타분석",
    acceptedAnswers: ["meta-analysis", "meta analysis", "메타 분석"],
    explanation:
      "메타분석은 여러 선행 연구의 효과크기를 통합해 전체 효과와 조절변인을 분석하는 양적 종합 방법이다.",
  },
  {
    seedKey: "dx:method:term:3",
    type: "term",
    cognitiveLevel: "remember",
    area: "method",
    prompt:
      "특정 집단이 공유하는 문화를 연구자가 장기간 현장에 참여관찰하며 내부자 관점에서 총체적으로 기술하는 질적 연구 방법은? (한글 또는 영문)",
    answer: "문화기술지",
    acceptedAnswers: ["ethnography", "민족지", "참여관찰연구", "에스노그라피"],
    explanation:
      "문화기술지(ethnography)는 장기 참여관찰로 집단이 공유하는 문화를 내부자(emic) 관점에서 두껍게 기술한다.",
  },
  {
    seedKey: "dx:method:term:4",
    type: "term",
    cognitiveLevel: "remember",
    area: "method",
    prompt:
      "어떤 현상을 직접 체험한 사람들의 진술에서 그 체험에 공통적으로 내재한 본질적 의미 구조를 드러내는 질적 연구 방법은? (한글 또는 영문)",
    answer: "현상학",
    acceptedAnswers: ["phenomenology", "현상학적 연구", "현상학적연구"],
    explanation:
      "현상학은 체험자의 심층 면담 자료에서 의미단위를 분석해 경험의 본질적 구조를 드러내는 질적 방법이다.",
  },
  {
    seedKey: "dx:method:term:5",
    type: "term",
    cognitiveLevel: "remember",
    area: "method",
    prompt:
      "교사 등 실천가가 자신의 실천 맥락에서 '계획-실행-관찰-성찰'의 순환을 통해 개선을 도모하는 참여적 연구 방법은? (한글 또는 영문)",
    answer: "액션리서치",
    acceptedAnswers: ["실행연구", "action research", "실천연구", "참여실행연구"],
    explanation:
      "액션리서치(실행연구)는 연구자 본인이 실행자가 되어 계획·실행·관찰·성찰의 순환을 반복하며 실천을 개선한다.",
  },

  // ── 교육공학 핵심개념 term (6) — conceptSeedKey 로 약점 링크 ──
  {
    seedKey: "dx:concept:term:1",
    type: "term",
    cognitiveLevel: "remember",
    area: "concept",
    conceptSeedKey: "concept:self-efficacy",
    prompt:
      "특정 과제를 수행하는 데 필요한 행동을 조직하고 실행할 수 있다는 자신의 능력에 대한 신념을 가리키는 Bandura의 핵심 구인은? (한글 또는 영문)",
    answer: "자기효능감",
    acceptedAnswers: ["self-efficacy", "self efficacy", "효능감"],
    explanation:
      "자기효능감(self-efficacy)은 Bandura의 사회인지이론 핵심 구인으로, 특정 과제 수행 능력에 대한 신념이다.",
  },
  {
    seedKey: "dx:concept:term:2",
    type: "term",
    cognitiveLevel: "remember",
    area: "concept",
    conceptSeedKey: "concept:cognitive-load",
    prompt:
      "학습 과제 수행 중 작업기억에 부과되는 정신적 처리 요구량으로, 내재적·외재적·본유적 부하로 구분되는 개념은? (한글 또는 영문)",
    answer: "인지부하",
    acceptedAnswers: ["cognitive load", "정신적 부하", "인지 부하"],
    explanation:
      "인지부하(cognitive load)는 Sweller의 인지부하이론에서 비롯되며 내재적·외재적·본유적 부하로 구분된다.",
  },
  {
    seedKey: "dx:concept:term:3",
    type: "term",
    cognitiveLevel: "remember",
    area: "concept",
    conceptSeedKey: "concept:metacognition",
    prompt:
      "'인지에 대한 인지'로, 자신의 학습 과정을 점검·계획·조절하는 능력을 뜻하는 Flavell의 개념은? (한글 또는 영문)",
    answer: "메타인지",
    acceptedAnswers: ["metacognition", "초인지", "상위인지"],
    explanation:
      "메타인지(metacognition)는 Flavell이 제안한 '인지에 대한 인지'로, 메타인지 지식과 조절로 구분된다.",
  },
  {
    seedKey: "dx:concept:term:4",
    type: "term",
    cognitiveLevel: "remember",
    area: "concept",
    conceptSeedKey: "concept:tpack",
    prompt:
      "내용지식(CK)·교수지식(PK)·테크놀로지지식(TK)의 교집합에서 형성되는 교사의 통합 지식 프레임워크의 약어는?",
    answer: "TPACK",
    acceptedAnswers: ["TPCK", "테크놀로지 교수내용지식", "technological pedagogical content knowledge"],
    explanation:
      "TPACK은 Mishra & Koehler가 Shulman의 PCK를 확장한 것으로 CK·PK·TK의 통합 지식을 가리킨다.",
  },
  {
    seedKey: "dx:concept:term:5",
    type: "term",
    cognitiveLevel: "remember",
    area: "concept",
    conceptSeedKey: "concept:flipped-learning",
    prompt:
      "개념 학습은 사전 영상·자료로 가정에서, 적용·토론·문제해결은 교실에서 진행하도록 순서를 뒤집은 혼합학습 모델은? (한글 또는 영문)",
    answer: "플립러닝",
    acceptedAnswers: ["flipped learning", "거꾸로 학습", "거꾸로교실", "flipped classroom", "거꾸로 교실"],
    explanation:
      "플립러닝(거꾸로 학습)은 교실 수업과 가정 학습의 순서를 뒤집어 교실에서 적용·상호작용에 집중하는 모델이다.",
  },
  {
    seedKey: "dx:concept:term:6",
    type: "term",
    cognitiveLevel: "remember",
    area: "concept",
    conceptSeedKey: "concept:social-presence",
    prompt:
      "온라인 학습에서 학습자가 다른 참여자를 '실제 사람'으로 지각하는 정도로, Garrison의 탐구공동체(CoI) 모델 3요소 중 하나는? (한글 또는 영문)",
    answer: "사회적 실재감",
    acceptedAnswers: ["social presence", "사회적실재감", "사회적 현존감"],
    explanation:
      "사회적 실재감(social presence)은 탐구공동체(CoI) 모델에서 교수적·인지적 실재감과 함께 작동하는 핵심 요소다.",
  },

  // ═════════════════════════════════════════════════════════════
  // 참 / 거짓 (ox) — statement(진술) → answerBool. 검증 가능한 명백한 진술만.
  // 인지수준: 사실 재인·구분 위주(remember/understand).
  // ═════════════════════════════════════════════════════════════
  // ── 통계방법 ox (4) ──
  {
    seedKey: "dx:statistics:ox:1",
    type: "ox",
    area: "statistics",
    cognitiveLevel: "understand",
    statement:
      "t-검정은 세 집단 이상의 평균을 한 번에 비교할 때 사용하는 기법이다.",
    answerBool: false,
    explanation:
      "거짓. t-검정은 두 집단(또는 두 시점)의 평균 비교에 사용한다. 세 집단 이상의 평균을 한 번에 비교하려면 분산분석(ANOVA)을 사용한다.",
  },
  {
    seedKey: "dx:statistics:ox:2",
    type: "ox",
    area: "statistics",
    cognitiveLevel: "understand",
    statement:
      "ANCOVA(공분산분석)는 공변량의 영향을 통제한 뒤 집단 간 평균 차이를 검정한다.",
    answerBool: true,
    explanation:
      "참. ANCOVA는 사전점수 등 공변량을 통제한 상태에서 범주형 독립변수에 따른 집단 간 평균 차이를 검정하는 기법이다.",
  },
  {
    seedKey: "dx:statistics:ox:3",
    type: "ox",
    area: "statistics",
    cognitiveLevel: "understand",
    statement:
      "탐색적 요인분석(EFA)은 사전에 가정한 요인구조의 적합도를 검증하는 분석이다.",
    answerBool: false,
    explanation:
      "거짓. 사전에 가정한 요인구조의 적합도를 검증하는 것은 확인적 요인분석(CFA)이다. EFA는 요인구조를 가정하지 않고 자료 기반으로 잠재요인을 탐색한다.",
  },
  {
    seedKey: "dx:statistics:ox:4",
    type: "ox",
    area: "statistics",
    cognitiveLevel: "understand",
    statement:
      "종속변수가 이분형(예: 합격/불합격)일 때 그 발생 확률을 예측하려면 로지스틱회귀분석이 적절하다.",
    answerBool: true,
    explanation:
      "참. 이분형 종속변수의 발생 확률 예측에는 로지스틱회귀분석을 사용한다. 연속형 종속변수에는 (다중)회귀분석을 쓴다.",
  },

  // ── 연구방법 ox (4) ──
  {
    seedKey: "dx:method:ox:1",
    type: "ox",
    area: "method",
    cognitiveLevel: "understand",
    statement:
      "진실험(true experiment)의 핵심 요건 중 하나는 참가자의 무선할당(random assignment)이다.",
    answerBool: true,
    explanation:
      "참. 진실험은 독립변인 조작과 함께 참가자를 집단에 무선할당하여 가외변인을 통제하고 인과 추론의 내적타당도를 확보한다.",
  },
  {
    seedKey: "dx:method:ox:2",
    type: "ox",
    area: "method",
    cognitiveLevel: "understand",
    statement:
      "준실험연구는 무선할당이 어려운 상황에서 이미 편성된 기존 집단을 활용하는 연구 방법이다.",
    answerBool: true,
    explanation:
      "참. 준실험연구는 무선할당 없이 학급 등 비동등한 기존 집단을 처치·비교집단으로 활용하며, 흔히 사전점수를 공변인으로 통제한다.",
  },
  {
    seedKey: "dx:method:ox:3",
    type: "ox",
    area: "method",
    cognitiveLevel: "understand",
    statement:
      "메타분석은 여러 선행 연구의 효과크기를 통계적으로 종합하는 질적 연구 방법이다.",
    answerBool: false,
    explanation:
      "거짓. 메타분석은 효과크기를 표준화해 통합하는 양적 종합 방법이다. 질적 연구가 아니다.",
  },
  {
    seedKey: "dx:method:ox:4",
    type: "ox",
    area: "method",
    cognitiveLevel: "understand",
    statement:
      "근거이론, 현상학, 문화기술지는 일반적으로 질적 연구 방법으로 분류된다.",
    answerBool: true,
    explanation:
      "참. 근거이론·현상학·문화기술지는 대표적인 질적 연구 전통이다.",
  },

  // ── 교육공학 핵심개념 ox (4) ──
  {
    seedKey: "dx:concept:ox:1",
    type: "ox",
    area: "concept",
    cognitiveLevel: "understand",
    conceptSeedKey: "concept:cognitive-load",
    statement:
      "인지부하이론에서 인지부하는 내재적·외재적·본유적 부하의 세 가지로 구분된다.",
    answerBool: true,
    explanation:
      "참. Sweller의 인지부하이론은 부하를 내재적(intrinsic)·외재적(extraneous)·본유적(germane) 부하로 구분한다.",
  },
  {
    seedKey: "dx:concept:ox:2",
    type: "ox",
    area: "concept",
    cognitiveLevel: "understand",
    conceptSeedKey: "concept:tpack",
    statement:
      "TPACK은 내용지식(CK)·교수지식(PK)·테크놀로지지식(TK)의 통합 지식을 가리키는 프레임워크이다.",
    answerBool: true,
    explanation:
      "참. TPACK은 Mishra & Koehler가 Shulman의 PCK를 확장한 것으로 CK·PK·TK의 교집합에서 형성되는 통합 지식이다.",
  },
  {
    seedKey: "dx:concept:ox:3",
    type: "ox",
    area: "concept",
    cognitiveLevel: "understand",
    conceptSeedKey: "concept:samr-model",
    statement:
      "SAMR 모델의 네 단계는 낮은 수준부터 대체(S)-증강(A)-변형(M)-재정의(R) 순이다.",
    answerBool: true,
    explanation:
      "참. SAMR은 대체(Substitution)→증강(Augmentation)→변형(Modification)→재정의(Redefinition) 순으로 테크놀로지 통합 수준이 높아진다.",
  },
  {
    seedKey: "dx:concept:ox:4",
    type: "ox",
    area: "concept",
    cognitiveLevel: "understand",
    conceptSeedKey: "concept:self-efficacy",
    statement:
      "자기효능감은 특정 과제를 수행할 수 있다는 능력에 대한 신념으로, Bandura가 제안한 개념이다.",
    answerBool: true,
    explanation:
      "참. 자기효능감(self-efficacy)은 Bandura의 사회인지이론 핵심 구인으로, 특정 과제 수행 능력에 대한 신념을 의미한다.",
  },

  // ═════════════════════════════════════════════════════════════
  // 개념 구분 (compare) — 혼동되는 유사 개념 중 정답 선택. options·answerIndex (mcq 구조).
  // 인지수준: 유사개념 변별(analyze) / 의미 구분(understand).
  // ═════════════════════════════════════════════════════════════
  // ── 통계방법 compare (4) ──
  {
    seedKey: "dx:statistics:cmp:1",
    type: "compare",
    area: "statistics",
    cognitiveLevel: "analyze",
    question:
      "'사전에 요인구조를 가정하지 않고 관측변수의 상관에서 잠재요인을 자료 기반으로 탐색'하는 분석은 다음 중 무엇인가?",
    options: ["EFA(탐색적 요인분석)", "CFA(확인적 요인분석)"],
    answerIndex: 0,
    explanation:
      "EFA는 요인구조를 가정하지 않고 탐색한다. CFA는 사전에 가정된 요인구조의 적합도를 검증한다.",
  },
  {
    seedKey: "dx:statistics:cmp:2",
    type: "compare",
    area: "statistics",
    cognitiveLevel: "analyze",
    question:
      "공변량(예: 사전점수)을 통제하면서 집단 간 평균 차이를 검정하는 기법은 ANOVA와 ANCOVA 중 무엇인가?",
    options: ["ANOVA(분산분석)", "ANCOVA(공분산분석)"],
    answerIndex: 1,
    explanation:
      "ANCOVA는 공변량을 통제한 뒤 집단 간 평균 차이를 검정한다. ANOVA는 공변량 통제가 없다.",
  },
  {
    seedKey: "dx:statistics:cmp:3",
    type: "compare",
    area: "statistics",
    cognitiveLevel: "analyze",
    question:
      "종속변수가 2개 이상의 연속형 변수일 때 집단 간 평균 차이를 동시에 검정하는 기법은?",
    options: ["ANOVA(일원분산분석)", "MANOVA(다변량분산분석)"],
    answerIndex: 1,
    explanation:
      "MANOVA는 둘 이상의 연속형 종속변수를 동시에 다룬다. ANOVA는 종속변수가 1개일 때 사용한다.",
  },
  {
    seedKey: "dx:statistics:cmp:4",
    type: "compare",
    area: "statistics",
    cognitiveLevel: "analyze",
    question:
      "종속변수가 연속형일 때와 이분형일 때 각각 적절한 회귀 기법으로 올바르게 짝지어진 것은?",
    options: [
      "연속형→다중회귀분석 · 이분형→로지스틱회귀분석",
      "연속형→로지스틱회귀분석 · 이분형→다중회귀분석",
    ],
    answerIndex: 0,
    explanation:
      "연속형 종속변수에는 (다중)회귀분석, 이분형 종속변수에는 로지스틱회귀분석을 사용한다.",
  },

  // ── 연구방법 compare (2) ──
  {
    seedKey: "dx:method:cmp:1",
    type: "compare",
    area: "method",
    cognitiveLevel: "analyze",
    question:
      "참가자를 무선할당하는지 여부로 구분할 때, '무선할당 없이 기존 집단을 활용'하는 연구는 진실험과 준실험 중 무엇인가?",
    options: ["진실험연구", "준실험연구"],
    answerIndex: 1,
    explanation:
      "준실험연구는 무선할당 없이 기존(비동등) 집단을 활용한다. 진실험은 무선할당을 전제한다.",
  },
  {
    seedKey: "dx:method:cmp:2",
    type: "compare",
    area: "method",
    cognitiveLevel: "analyze",
    question:
      "'특정 집단이 공유하는 문화를 장기간 참여관찰로 기술'하는 방법과 '체험의 본질적 의미 구조를 드러내는' 방법으로 올바르게 짝지어진 것은?",
    options: [
      "문화기술지(문화 기술) · 현상학(본질적 의미)",
      "현상학(문화 기술) · 문화기술지(본질적 의미)",
    ],
    answerIndex: 0,
    explanation:
      "문화기술지는 집단의 문화를 참여관찰로 기술하고, 현상학은 체험의 본질적 의미 구조를 드러낸다.",
  },

  // ── 교육공학 핵심개념 compare (2) ──
  {
    seedKey: "dx:concept:cmp:1",
    type: "compare",
    area: "concept",
    cognitiveLevel: "analyze",
    conceptSeedKey: "concept:samr-model",
    question:
      "'교사의 통합 지식(CK·PK·TK)'을 다루는 프레임워크와 '테크놀로지 통합 수준(S·A·M·R)'을 진단하는 프레임워크로 올바르게 짝지어진 것은?",
    options: [
      "TPACK(통합 지식) · SAMR(통합 수준)",
      "SAMR(통합 지식) · TPACK(통합 수준)",
    ],
    answerIndex: 0,
    explanation:
      "TPACK은 교사 지식의 통합을, SAMR은 테크놀로지 활용 수준(대체~재정의)을 다룬다.",
  },
  {
    seedKey: "dx:concept:cmp:2",
    type: "compare",
    area: "concept",
    cognitiveLevel: "understand",
    conceptSeedKey: "concept:metacognition",
    question:
      "'자신의 학습 과정을 점검·조절하는 인지에 대한 인지'를 가리키는 개념은 메타인지와 자기효능감 중 무엇인가?",
    options: ["메타인지", "자기효능감"],
    answerIndex: 0,
    explanation:
      "메타인지는 '인지에 대한 인지'로 학습 과정의 점검·조절을 의미한다. 자기효능감은 과제 수행 능력에 대한 신념이다.",
  },

  // ═════════════════════════════════════════════════════════════
  // 짝짓기 (matching) — leftItems(개념) ↔ rightItems(학자/모델). correctMap: left index→right index.
  // 학자↔개념 매칭은 archive-seed.ts references 로 검증된 것만 사용.
  // 인지수준: 관계 분석(analyze).
  // ═════════════════════════════════════════════════════════════
  // ── 교육공학 핵심개념 matching (2) ──
  {
    seedKey: "dx:concept:mat:1",
    type: "matching",
    area: "concept",
    cognitiveLevel: "analyze",
    question: "다음 교육공학 개념을 제안한 학자와 바르게 연결하세요.",
    leftItems: ["자기효능감", "인지부하이론", "메타인지", "TPACK"],
    rightItems: ["Bandura", "Sweller", "Flavell", "Mishra & Koehler"],
    correctMap: [0, 1, 2, 3],
    explanation:
      "자기효능감=Bandura, 인지부하이론=Sweller, 메타인지=Flavell, TPACK=Mishra & Koehler. (archive 개념 references 기준)",
  },
  {
    seedKey: "dx:concept:mat:2",
    type: "matching",
    area: "concept",
    cognitiveLevel: "analyze",
    question: "다음 이론·모델을 제안한 학자와 바르게 연결하세요.",
    leftItems: [
      "멀티미디어 학습 인지이론(CTML)",
      "자기조절학습 순환 모형",
      "탐구공동체(CoI)·사회적 실재감",
      "ARCS 동기설계 모형",
    ],
    rightItems: ["Mayer", "Zimmerman", "Garrison 등", "Keller"],
    correctMap: [0, 1, 2, 3],
    explanation:
      "CTML=Mayer, 자기조절학습 순환 모형=Zimmerman, 탐구공동체(CoI)=Garrison·Anderson·Archer, ARCS=Keller. (archive 개념 references 기준)",
  },

  // ── 연구방법 matching (1) ──
  {
    seedKey: "dx:method:mat:1",
    type: "matching",
    area: "method",
    cognitiveLevel: "analyze",
    question: "다음 연구 방법을 핵심 특징과 바르게 연결하세요.",
    leftItems: ["실험연구", "근거이론", "메타분석", "문화기술지"],
    rightItems: [
      "무선할당·처치 효과 검증",
      "개방·축·선택 코딩으로 이론 생성",
      "선행 연구 효과크기 통합",
      "장기 참여관찰로 문화 기술",
    ],
    correctMap: [0, 1, 2, 3],
    explanation:
      "실험연구=무선할당, 근거이론=코딩 기반 이론 생성, 메타분석=효과크기 통합, 문화기술지=참여관찰 문화 기술.",
  },

  // ═════════════════════════════════════════════════════════════
  // 상황 적용 (scenario) — 연구/분석 상황 맥락에서 적절한 방법·기법 선택. options·answerIndex.
  // 인지수준: 실제 상황에 방법 적용(apply).
  // ═════════════════════════════════════════════════════════════
  // ── 통계방법 scenario (3) ──
  {
    seedKey: "dx:statistics:scn:1",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "apply",
    question:
      "세 가지 교수법(A·B·C) 집단의 사후 성취도 평균을 비교하되, 집단 간 사전점수 차이를 통제하려 한다. 가장 적절한 분석은?",
    options: [
      "ANCOVA(공분산분석)",
      "독립표본 t-검정",
      "탐색적 요인분석(EFA)",
      "카이제곱 검정",
    ],
    answerIndex: 0,
    explanation:
      "세 집단 비교 + 사전점수(공변량) 통제이므로 ANCOVA가 적절하다. t-검정은 두 집단, EFA·카이제곱은 목적이 다르다.",
  },
  {
    seedKey: "dx:statistics:scn:2",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "apply",
    question:
      "종속변수가 '중도탈락 여부(예/아니오)'이고, 이를 여러 독립변수로 예측해 발생 확률을 추정하려 한다. 가장 적절한 기법은?",
    options: [
      "로지스틱회귀분석",
      "다중회귀분석",
      "일원분산분석(ANOVA)",
      "대응표본 t-검정",
    ],
    answerIndex: 0,
    explanation:
      "종속변수가 이분형이므로 로지스틱회귀분석이 적절하다. 다중회귀는 연속형 종속변수에 사용한다.",
  },
  {
    seedKey: "dx:statistics:scn:3",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "apply",
    question:
      "동일한 학생들에게 사전·사후 두 시점의 점수를 측정하여 평균 변화가 유의한지 검정하려 한다. 가장 적절한 기법은?",
    options: [
      "대응표본 t-검정",
      "독립표본 t-검정",
      "다변량분산분석(MANOVA)",
      "구조방정식모형(SEM)",
    ],
    answerIndex: 0,
    explanation:
      "같은 대상의 두 시점(반복측정) 평균 비교이므로 대응표본 t-검정이 적절하다. 독립표본 t-검정은 서로 다른 두 집단 비교에 쓴다.",
  },

  // ── 연구방법 scenario (2) ──
  {
    seedKey: "dx:method:scn:1",
    type: "scenario",
    area: "method",
    cognitiveLevel: "apply",
    question:
      "한 교사가 자신의 학급에서 새로운 토론 수업 전략을 '계획-실행-관찰-성찰'의 순환으로 적용하며 수업을 개선하고자 한다. 가장 적합한 연구 방법은?",
    options: ["액션리서치(실행연구)", "메타분석", "실험연구", "문화기술지"],
    answerIndex: 0,
    explanation:
      "실천가 본인이 자신의 맥락에서 계획·실행·관찰·성찰의 순환으로 개선을 도모하므로 액션리서치가 적합하다.",
  },
  {
    seedKey: "dx:method:scn:2",
    type: "scenario",
    area: "method",
    cognitiveLevel: "apply",
    question:
      "연구자가 특정 현상에 대한 기존 이론이 부족하여, 면담 자료에서 출발해 지속적 비교와 코딩으로 새로운 설명 이론을 생성하려 한다. 가장 적합한 질적 방법은?",
    options: ["근거이론", "설문조사연구", "준실험연구", "메타분석"],
    answerIndex: 0,
    relatedMethodName: "근거이론",
    explanation:
      "자료에 근거해 코딩과 지속적 비교로 이론을 생성하는 목적에는 근거이론(Grounded Theory)이 적합하다.",
  },

  // ═════════════════════════════════════════════════════════════
  // v4 추가 — 연구설계·통계 실전 적용 scenario 대폭 강화 (전면 교육공학 연구 맥락)
  // 형태: ⓐ조건제시형 / ⓑ논문서술형 / ⓒ연구문제 나열형 / ⓓ분석 절차·의사결정 추론
  // 졸업생 논문 연계 메타: relatedMethodName / relatedStatMethodName (archive 가이드 name 대응)
  // ═════════════════════════════════════════════════════════════

  // ── 통계방법 scenario 추가 (statistics) — 기존 3 + 신규 9 = 12 ──
  // ⓐ 조건제시형: 변인 수·척도·집단·설계 → 통계기법
  {
    seedKey: "dx:statistics:scn:4",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "apply",
    question:
      "[조건] 독립변인 2개(수업방식: 플립러닝/전통, 사전성취수준: 상/하), 종속변인 1개(학업성취, 연속형), 집단 간 설계. 두 독립변인의 주효과와 상호작용효과를 함께 검정하려 한다. 가장 적절한 분석은?",
    options: [
      "이원분산분석(two-way ANOVA)",
      "일원분산분석(one-way ANOVA)",
      "독립표본 t-검정",
      "단순회귀분석",
    ],
    answerIndex: 0,
    relatedStatMethodName: "ANOVA (일원분산분석)",
    explanation:
      "범주형 독립변인 2개의 주효과와 상호작용을 하나의 연속형 종속변인에서 검정하므로 이원분산분석(two-way ANOVA)이 적절하다. 일원분산분석은 독립변인이 1개, t-검정은 두 집단 평균 비교에 쓴다.",
  },
  {
    seedKey: "dx:statistics:scn:5",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "apply",
    question:
      "[조건] LMS 학습분석 연구. 독립변인은 학습시간·접속빈도·과제제출률(모두 연속형) 3개, 종속변인은 기말 학업성취(연속형) 1개. 각 변인의 상대적 설명력을 함께 추정하려 한다. 가장 적절한 분석은?",
    options: [
      "다중회귀분석",
      "로지스틱회귀분석",
      "일원분산분석(ANOVA)",
      "탐색적 요인분석(EFA)",
    ],
    answerIndex: 0,
    relatedStatMethodName: "다중회귀분석",
    explanation:
      "연속형 종속변인 1개를 연속형 독립변인 여러 개로 예측하고 표준화계수로 상대적 설명력을 비교하므로 다중회귀분석이 적절하다. 종속변인이 이분형이면 로지스틱회귀를 쓴다.",
  },
  {
    seedKey: "dx:statistics:scn:6",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "apply",
    question:
      "[조건] 에듀테크 수용(TAM) 연구. '지각된 유용성'과 '지각된 용이성'이라는 잠재변인이 '이용의도'에 미치는 인과 경로를, 다항목 측정모형과 함께 동시에 추정·검증하려 한다. 가장 적절한 분석은?",
    options: [
      "구조방정식모형(SEM)",
      "다중회귀분석",
      "이원분산분석",
      "군집분석",
    ],
    answerIndex: 0,
    relatedStatMethodName: "구조방정식모형(SEM)",
    relatedMethodName: "구조방정식모형(SEM)",
    explanation:
      "다항목으로 측정된 잠재변인 간 인과 경로와 측정모형을 동시에 추정·평가하므로 구조방정식모형(SEM)이 적절하다. 다중회귀는 잠재변인 측정모형을 동시에 다루지 못한다.",
  },
  {
    seedKey: "dx:statistics:scn:7",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "apply",
    question:
      "[조건] AI 디지털교과서 처치 연구. 처치·통제 두 집단의 사후 '학습몰입'과 '학업성취' 두 연속형 종속변인을 동시에 비교하려 한다(공변량 통제는 없음). 가장 적절한 분석은?",
    options: [
      "다변량분산분석(MANOVA)",
      "일원분산분석(ANOVA)",
      "대응표본 t-검정",
      "카이제곱 검정",
    ],
    answerIndex: 0,
    relatedStatMethodName: "MANOVA (다변량분산분석)",
    explanation:
      "두 개 이상의 연속형 종속변인을 동시에 다뤄 집단 간 차이를 검정하므로 MANOVA가 적절하다. 종속변인이 1개면 ANOVA, 공변량까지 통제하면 MANCOVA를 쓴다.",
  },
  {
    seedKey: "dx:statistics:scn:8",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "apply",
    question:
      "[조건] 새 디지털 리터러시 척도를 개발했다. 25개 문항이 사전에 가정한 4개 하위요인 구조에 부합하는지 적합도 지수(CFI·RMSEA 등)로 검증하려 한다. 가장 적절한 분석은?",
    options: [
      "확인적 요인분석(CFA)",
      "탐색적 요인분석(EFA)",
      "다중회귀분석",
      "정준상관분석",
    ],
    answerIndex: 0,
    relatedStatMethodName: "확인적 요인분석(CFA)",
    relatedMethodName: "측정도구 개발과 타당화",
    explanation:
      "사전에 가정한 요인구조의 적합도를 지수로 검증하므로 확인적 요인분석(CFA)이 적절하다. 요인구조를 가정하지 않고 탐색한다면 EFA를 쓴다.",
  },
  {
    seedKey: "dx:statistics:scn:9",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "apply",
    question:
      "[조건] 블렌디드 러닝 연구. 종속변인은 '교과목 이수 여부(이수/중도포기)'이고, 이를 출석률·과제점수·자기효능감 등으로 예측해 포기 확률을 추정하려 한다. 가장 적절한 분석은?",
    options: [
      "로지스틱회귀분석",
      "다중회귀분석",
      "다변량분산분석(MANOVA)",
      "구조방정식모형(SEM)",
    ],
    answerIndex: 0,
    relatedStatMethodName: "로지스틱회귀분석",
    explanation:
      "종속변인이 이분형(이수/포기)이고 발생 확률을 예측하므로 로지스틱회귀분석이 적절하다. 다중회귀는 연속형 종속변인에 사용한다.",
  },
  // ⓒ 연구문제 나열형: 조절효과 → 상호작용항·위계적 회귀
  {
    seedKey: "dx:statistics:scn:10",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "analyze",
    question:
      "[연구문제] 1) 플립러닝 참여도는 학습몰입에 영향을 주는가? 2) 그 영향이 학습자의 자기조절학습 수준에 따라 달라지는가? 2)와 같은 조절효과를 검정하기에 가장 적절한 방법은?",
    options: [
      "상호작용항을 투입한 위계적(조절) 회귀분석",
      "단순상관분석",
      "독립표본 t-검정",
      "탐색적 요인분석(EFA)",
    ],
    answerIndex: 0,
    relatedStatMethodName: "다중회귀분석",
    explanation:
      "조절효과는 독립변인×조절변인 상호작용항을 위계적으로 투입해 ΔR²의 유의성으로 검정한다(또는 SEM 상호작용). 단순상관·t-검정으로는 조절효과를 검정할 수 없다.",
  },
  {
    seedKey: "dx:statistics:scn:11",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "analyze",
    question:
      "[연구문제] '교사의 테크놀로지 지원(TK)이 학생 학업참여에 미치는 영향을 학습동기가 매개하는가?'를 검정하려 한다. 매개효과 검정에 가장 적절한 방법은?",
    options: [
      "구조방정식모형(SEM) 또는 부트스트래핑 기반 매개효과 분석",
      "카이제곱 독립성 검정",
      "일원분산분석(ANOVA)",
      "Cronbach α 신뢰도 분석",
    ],
    answerIndex: 0,
    relatedStatMethodName: "구조방정식모형(SEM)",
    relatedMethodName: "구조방정식모형(SEM)",
    explanation:
      "매개효과는 SEM 경로모형이나 부트스트래핑으로 간접효과의 유의성을 검정한다. 카이제곱·ANOVA·신뢰도분석은 매개 검정 목적과 맞지 않는다.",
  },
  // ⓓ 분석 절차·의사결정 추론
  {
    seedKey: "dx:statistics:scn:12",
    type: "scenario",
    area: "statistics",
    cognitiveLevel: "analyze",
    question:
      "[절차 추론] 준실험연구에서 두 학급의 사후 학업성취를 비교하려 한다. 사전검사에서 두 집단의 초기 점수가 유의하게 달랐다(비동질). 처치효과를 추정하기에 가장 적절한 분석은?",
    options: [
      "사전점수를 공변량으로 통제한 ANCOVA",
      "공변량 없이 사후점수만 비교하는 독립표본 t-검정",
      "탐색적 요인분석(EFA)",
      "카이제곱 검정",
    ],
    answerIndex: 0,
    relatedStatMethodName: "ANCOVA (공분산분석)",
    relatedMethodName: "준실험연구",
    explanation:
      "집단이 비동질일 때는 사전점수를 공변량으로 통제하는 ANCOVA로 초기차를 보정한 처치효과를 추정한다. 단순 사후 t-검정은 초기차 편향을 통제하지 못한다.",
  },

  // ── 연구방법 scenario 추가 (method) — 기존 2 + 신규 9 = 11. ⓑ 방법·통계 연계 포함 ──
  // ⓐ 조건제시형 (연구설계 식별)
  {
    seedKey: "dx:method:scn:3",
    type: "scenario",
    area: "method",
    cognitiveLevel: "apply",
    question:
      "[조건] 교육공학 연구자가 플립러닝 효과를 검증하려는데, 학교 사정상 학생을 무작위 배정할 수 없어 이미 편성된 두 학급을 처치·비교집단으로 활용하고 사전점수를 통제하려 한다. 가장 적절한 연구방법은?",
    options: ["준실험연구", "진실험연구", "문화기술지", "델파이조사"],
    answerIndex: 0,
    relatedMethodName: "준실험연구",
    explanation:
      "무선할당이 불가능해 기존(비동등) 집단을 활용하고 사전점수를 공변인으로 통제하므로 준실험연구가 적절하다. 무선할당이 가능하면 진실험이다.",
  },
  {
    seedKey: "dx:method:scn:4",
    type: "scenario",
    area: "method",
    cognitiveLevel: "apply",
    question:
      "[조건] 최근 10년간 발표된 '디지털교과서가 학업성취에 미치는 효과' 논문 40여 편의 결과가 제각각이다. 이를 효과크기로 표준화해 전체 효과와 조절변인을 통합 분석하려 한다. 가장 적절한 연구방법은?",
    options: ["메타분석", "근거이론", "사례연구", "실험연구"],
    answerIndex: 0,
    relatedMethodName: "메타분석",
    explanation:
      "다수 선행연구의 효과크기를 표준화·통합하고 조절변인을 분석하므로 메타분석이 적절하다.",
  },
  {
    seedKey: "dx:method:scn:5",
    type: "scenario",
    area: "method",
    cognitiveLevel: "apply",
    question:
      "[조건] 연구자가 한 중학교 메이커스페이스 동아리에 6개월간 참여하며, 구성원이 공유하는 규범·상호작용·문화를 내부자 관점에서 두껍게 기술하려 한다. 가장 적절한 질적 연구방법은?",
    options: ["문화기술지", "메타분석", "준실험연구", "측정도구 개발과 타당화"],
    answerIndex: 0,
    relatedMethodName: "문화기술지",
    explanation:
      "장기 참여관찰로 집단이 공유하는 문화를 내부자(emic) 관점에서 총체적으로 기술하므로 문화기술지가 적절하다.",
  },
  {
    seedKey: "dx:method:scn:6",
    type: "scenario",
    area: "method",
    cognitiveLevel: "apply",
    question:
      "[조건] 새로운 '온라인 학습실재감 척도'가 필요하다. 구성개념 정의 → 문항 개발 → 내용타당도 → 예비조사 → 본조사 → 요인분석 타당화의 절차로 도구를 개발·검증하려 한다. 가장 적절한 연구방법은?",
    options: [
      "측정도구 개발과 타당화",
      "메타분석",
      "실험연구",
      "내러티브 탐구",
    ],
    answerIndex: 0,
    relatedMethodName: "측정도구 개발과 타당화",
    explanation:
      "구성개념 정의부터 문항개발·타당도·신뢰도 검증까지의 절차는 측정도구(척도) 개발과 타당화 연구의 전형이다.",
  },
  // ⓑ 논문서술형 — 방법·통계 연계 (한 줄기 → 방법 / 통계 별도 식별)
  {
    seedKey: "dx:method:scn:7",
    type: "scenario",
    area: "method",
    cognitiveLevel: "apply",
    question:
      "[서술] 연구자는 플립러닝 프로그램을 처치집단에 무선할당으로 적용하고, 학습몰입·학업성취의 사전-사후 변화를 통제집단과 비교해 인과효과를 검증하려 한다. 이 연구의 (a) 연구방법으로 가장 적절한 것은?",
    options: ["진실험연구", "사례연구", "현상학", "델파이조사"],
    answerIndex: 0,
    relatedMethodName: "실험연구",
    explanation:
      "(a) 무선할당 + 독립변인 조작 + 통제집단 비교로 인과효과를 검증하므로 진실험연구가 적절하다. 같은 줄기의 (b) 통계방법은 사전점수 통제 ANCOVA 문항(dx:statistics:scn:12 유형)으로 이어진다.",
  },
  {
    seedKey: "dx:method:scn:8",
    type: "scenario",
    area: "method",
    cognitiveLevel: "apply",
    question:
      "[서술] (앞 문항 연계) 동일한 플립러닝 진실험에서, 처치·통제 두 집단의 '학업성취' 사후점수를 사전점수 차이를 보정해 비교하려 한다. (b) 통계방법으로 가장 적절한 것은?",
    options: [
      "공분산분석(ANCOVA)",
      "탐색적 요인분석(EFA)",
      "카이제곱 검정",
      "군집분석",
    ],
    answerIndex: 0,
    relatedStatMethodName: "ANCOVA (공분산분석)",
    relatedMethodName: "실험연구",
    explanation:
      "(b) 두 집단의 사후 평균을 사전점수(공변량)로 보정해 비교하므로 ANCOVA가 적절하다. 종속변인·집단이 더 늘면 MANOVA/MANCOVA를 고려한다.",
  },
  // ⓒ 연구문제 나열형 (질적 방법 선택)
  {
    seedKey: "dx:method:scn:9",
    type: "scenario",
    area: "method",
    cognitiveLevel: "analyze",
    question:
      "[연구문제] '초임 교사들은 에듀테크 도입 과정에서 어떤 경험을 하며, 그 경험에 공통적으로 내재한 본질적 의미는 무엇인가?' 이 연구문제에 가장 적합한 질적 방법은?",
    options: ["현상학", "메타분석", "준실험연구", "구조방정식모형(SEM)"],
    answerIndex: 0,
    relatedMethodName: "현상학",
    explanation:
      "체험의 '본질적 의미 구조'를 드러내려는 연구문제에는 현상학이 적합하다. 이론 생성이 목적이면 근거이론을 고려한다.",
  },
  // ⓓ 절차·의사결정 추론 (실행연구 순환)
  {
    seedKey: "dx:method:scn:10",
    type: "scenario",
    area: "method",
    cognitiveLevel: "analyze",
    question:
      "[절차 추론] 한 교사가 액션리서치 1차 순환에서 '무작위 호명'을 적용했더니 참여는 늘었으나 일부 학생의 불안이 커졌다. 이 성찰 결과에 따라 다음으로 가장 적절한 단계는?",
    options: [
      "전략을 수정해(예: 자발적 발표+보상) 2차 실행 순환을 계획·진행한다",
      "연구를 종료하고 1차 결과만 일반화한다",
      "무선할당을 추가해 진실험으로 전환한다",
      "효과크기를 통합하는 메타분석을 실시한다",
    ],
    answerIndex: 0,
    relatedMethodName: "액션리서치",
    explanation:
      "액션리서치는 성찰 결과로 계획을 수정해 다음 개선 순환(계획-실행-관찰-성찰)을 반복한다. 단일 순환 결과의 일반화나 설계 전환은 액션리서치의 취지와 맞지 않는다.",
  },

  // ═════════════════════════════════════════════════════════════
  // v4 신규 — 지문 분석 (passage). 짧은 가상 연구 서술(초록/방법 문단)을 읽고
  // (a) 적용 개념·방법 식별 또는 (b) 한계·누락요소 식별. 채점은 mcq 동일(options·answerIndex).
  // ⚠️ 전부 가상 서술(실제 논문 복제 금지). 졸업생 논문 톤(자기효능감·플립러닝·ANCOVA·SEM 등).
  // 인지수준: 대부분 apply/analyze, 한계 식별은 evaluate.
  // ═════════════════════════════════════════════════════════════
  // ── (a) 적용 방법·기법 식별 ──
  {
    seedKey: "dx:method:psg:1",
    type: "passage",
    area: "method",
    cognitiveLevel: "analyze",
    passage:
      "본 연구는 중학교 2학년 두 개 학급(처치 32명·비교 31명)을 대상으로 플립러닝의 효과를 검증하였다. 학교 여건상 학생을 무작위로 배정하지 못하여 이미 편성된 학급을 그대로 활용하였다. 처치집단은 8주간 플립러닝으로, 비교집단은 전통적 강의식으로 운영하였다. 사전 학업성취 검사에서 두 집단 간 차이를 점검하였고, 사후 검사 결과는 사전점수를 공변량으로 통제하여 분석하였다.",
    question:
      "위 가상 연구 서술에서 채택한 연구설계로 가장 적절한 것은?",
    options: ["준실험연구", "진실험연구", "메타분석", "문화기술지"],
    answerIndex: 0,
    relatedMethodName: "준실험연구",
    relatedStatMethodName: "ANCOVA (공분산분석)",
    explanation:
      "무선할당 없이 기존 학급을 활용하고 사전점수를 공변량으로 통제(ANCOVA)했으므로 준실험연구다. 무선할당이 있었다면 진실험이다.",
  },
  {
    seedKey: "dx:statistics:psg:1",
    type: "passage",
    area: "statistics",
    cognitiveLevel: "analyze",
    passage:
      "연구자는 에듀테크 수용 모형을 검증하기 위해 대학생 412명의 응답을 수집하였다. '지각된 유용성', '지각된 용이성', '이용의도'는 각각 4~5개 문항으로 측정한 잠재변인으로 설정하였다. 먼저 측정문항이 잠재변인을 잘 반영하는지 확인적 요인분석으로 점검한 뒤, 잠재변인 간 인과 경로(유용성·용이성 → 이용의도)를 추정하고 모형 적합도(CFI=.96, RMSEA=.05)를 보고하였다.",
    question:
      "위 가상 연구가 잠재변인 간 인과 경로와 측정모형을 동시에 추정하기 위해 사용한 분석으로 가장 적절한 것은?",
    options: [
      "구조방정식모형(SEM)",
      "다중회귀분석",
      "이원분산분석",
      "탐색적 요인분석(EFA)",
    ],
    answerIndex: 0,
    relatedStatMethodName: "구조방정식모형(SEM)",
    relatedMethodName: "구조방정식모형(SEM)",
    explanation:
      "다항목 잠재변인의 측정모형(CFA)과 인과 경로를 동시에 추정하고 적합도를 평가했으므로 구조방정식모형(SEM)이다.",
  },
  {
    seedKey: "dx:statistics:psg:2",
    type: "passage",
    area: "statistics",
    cognitiveLevel: "apply",
    passage:
      "본 연구는 LMS 로그 데이터를 활용해 온라인 학습자의 기말 학업성취를 예측하고자 하였다. 예측변인으로 주당 접속시간, 동영상 시청 완료율, 토론 게시글 수, 과제 제출 적시성(모두 연속형)을 투입하였고, 종속변인은 기말 총점(연속형)이었다. 각 예측변인의 표준화 회귀계수(β)를 보고하여 상대적 설명력을 비교하였다.",
    question:
      "위 가상 연구에 사용된 통계 분석으로 가장 적절한 것은?",
    options: [
      "다중회귀분석",
      "로지스틱회귀분석",
      "일원분산분석(ANOVA)",
      "확인적 요인분석(CFA)",
    ],
    answerIndex: 0,
    relatedStatMethodName: "다중회귀분석",
    relatedMethodName: "설문조사연구",
    explanation:
      "연속형 종속변인 1개를 연속형 예측변인 여러 개로 예측하고 표준화계수로 설명력을 비교했으므로 다중회귀분석이다.",
  },
  // ── (b) 한계·누락요소 식별 (evaluate) ──
  {
    seedKey: "dx:method:psg:2",
    type: "passage",
    area: "method",
    cognitiveLevel: "analyze",
    passage:
      "한 연구는 '게이미피케이션 적용 수업'이 학습몰입을 높인다고 주장하였다. 연구자는 자신이 가르치는 한 학급에 게이미피케이션 수업을 8주간 적용한 뒤 사후 학습몰입 점수가 높게 나타났다고 보고하였다. 그러나 비교집단을 두지 않았고, 사전점수도 측정하지 않았으며, 처치 전후 다른 학교 행사나 성숙 효과는 고려되지 않았다.",
    question:
      "위 가상 연구의 인과적 결론을 가장 크게 위협하는 설계상 한계는?",
    options: [
      "비교집단과 사전측정이 없어 처치 외 요인(성숙·역사 등)을 배제할 수 없다",
      "표본의 성별 비율을 보고하지 않았다",
      "통계 소프트웨어 종류를 명시하지 않았다",
      "학습몰입 척도의 출판연도가 오래되었다",
    ],
    answerIndex: 0,
    relatedMethodName: "준실험연구",
    explanation:
      "단일집단 사후설계는 비교집단·사전측정이 없어 성숙·역사 등 내적타당도 위협을 통제하지 못한다. 이것이 인과 추론을 가장 크게 위협한다.",
  },
  {
    seedKey: "dx:statistics:psg:3",
    type: "passage",
    area: "statistics",
    cognitiveLevel: "analyze",
    passage:
      "한 척도개발 연구는 '디지털 시민성' 측정도구를 새로 개발하였다. 연구자는 30개 문항을 구성한 뒤 곧바로 본조사를 실시하고, 전체 문항의 Cronbach α가 .91로 높다는 점만을 근거로 도구의 타당성을 주장하였다. 요인구조에 대한 탐색적·확인적 요인분석이나 다른 척도와의 상관(준거타당도)은 제시되지 않았다.",
    question:
      "위 가상 척도개발 연구에서 '타당도' 측면에서 가장 핵심적으로 누락된 절차는?",
    options: [
      "요인분석을 통한 구인타당도 검증(및 준거타당도)",
      "응답자 수를 1,000명 이상으로 늘리는 것",
      "문항을 모두 역채점 문항으로 바꾸는 것",
      "결과를 그래프 대신 표로 제시하는 것",
    ],
    answerIndex: 0,
    relatedMethodName: "측정도구 개발과 타당화",
    relatedStatMethodName: "확인적 요인분석(CFA)",
    explanation:
      "Cronbach α는 신뢰도(내적 일관성) 지표일 뿐 타당도를 보장하지 않는다. 구인타당도(요인분석)와 준거타당도 검증이 누락되어 타당성 주장이 약하다.",
  },
  {
    seedKey: "dx:statistics:psg:4",
    type: "passage",
    area: "statistics",
    cognitiveLevel: "analyze",
    passage:
      "한 연구는 '교사 자율성 지지'가 '학업참여'에 미치는 영향을 '학습동기'가 매개한다고 주장하였다. 그러나 분석에서는 자율성 지지와 학업참여의 단순 상관계수(r=.42, p<.01)만 제시하였을 뿐, 학습동기를 투입한 매개효과(간접효과)는 통계적으로 검증하지 않았다.",
    question:
      "위 가상 연구가 '매개효과'를 주장하기 위해 반드시 보완해야 하는 분석은?",
    options: [
      "학습동기를 매개변인으로 투입한 간접효과 검증(SEM·부트스트래핑 등)",
      "두 변인의 상관계수를 한 번 더 계산하는 것",
      "응답자의 학년을 통제변인으로 추가하는 것",
      "기술통계의 평균과 표준편차를 다시 보고하는 것",
    ],
    answerIndex: 0,
    relatedStatMethodName: "구조방정식모형(SEM)",
    relatedMethodName: "구조방정식모형(SEM)",
    explanation:
      "단순 상관만으로는 매개를 입증할 수 없다. 매개변인을 투입해 간접효과(SEM 경로·부트스트래핑)를 유의성 검정해야 매개 주장이 성립한다.",
  },

  // ═════════════════════════════════════════════════════════════
  // 연구모형 도형 (diagram) — 인라인 SVG 연구모형을 보고 모형 유형·적합 분석 식별.
  // svg 는 코드로 그린 박스+화살표(외부 이미지 금지). 다크모드 대응: stroke/fill=currentColor,
  // 컨테이너에 text-foreground 적용 가정. viewBox 좌표계로 박스(rect)·라벨(text)·화살표(line+marker).
  // 채점은 mcq 동일(answerIndex). relatedStatMethodName 으로 졸업생 논문 연계 메타 남김.
  // ═════════════════════════════════════════════════════════════
  {
    seedKey: "dx:statistics:dgm:1",
    type: "diagram",
    area: "statistics",
    cognitiveLevel: "analyze",
    svg: `<svg viewBox="0 0 420 120" role="img" aria-label="독립변인에서 매개변인을 거쳐 종속변인으로 가는 매개모형" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;color:currentColor">
  <defs>
    <marker id="dgm1-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="8" y="42" width="110" height="38" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="63" y="66" text-anchor="middle" font-size="13" fill="currentColor">플립러닝(X)</text>
  <rect x="156" y="42" width="108" height="38" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="210" y="66" text-anchor="middle" font-size="13" fill="currentColor">학습몰입(M)</text>
  <rect x="302" y="42" width="110" height="38" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="357" y="66" text-anchor="middle" font-size="13" fill="currentColor">학업성취(Y)</text>
  <line x1="120" y1="61" x2="154" y2="61" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm1-arrow)"/>
  <line x1="266" y1="61" x2="300" y2="61" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm1-arrow)"/>
</svg>`,
    question: "위 연구모형 도형이 나타내는 모형의 유형은?",
    options: ["매개모형", "조절모형", "조절된 매개모형", "단순 상관모형"],
    answerIndex: 0,
    relatedStatMethodName: "구조방정식모형(SEM)",
    explanation:
      "독립변인(X)→매개변인(M)→종속변인(Y)로 영향이 순차 전달되는 구조는 매개모형이다. M 이 X 와 Y 를 잇는 경로 위에 위치한다.",
  },
  {
    seedKey: "dx:statistics:dgm:2",
    type: "diagram",
    area: "statistics",
    cognitiveLevel: "apply",
    svg: `<svg viewBox="0 0 420 120" role="img" aria-label="독립변인에서 매개변인을 거쳐 종속변인으로 가는 매개모형" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;color:currentColor">
  <defs>
    <marker id="dgm2-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="8" y="42" width="120" height="38" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="68" y="66" text-anchor="middle" font-size="13" fill="currentColor">자기효능감(X)</text>
  <rect x="160" y="42" width="100" height="38" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="210" y="66" text-anchor="middle" font-size="13" fill="currentColor">학습동기(M)</text>
  <rect x="300" y="42" width="112" height="38" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="356" y="66" text-anchor="middle" font-size="13" fill="currentColor">학업성취(Y)</text>
  <line x1="128" y1="61" x2="158" y2="61" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm2-arrow)"/>
  <line x1="260" y1="61" x2="298" y2="61" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm2-arrow)"/>
</svg>`,
    question: "위 매개모형(X→M→Y)에서 매개효과(간접효과)를 검증하는 데 가장 적합한 분석은?",
    options: [
      "부트스트래핑을 통한 간접효과 검증(SEM·PROCESS)",
      "독립표본 t-검정",
      "탐색적 요인분석(EFA)",
      "카이제곱 검정",
    ],
    answerIndex: 0,
    relatedStatMethodName: "구조방정식모형(SEM)",
    explanation:
      "매개효과(간접효과 a×b)의 유의성은 부트스트래핑으로 신뢰구간을 추정하는 방식(SEM 경로·PROCESS 매크로)이 표준이다. t-검정·EFA·카이제곱은 매개 검증 도구가 아니다.",
  },
  {
    seedKey: "dx:statistics:dgm:3",
    type: "diagram",
    area: "statistics",
    cognitiveLevel: "analyze",
    svg: `<svg viewBox="0 0 420 150" role="img" aria-label="독립변인에서 종속변인으로 가는 경로에 조절변인이 작용하는 조절모형" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;color:currentColor">
  <defs>
    <marker id="dgm3-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="14" y="58" width="120" height="38" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="74" y="82" text-anchor="middle" font-size="13" fill="currentColor">피드백 유형(X)</text>
  <rect x="286" y="58" width="120" height="38" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="346" y="82" text-anchor="middle" font-size="13" fill="currentColor">학업성취(Y)</text>
  <rect x="160" y="8" width="100" height="34" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="210" y="30" text-anchor="middle" font-size="13" fill="currentColor">사전지식(W)</text>
  <line x1="134" y1="77" x2="284" y2="77" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm3-arrow)"/>
  <line x1="210" y1="42" x2="210" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm3-arrow)"/>
</svg>`,
    question: "위 연구모형 도형(조절변인 W 가 X→Y 경로에 작용)이 나타내는 모형의 유형은?",
    options: ["조절모형", "매개모형", "단순 인과경로모형", "측정모형"],
    answerIndex: 0,
    relatedStatMethodName: "다중회귀분석",
    explanation:
      "조절변인(W)이 독립변인(X)→종속변인(Y) 경로의 강도·방향에 영향을 주는 구조는 조절모형이다. W 가 X→Y 경로(화살표) 자체를 가리킨다는 점이 매개모형과 다르다.",
  },
  {
    seedKey: "dx:statistics:dgm:4",
    type: "diagram",
    area: "statistics",
    cognitiveLevel: "apply",
    svg: `<svg viewBox="0 0 420 150" role="img" aria-label="독립변인에서 종속변인으로 가는 경로에 조절변인이 작용하는 조절모형" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;color:currentColor">
  <defs>
    <marker id="dgm4-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="14" y="58" width="120" height="38" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="74" y="82" text-anchor="middle" font-size="13" fill="currentColor">협력학습(X)</text>
  <rect x="286" y="58" width="120" height="38" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="346" y="82" text-anchor="middle" font-size="13" fill="currentColor">문제해결력(Y)</text>
  <rect x="160" y="8" width="100" height="34" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="210" y="30" text-anchor="middle" font-size="13" fill="currentColor">자기효능감(W)</text>
  <line x1="134" y1="77" x2="284" y2="77" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm4-arrow)"/>
  <line x1="210" y1="42" x2="210" y2="75" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm4-arrow)"/>
</svg>`,
    question: "위 조절모형(W 가 X→Y 경로를 조절)을 검증할 때 가장 적합한 분석은?",
    options: [
      "상호작용항을 투입한 위계적 회귀분석",
      "부트스트래핑 간접효과 검증",
      "일원분산분석(ANOVA)",
      "신뢰도(Cronbach α) 분석",
    ],
    answerIndex: 0,
    relatedStatMethodName: "다중회귀분석",
    explanation:
      "조절효과는 독립변인×조절변인의 상호작용항을 위계적 회귀에 추가로 투입해 설명량 증가(ΔR²)와 상호작용항의 유의성으로 검증한다. 부트스트래핑 간접효과는 매개 검증용이다.",
  },
  {
    seedKey: "dx:statistics:dgm:5",
    type: "diagram",
    area: "statistics",
    cognitiveLevel: "analyze",
    svg: `<svg viewBox="0 0 440 170" role="img" aria-label="잠재변인 두 개를 관측문항으로 측정하고 잠재변인 간 경로를 추정하는 구조방정식 경로도" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;color:currentColor">
  <defs>
    <marker id="dgm5-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <ellipse cx="110" cy="85" rx="58" ry="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="110" y="90" text-anchor="middle" font-size="13" fill="currentColor">학습실재감</text>
  <ellipse cx="330" cy="85" rx="58" ry="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="330" y="90" text-anchor="middle" font-size="13" fill="currentColor">학습만족도</text>
  <line x1="168" y1="85" x2="270" y2="85" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm5-arrow)"/>
  <rect x="22" y="6" width="48" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <text x="46" y="23" text-anchor="middle" font-size="10" fill="currentColor">문항1</text>
  <rect x="86" y="6" width="48" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <text x="110" y="23" text-anchor="middle" font-size="10" fill="currentColor">문항2</text>
  <rect x="150" y="6" width="48" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <text x="174" y="23" text-anchor="middle" font-size="10" fill="currentColor">문항3</text>
  <line x1="110" y1="55" x2="60" y2="33" stroke="currentColor" stroke-width="1.2" marker-end="url(#dgm5-arrow)"/>
  <line x1="110" y1="55" x2="110" y2="33" stroke="currentColor" stroke-width="1.2" marker-end="url(#dgm5-arrow)"/>
  <line x1="110" y1="55" x2="172" y2="33" stroke="currentColor" stroke-width="1.2" marker-end="url(#dgm5-arrow)"/>
</svg>`,
    question:
      "위 경로도(타원=잠재변인, 사각형=관측문항)처럼 측정모형과 잠재변인 간 인과경로를 동시에 추정·검증하는 분석은?",
    options: [
      "구조방정식모형(SEM)",
      "독립표본 t-검정",
      "군집분석",
      "단순회귀분석",
    ],
    answerIndex: 0,
    relatedStatMethodName: "구조방정식모형(SEM)",
    explanation:
      "타원(잠재변인)을 관측문항으로 측정하는 측정모형과 잠재변인 간 경로(구조모형)를 동시에 추정·평가하는 분석은 구조방정식모형(SEM)이다.",
  },
  {
    seedKey: "dx:method:dgm:1",
    type: "diagram",
    area: "method",
    cognitiveLevel: "analyze",
    svg: `<svg viewBox="0 0 440 170" role="img" aria-label="실험집단과 통제집단에 각각 사전검사 처치 사후검사를 배치한 2집단 사전사후 설계 도식" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;color:currentColor">
  <defs>
    <marker id="dgm6-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="14" y="50" font-size="12" fill="currentColor">실험집단</text>
  <text x="14" y="120" font-size="12" fill="currentColor">통제집단</text>
  <rect x="80" y="28" width="76" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="118" y="49" text-anchor="middle" font-size="12" fill="currentColor">사전검사</text>
  <rect x="196" y="28" width="76" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="234" y="49" text-anchor="middle" font-size="12" fill="currentColor">처치 O</text>
  <rect x="312" y="28" width="76" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="350" y="49" text-anchor="middle" font-size="12" fill="currentColor">사후검사</text>
  <rect x="80" y="98" width="76" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="118" y="119" text-anchor="middle" font-size="12" fill="currentColor">사전검사</text>
  <rect x="196" y="98" width="76" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="234" y="119" text-anchor="middle" font-size="12" fill="currentColor">처치 X</text>
  <rect x="312" y="98" width="76" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="350" y="119" text-anchor="middle" font-size="12" fill="currentColor">사후검사</text>
  <line x1="156" y1="45" x2="194" y2="45" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm6-arrow)"/>
  <line x1="272" y1="45" x2="310" y2="45" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm6-arrow)"/>
  <line x1="156" y1="115" x2="194" y2="115" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm6-arrow)"/>
  <line x1="272" y1="115" x2="310" y2="115" stroke="currentColor" stroke-width="1.5" marker-end="url(#dgm6-arrow)"/>
</svg>`,
    question:
      "위 설계 도식(실험·통제 두 집단에 사전검사→처치(O/X)→사후검사)이 나타내는 연구설계는?",
    options: [
      "이질통제집단 사전-사후검사 설계",
      "단일집단 사후검사 설계",
      "시계열 설계",
      "솔로몬 4집단 설계",
    ],
    answerIndex: 0,
    relatedMethodName: "준실험연구",
    explanation:
      "두 집단(실험·통제) 모두 사전검사 후 한 집단만 처치하고 양쪽 모두 사후검사하는 구조는 (이질)통제집단 사전-사후검사 설계다. 무선할당이 없으면 준실험에 해당한다.",
  },
];

export interface DiagnosticSeedResult {
  created: number;
  skipped: number;
}

/**
 * 문항의 중복 판별 키 — `유형|본문` 형식. mcq·ordering 은 question, term 은 prompt 를
 * 본문으로 사용한다. 유형을 키에 포함해 같은 줄기(stem)라도 객관식/단어맞추기가
 * 서로 다른 문항으로 인식되도록 한다(예: 실험연구 mcq vs term 공존).
 */
function identityKey(q: {
  type?: DiagnosticQuestion["type"];
  question?: string;
  prompt?: string;
  statement?: string;
  passage?: string;
}): string {
  const t = questionType(q);
  // 본문 텍스트: term=prompt, ox=statement, passage=지문+질문(지문 공유 문항 구분), 그 외=question
  const text =
    t === "term"
      ? q.prompt
      : t === "ox"
        ? q.statement
        : t === "passage"
          ? `${q.passage ?? ""}::${q.question ?? ""}`
          : q.question;
  return `${t}|${(text ?? "").trim()}`;
}

/**
 * 동일 문항(question·prompt 텍스트 매칭)은 스킵하고 나머지를 published=true 로
 * 일괄 생성한다. 검수 완료된 객관적 문항만 시드에 포함하므로 연구방법·통계방법
 * 가이드와 달리 즉시 공개한다. 유형(type)·유형별 필드(items·prompt·answer 등)를
 * 함께 적재해 mcq·ordering·term 3종을 모두 지원한다.
 *
 * 개념 문항의 conceptId 는 호출부에서 seedKey→실제 conceptId 매핑을 주입한다
 * (없으면 conceptId 미설정 — 약점 링크만 생략되고 채점·준비도는 정상 동작).
 */
export async function seedDiagnosticQuestions(
  userId: string,
  existing: DiagnosticQuestion[],
  conceptIdBySeedKey?: Record<string, string>,
): Promise<DiagnosticSeedResult> {
  const existingKeys = new Set(existing.map((q) => identityKey(q)));
  let created = 0;
  let skipped = 0;
  for (const entry of SEED_DIAGNOSTIC_QUESTIONS) {
    if (existingKeys.has(identityKey(entry))) {
      skipped += 1;
      continue;
    }
    const conceptId = entry.conceptSeedKey
      ? conceptIdBySeedKey?.[entry.conceptSeedKey]
      : undefined;
    // undefined 필드는 보내지 않도록 정리(유형별 미사용 필드 제외).
    const payload: Record<string, unknown> = {
      type: questionType(entry),
      area: entry.area,
      explanation: entry.explanation,
      conceptId,
      published: true,
      createdBy: userId,
    };
    if (entry.cognitiveLevel !== undefined) payload.cognitiveLevel = entry.cognitiveLevel;
    if (entry.question !== undefined) payload.question = entry.question;
    if (entry.options !== undefined) payload.options = entry.options;
    if (entry.answerIndex !== undefined) payload.answerIndex = entry.answerIndex;
    if (entry.items !== undefined) payload.items = entry.items;
    if (entry.prompt !== undefined) payload.prompt = entry.prompt;
    if (entry.answer !== undefined) payload.answer = entry.answer;
    if (entry.acceptedAnswers !== undefined)
      payload.acceptedAnswers = entry.acceptedAnswers;
    if (entry.statement !== undefined) payload.statement = entry.statement;
    if (entry.answerBool !== undefined) payload.answerBool = entry.answerBool;
    if (entry.leftItems !== undefined) payload.leftItems = entry.leftItems;
    if (entry.rightItems !== undefined) payload.rightItems = entry.rightItems;
    if (entry.correctMap !== undefined) payload.correctMap = entry.correctMap;
    if (entry.passage !== undefined) payload.passage = entry.passage;
    if (entry.svg !== undefined) payload.svg = entry.svg;
    if (entry.relatedMethodName !== undefined)
      payload.relatedMethodName = entry.relatedMethodName;
    if (entry.relatedStatMethodName !== undefined)
      payload.relatedStatMethodName = entry.relatedStatMethodName;
    await diagnosticQuestionsApi.create(payload);
    created += 1;
  }
  return { created, skipped };
}
