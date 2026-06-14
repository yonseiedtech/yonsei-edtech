// 진단평가 기본 문항 시드 (published: true 로 적재 — 검수 완료된 객관적 문항만 포함)
//
// 대학원생이 아카이브 개념(통계방법·연구방법·교육공학 핵심개념)을 얼마나 아는지
// 진단하는 4지선다 객관식. 영역별 6~8문항.
//
// ⚠️ 저작권·정확성 원칙 ⚠️
//  - 학자 원설명/척도 문항을 그대로 복제하지 않는다. 객관적 서술로 변형.
//  - 검증 가능한 명백한 정의·구성요소·표준 프레임워크만 출제. 애매하면 제외(보수적).
//  - 출처: src/lib/statistical-methods-seed.ts (통계), src/lib/research-methods-seed.ts (연구방법),
//    src/lib/archive-seed.ts SEED_CONCEPTS (개념). 모두 영문 정전 교과서 기반 정의 활용.
//
// 개념 문항은 conceptSeedKey 로 아카이브 개념(archive_concepts.seedKey)과 연결한다.
// 런타임에 seedKey → 실제 문서 id 를 매핑해 약점 개념을 /archive/concept/[id] 로 링크.

import { diagnosticQuestionsApi } from "./bkend";
import type { DiagnosticArea, DiagnosticQuestion } from "@/types";

export interface SeedDiagnosticQuestion {
  /** 시드 멱등성 키. `dx:{area}:{n}` 형식 — 재시드 시 동일 문항 인식. */
  seedKey: string;
  area: DiagnosticArea;
  /** archive_concepts.seedKey (개념 영역 문항만). 런타임에 실제 conceptId 로 변환. */
  conceptSeedKey?: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

export const SEED_DIAGNOSTIC_QUESTIONS: SeedDiagnosticQuestion[] = [
  // ─────────────────────────────────────────────────────────────
  // 통계방법 (statistics) — 10문항. 출처: statistical-methods-seed.ts
  // ─────────────────────────────────────────────────────────────
  {
    seedKey: "dx:statistics:1",
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
    area: "statistics",
    question: "종속변수가 '합격/불합격'처럼 이분형일 때 그 발생 확률을 예측하는 회귀 기법은?",
    options: ["다중회귀분석", "로지스틱회귀분석", "정준상관분석", "MANOVA"],
    answerIndex: 1,
    explanation:
      "로지스틱회귀분석은 이분형(또는 다항) 종속변수의 발생 확률을 독립변수들로 예측하는 일반화선형모형 기반 기법이다. 다중회귀는 연속형 종속변수에 사용한다.",
  },
  {
    seedKey: "dx:statistics:4",
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
    area: "method",
    question: "다음 중 일반적으로 '질적 연구 방법'으로 분류되는 것은?",
    options: ["설문조사연구", "사례연구", "다중회귀분석", "실험연구"],
    answerIndex: 1,
    explanation:
      "사례연구는 소수 사례를 다양한 자료원으로 심층·맥락적으로 분석하는 질적 연구 방법이다. 설문조사·실험연구는 양적, 회귀분석은 통계기법이다.",
  },
  {
    seedKey: "dx:method:8",
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
    area: "concept",
    conceptSeedKey: "concept:adaptive-learning",
    question:
      "학습자의 사전지식·수행·선호 데이터에 기반해 콘텐츠·난이도·학습 경로를 실시간으로 개인화하는 학습 시스템은?",
    options: ["적응학습", "협력학습", "플립러닝", "게이미피케이션"],
    answerIndex: 0,
    explanation:
      "적응학습(adaptive learning)은 학습자 데이터에 기반해 콘텐츠·난이도·경로·피드백을 실시간 개인화하며, 지능형 튜터링 시스템(ITS)이 기술 기반이다.",
  },
];

export interface DiagnosticSeedResult {
  created: number;
  skipped: number;
}

/**
 * 동일 문항(seedKey 매칭, 없으면 question 텍스트 매칭)은 스킵하고 나머지를
 * published=true 로 일괄 생성한다. 검수 완료된 객관적 문항만 시드에 포함하므로
 * 연구방법·통계방법 가이드와 달리 즉시 공개한다.
 *
 * 개념 문항의 conceptId 는 호출부에서 seedKey→실제 conceptId 매핑을 주입한다
 * (없으면 conceptId 미설정 — 약점 링크만 생략되고 채점·준비도는 정상 동작).
 */
export async function seedDiagnosticQuestions(
  userId: string,
  existing: DiagnosticQuestion[],
  conceptIdBySeedKey?: Record<string, string>,
): Promise<DiagnosticSeedResult> {
  const existingQuestions = new Set(existing.map((q) => q.question.trim()));
  let created = 0;
  let skipped = 0;
  for (const entry of SEED_DIAGNOSTIC_QUESTIONS) {
    if (existingQuestions.has(entry.question.trim())) {
      skipped += 1;
      continue;
    }
    const conceptId = entry.conceptSeedKey
      ? conceptIdBySeedKey?.[entry.conceptSeedKey]
      : undefined;
    await diagnosticQuestionsApi.create({
      area: entry.area,
      question: entry.question,
      options: entry.options,
      answerIndex: entry.answerIndex,
      explanation: entry.explanation,
      conceptId,
      published: true,
      createdBy: userId,
    });
    created += 1;
  }
  return { created, skipped };
}
