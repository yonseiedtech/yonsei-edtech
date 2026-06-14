// 진단평가 문제은행 시드 (published: true 로 적재 — 검수 완료된 객관적 문항만 포함)
//
// 대학원생이 아카이브 개념(통계방법·연구방법·교육공학 핵심개념)을 얼마나 아는지
// 진단하는 문제은행. 3유형 혼합:
//  - mcq      : 4지선다 객관식 (options·answerIndex)
//  - ordering : 절차 순서 정렬 (items 를 정답 순서로 저장, 런타임에 셔플해 제시)
//  - term     : 단어 맞추기 (prompt 정의 → answer 개념명, acceptedAnswers 동의어)
// 외부 LLM 없이 검증된 정의·표준 절차로 대량 생성하고, 런타임에 영역별 랜덤 출제한다.
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
  /** mcq·ordering·compare·scenario 의 문제 본문. term 은 prompt, ox 는 statement 사용. */
  question?: string;
  /** [mcq·compare·scenario] 보기 */
  options?: string[];
  /** [mcq·compare·scenario] 정답 인덱스 */
  answerIndex?: number;
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
    explanation:
      "자료에 근거해 코딩과 지속적 비교로 이론을 생성하는 목적에는 근거이론(Grounded Theory)이 적합하다.",
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
}): string {
  const t = questionType(q);
  // 본문 텍스트: term=prompt, ox=statement, 그 외=question
  const text =
    (t === "term" ? q.prompt : t === "ox" ? q.statement : q.question) ?? "";
  return `${t}|${text.trim()}`;
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
    await diagnosticQuestionsApi.create(payload);
    created += 1;
  }
  return { created, skipped };
}
