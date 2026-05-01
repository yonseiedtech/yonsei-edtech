/**
 * 교육공학 아카이브 기본 시드 데이터
 *
 * KCI 등재 한국 교육공학·교육심리 논문을 기준으로 정리한
 * 대표 개념·변인·측정도구.
 *
 * "/console/archive"의 "기본 시드 불러오기" 버튼이 호출하는 데이터.
 * 동일 이름의 항목이 이미 있으면 건너뜀 (중복 방지).
 */

import type {
  ArchiveConcept,
  ArchiveMeasurementTool,
  ArchiveVariable,
} from "@/types";
import {
  archiveConceptsApi,
  archiveMeasurementsApi,
  archiveVariablesApi,
} from "@/lib/bkend";

export interface SeedConcept {
  name: string;
  description: string;
  altNames?: string[];
  tags?: string[];
  references?: string[];
}

export interface SeedVariable {
  name: string;
  description: string;
  type?: ArchiveVariable["type"];
  altNames?: string[];
  tags?: string[];
  references?: string[];
}

export interface SeedMeasurement {
  name: string;
  description: string;
  originalName?: string;
  author?: string;
  itemCount?: number;
  scaleType?: string;
  reliability?: string;
  validity?: string;
  sampleItems?: string[];
  resourceUrl?: string;
  altNames?: string[];
  tags?: string[];
  references?: string[];
}

// ─── 개념 (Concepts) ─────────────────────────────────────────
export const SEED_CONCEPTS: SeedConcept[] = [
  {
    name: "자기효능감",
    altNames: ["Self-efficacy", "자기효능감 신념"],
    description:
      "Bandura(1977, 1997)가 제안한 사회인지이론의 핵심 구인으로, 특정 과제를 수행하기 위해 요구되는 행동을 조직하고 실행할 수 있는 자신의 능력에 대한 신념을 의미한다. 학습 상황에서는 학업적 자기효능감(academic self-efficacy)으로 구체화되며, 학습 동기·성취·지속성에 영향을 미치는 핵심 매개 변인으로 다수의 한국 교육공학 연구에서 다뤄졌다.",
    tags: ["동기", "사회인지이론", "정의적 영역"],
    references: [
      "Bandura, A. (1997). Self-efficacy: The exercise of control. W.H. Freeman.",
      "김아영 (2007). 학업적 자기효능감 척도 개발 및 타당화 연구. 교육심리연구, 21(4), 1145-1167.",
      "김아영, 박인영 (2001). 학업적 자기효능감 척도 개발 및 타당화 연구. 교육학연구, 39(1), 95-123.",
    ],
  },
  {
    name: "학습동기",
    altNames: ["Learning Motivation", "학업동기"],
    description:
      "학습 행동을 시작·유지·종결하게 만드는 내적·외적 추동의 총칭. Keller(1987)의 ARCS 모형(주의-관련성-자신감-만족감)이 교수설계 영역의 표준 프레임으로 자리 잡았으며, 한국 교육공학 연구에서는 자기결정성 이론(SDT) 기반 내재적/외재적 동기 구분이 함께 사용된다.",
    tags: ["동기", "ARCS", "자기결정성"],
    references: [
      "Keller, J. M. (1987). Development and use of the ARCS model of instructional design. Journal of Instructional Development, 10(3), 2-10.",
      "봉미미, 김혜연, 신지연, 이수현, 이화숙 (2008). 한국형 학업동기 척도 개발 및 타당화. 교육심리연구, 22(4), 815-839.",
      "김아영 (2010). 자기결정성이론과 한국 학생들의 학업 동기. 한국심리학회지: 학교, 7(1), 1-18.",
    ],
  },
  {
    name: "인지부하",
    altNames: ["Cognitive Load", "정신적 부하"],
    description:
      "Sweller(1988, 1994)의 인지부하이론(Cognitive Load Theory, CLT)에서 비롯된 개념으로, 학습 과제 수행 중 작업기억에 부과되는 정신적 처리 요구량을 의미한다. 내재적(intrinsic)·외재적(extraneous)·본유적(germane) 부하로 구분되며, 멀티미디어 학습 설계 원리(Mayer)와 직결되어 한국 교육공학 연구에서 활발히 적용된다.",
    tags: ["인지", "멀티미디어 학습", "교수설계"],
    references: [
      "Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257-285.",
      "이상수 (2008). 멀티미디어 학습환경에서 인지부하 측정과 활용에 관한 연구. 교육공학연구, 24(2), 1-26.",
      "유영만, 김민정 (2010). 멀티미디어 학습원리에 대한 인지부하이론적 접근. 교육공학연구, 26(2), 1-22.",
    ],
  },
  {
    name: "메타인지",
    altNames: ["Metacognition", "초인지"],
    description:
      "Flavell(1979)이 제안한 '인지에 대한 인지'로, 자신의 학습 과정을 모니터링·계획·조절하는 능력. 메타인지 지식(knowledge)과 메타인지 조절(regulation)로 구분되며, 자기조절학습의 핵심 구성 요소로 다뤄진다. 한국 교육공학 연구에서는 디지털 학습환경에서의 메타인지 스캐폴딩 설계 연구가 활발하다.",
    tags: ["인지", "자기조절", "고차사고"],
    references: [
      "Flavell, J. H. (1979). Metacognition and cognitive monitoring: A new area of cognitive-developmental inquiry. American Psychologist, 34(10), 906-911.",
      "신종호, 진성희 (2009). 학습자의 메타인지 활동 지원을 위한 시스템 설계 원리. 교육공학연구, 25(4), 167-198.",
    ],
  },
  {
    name: "자기조절학습",
    altNames: ["Self-Regulated Learning", "SRL"],
    description:
      "Zimmerman(1989, 2000)이 체계화한 학습자가 자신의 학습 목표 달성을 위해 인지·정의·행동을 능동적으로 조절하는 과정. 사전계획(forethought)·수행(performance)·자기성찰(self-reflection)의 3단계 순환 모형이 표준이며, 디지털 학습환경 자기조절 지원 도구·LMS 행동 데이터 분석의 이론적 근거로 사용된다.",
    tags: ["자기조절", "학습전략", "메타인지"],
    references: [
      "Zimmerman, B. J. (2000). Attaining self-regulation: A social cognitive perspective. In M. Boekaerts et al. (Eds.), Handbook of self-regulation (pp. 13-39). Academic Press.",
      "양명희 (2002). 자기조절학습의 모형 탐색과 학업 성취와의 관계 연구. 서울대학교 박사학위논문.",
      "정한호 (2008). 자기조절학습이 학업성취에 미치는 영향에 관한 메타분석. 교육공학연구, 24(3), 277-302.",
    ],
  },
  {
    name: "학습몰입",
    altNames: ["Learning Flow", "Engagement"],
    description:
      "Csikszentmihalyi(1990)의 몰입(flow) 이론을 학습 맥락으로 확장한 개념. 도전과 능력의 균형, 명확한 목표, 즉각적 피드백 조건 하에서 학습자가 활동에 깊이 몰두하는 최적 경험 상태. 한국 교육공학 연구에서는 게이미피케이션·이러닝·VR 학습환경 설계의 효과 측정 지표로 빈번히 사용된다.",
    tags: ["몰입", "최적경험", "정의적 영역"],
    references: [
      "Csikszentmihalyi, M. (1990). Flow: The psychology of optimal experience. Harper & Row.",
      "석임복 (2007). 학습 몰입의 구성 요인, 수준, 관련 변인 탐색. 경북대학교 박사학위논문.",
      "김진호 (2003). 학습몰입의 이론적 고찰과 측정 도구 개발. 교육심리연구, 17(4), 363-381.",
    ],
  },
  {
    name: "테크놀로지 수용",
    altNames: ["Technology Acceptance", "TAM"],
    description:
      "Davis(1989)가 제안한 기술수용모형(Technology Acceptance Model)에서 비롯된 구인. 지각된 유용성(PU)과 지각된 사용 용이성(PEU)이 사용 의도와 실제 사용 행동을 예측한다. 한국 교육공학 연구에서는 LMS·MOOC·AI 튜터·메타버스 학습환경 도입 연구의 이론적 기반으로 광범위하게 활용된다.",
    tags: ["에듀테크", "수용성", "사용 의도"],
    references: [
      "Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319-340.",
      "이종연 (2014). 대학생의 모바일 러닝 수용에 영향을 미치는 요인 연구. 교육공학연구, 30(2), 207-235.",
      "임걸 (2011). 스마트러닝 수용 의도에 영향을 미치는 요인. 교육공학연구, 27(4), 749-775.",
    ],
  },
  {
    name: "협력학습",
    altNames: ["Collaborative Learning", "Cooperative Learning"],
    description:
      "Johnson & Johnson(1989), Slavin(1995) 등이 체계화한 학습자들이 공동의 목표를 위해 상호의존적으로 활동하는 학습 형태. 긍정적 상호의존성·개별 책무성·면대면 상호작용·사회적 기술·집단 처리의 5요소를 포함한다. 한국 교육공학에서는 CSCL(Computer-Supported Collaborative Learning) 설계 연구로 확장되었다.",
    tags: ["협력", "CSCL", "사회적 학습"],
    references: [
      "Johnson, D. W., & Johnson, R. T. (1989). Cooperation and competition: Theory and research. Interaction Book Company.",
      "이수정, 강명희 (2015). 협력적 문제해결 능력 측정 도구 개발 및 타당화. 교육공학연구, 31(4), 711-743.",
      "강명희, 임병노 (2009). CSCL 환경에서 협력학습 효과에 영향을 미치는 요인. 교육공학연구, 25(3), 53-88.",
    ],
  },
];

// ─── 변인 (Variables) ─────────────────────────────────────────
export const SEED_VARIABLES: SeedVariable[] = [
  {
    name: "학업적 자기효능감",
    altNames: ["Academic Self-Efficacy"],
    description:
      "학업 과제를 성공적으로 수행할 수 있다는 학습자의 신념. 자신감·자기조절효능감·과제난이도선호의 하위 요인으로 구성되며, 학업성취도·학습몰입·학습 지속성과 정적 상관을 보이는 대표적 정의적 학습 변인.",
    type: "affective",
    tags: ["자기효능감", "동기"],
    references: [
      "김아영 (2007). 학업적 자기효능감 척도 개발 및 타당화 연구. 교육심리연구, 21(4), 1145-1167.",
    ],
  },
  {
    name: "내재적 동기",
    altNames: ["Intrinsic Motivation"],
    description:
      "활동 자체에서 오는 즐거움·흥미·도전감 때문에 행동을 수행하는 동기. 자기결정성이론(Deci & Ryan, 2000)의 자율성·유능성·관계성 욕구 충족과 관련된다. 학업성취·학습몰입과 강한 정적 관계를 보인다.",
    type: "affective",
    tags: ["동기", "자기결정성"],
    references: [
      "Deci, E. L., & Ryan, R. M. (2000). The 'what' and 'why' of goal pursuits. Psychological Inquiry, 11(4), 227-268.",
      "이명희, 김아영 (2008). 자기결정성이론에 근거한 한국형 동기 척도 개발. 한국심리학회지: 사회 및 성격, 22(4), 157-174.",
    ],
  },
  {
    name: "학습몰입",
    altNames: ["Learning Engagement", "Flow"],
    description:
      "학습 활동에 깊이 몰두하여 시간 감각이 사라지고 자기의식이 약해지는 최적 경험 상태. 인지적·정의적·행동적 몰입의 다차원 구조로 측정되며, 학업성취·학습 만족도의 핵심 예측 변인.",
    type: "affective",
    tags: ["몰입", "정의적 영역"],
    references: [
      "석임복 (2007). 학습 몰입의 구성 요인, 수준, 관련 변인 탐색. 경북대학교 박사학위논문.",
    ],
  },
  {
    name: "학업성취도",
    altNames: ["Academic Achievement"],
    description:
      "학습 목표 달성 정도를 객관적으로 측정한 결과. 시험 점수·과제 점수·총점·학점 등으로 조작화되며, 거의 모든 교육공학 효과성 연구의 핵심 종속 변인.",
    type: "cognitive",
    tags: ["성취", "결과 변인"],
    references: [],
  },
  {
    name: "학습 만족도",
    altNames: ["Learning Satisfaction"],
    description:
      "학습 경험·내용·방법·환경에 대한 학습자의 정서적 평가. 이러닝·블렌디드 러닝 효과 연구의 표준 결과 변인이며, 학습 지속의도와 강한 정적 상관을 가진다.",
    type: "affective",
    tags: ["만족도", "이러닝"],
    references: [
      "임정훈 (2003). 이러닝 학습 만족도에 영향을 미치는 요인 분석. 교육공학연구, 19(2), 1-26.",
    ],
  },
  {
    name: "자기조절 학습전략",
    altNames: ["Self-Regulated Learning Strategies"],
    description:
      "학습자가 학습 목표 달성을 위해 사용하는 인지적·메타인지적·자원관리 전략의 총체. 시연·정교화·조직화·계획·점검·노력관리 등의 하위 전략으로 측정된다.",
    type: "behavioral",
    tags: ["자기조절", "학습전략"],
    references: [
      "양명희 (2002). 자기조절학습의 모형 탐색과 학업 성취와의 관계 연구. 서울대학교 박사학위논문.",
    ],
  },
  {
    name: "외재적 인지부하",
    altNames: ["Extraneous Cognitive Load", "ECL"],
    description:
      "학습 내용 자체와 무관하게 부적절한 교수 설계나 자료 표상으로 인해 작업기억에 부과되는 추가적 정신 처리 요구. 멀티미디어 학습 설계 원리는 외재적 부하 감축을 핵심 목표로 한다.",
    type: "cognitive",
    tags: ["인지부하", "멀티미디어"],
    references: [
      "Sweller, J., van Merrienboer, J. J. G., & Paas, F. (1998). Cognitive architecture and instructional design. Educational Psychology Review, 10(3), 251-296.",
    ],
  },
  {
    name: "학습 지속의도",
    altNames: ["Continuance Intention", "Continued Use Intention"],
    description:
      "현재의 학습 환경·플랫폼·과정을 향후에도 계속 사용·참여하려는 의도. TAM·ECT(기대확인이론)에 기반하여 측정되며, MOOC·LMS·이러닝 효과성 연구의 핵심 행동 변인.",
    type: "behavioral",
    tags: ["수용성", "이러닝"],
    references: [
      "Bhattacherjee, A. (2001). Understanding information systems continuance: An expectation-confirmation model. MIS Quarterly, 25(3), 351-370.",
    ],
  },
];

// ─── 측정도구 (Measurement Tools) ─────────────────────────────
export const SEED_MEASUREMENTS: SeedMeasurement[] = [
  {
    name: "학업적 자기효능감 척도 (김아영, 2007)",
    altNames: ["Academic Self-Efficacy Scale"],
    description:
      "한국 학습자의 학업적 자기효능감을 측정하기 위해 김아영(2007)이 개발한 KCI 등재 표준 척도. 자신감·자기조절효능감·과제난이도선호의 3개 하위 요인으로 구성되며, 학교급 전반에 걸쳐 사용된다.",
    originalName: "Academic Self-Efficacy Scale (Korean version)",
    author: "김아영 (2007)",
    itemCount: 28,
    scaleType: "5점 또는 6점 Likert",
    reliability: "Cronbach α = .87 (전체) / 하위 요인 .76~.85",
    validity: "확인적 요인분석으로 3요인 구조 검증 (CFI > .90, RMSEA < .08)",
    sampleItems: [
      "나는 어려운 과제도 노력하면 해낼 수 있다.",
      "나는 새로운 학습 내용도 잘 이해할 수 있다.",
      "어려운 문제를 푸는 것이 흥미롭다.",
    ],
    tags: ["자기효능감", "한국형", "KCI"],
    references: [
      "김아영 (2007). 학업적 자기효능감 척도 개발 및 타당화 연구. 교육심리연구, 21(4), 1145-1167.",
    ],
  },
  {
    name: "MSLQ (학습동기·전략 검사)",
    altNames: ["Motivated Strategies for Learning Questionnaire"],
    description:
      "Pintrich et al.(1991)이 개발한 학습동기와 학습전략 사용을 동시에 측정하는 다차원 도구. 동기 6하위(내재적 가치·자기효능감 등)와 학습전략 9하위(인지·메타인지·자원관리)로 구성된 가장 널리 인용되는 도구 중 하나.",
    originalName: "Motivated Strategies for Learning Questionnaire",
    author: "Pintrich, Smith, Garcia, & McKeachie (1991)",
    itemCount: 81,
    scaleType: "7점 Likert",
    reliability: "Cronbach α = .52~.93 (하위 척도별)",
    validity: "다수 국내외 연구로 구인타당도 확보",
    sampleItems: [
      "나는 가능한 한 강의 내용을 깊이 이해하려 한다.",
      "공부할 때 노트의 핵심 내용을 정리해 본다.",
      "이 강의의 내용은 나에게 유용할 것이라고 생각한다.",
    ],
    tags: ["동기", "학습전략", "다차원"],
    references: [
      "Pintrich, P. R., Smith, D. A. F., Garcia, T., & McKeachie, W. J. (1991). A manual for the use of the Motivated Strategies for Learning Questionnaire (MSLQ). NCRIPTAL.",
    ],
  },
  {
    name: "K-MOLT 학습몰입 척도 (석임복, 2007)",
    altNames: ["Korean Measure of Learning Flow", "K-MOLT"],
    description:
      "Csikszentmihalyi의 몰입 이론을 학습 맥락에 맞게 한국 학습자에게 타당화한 척도. 도전과 능력의 균형, 행위와 의식의 통합, 명확한 목표 등 9개 하위 요인을 측정.",
    originalName: "Korean Measure of Learning Flow",
    author: "석임복 (2007)",
    itemCount: 35,
    scaleType: "5점 Likert",
    reliability: "Cronbach α = .94 (전체)",
    validity: "확인적 요인분석으로 9요인 구조 검증",
    sampleItems: [
      "공부할 때 시간이 어떻게 가는지 모르겠다.",
      "공부에 집중하고 있을 때는 잡념이 생기지 않는다.",
      "내가 어떤 활동을 하고 있는지 의식하지 못할 때가 있다.",
    ],
    tags: ["몰입", "한국형", "KCI"],
    references: [
      "석임복 (2007). 학습 몰입의 구성 요인, 수준, 관련 변인 탐색. 경북대학교 박사학위논문.",
    ],
  },
  {
    name: "자기조절학습 검사 (양명희, 2002)",
    altNames: ["Self-Regulated Learning Test (Korean)"],
    description:
      "Zimmerman의 SRL 모형에 기반하여 양명희(2002)가 한국 학습자용으로 개발한 검사. 인지조절·동기조절·행동조절의 3대 영역과 하위 요인으로 구성된다.",
    author: "양명희 (2002)",
    itemCount: 35,
    scaleType: "5점 Likert",
    reliability: "Cronbach α = .89 (전체)",
    validity: "구인타당도 확인 (3요인 모형 적합)",
    sampleItems: [
      "공부할 때 미리 계획을 세우는 편이다.",
      "어려운 내용은 다른 자료를 찾아서 보완한다.",
      "산만해지면 다시 집중하려고 노력한다.",
    ],
    tags: ["자기조절", "한국형", "KCI"],
    references: [
      "양명희 (2002). 자기조절학습의 모형 탐색과 학업 성취와의 관계 연구. 서울대학교 박사학위논문.",
    ],
  },
  {
    name: "Cognitive Load Scale (Leppink et al., 2013)",
    altNames: ["3-Type Cognitive Load Scale"],
    description:
      "내재적·외재적·본유적 인지부하를 분리하여 측정하는 10문항 도구. 멀티미디어·이러닝·문제해결 학습 환경 연구의 표준 도구로 자리잡았다.",
    originalName: "Cognitive Load Scale",
    author: "Leppink, Paas, van der Vleuten, van Gog, & van Merriënboer (2013)",
    itemCount: 10,
    scaleType: "0~10 척도",
    reliability: "Cronbach α = .81~.85 (하위 척도)",
    validity: "확인적 요인분석으로 3요인 구조 검증",
    sampleItems: [
      "이 학습 자료의 내용은 나에게 매우 복잡하게 느껴졌다. (내재적)",
      "사용된 설명 방식이 이해하기 어려웠다. (외재적)",
      "이 학습 활동은 내가 관련 지식을 더 잘 이해하는 데 도움이 되었다. (본유적)",
    ],
    tags: ["인지부하", "멀티미디어", "다차원"],
    references: [
      "Leppink, J., Paas, F., van der Vleuten, C. P. M., van Gog, T., & van Merriënboer, J. J. G. (2013). Development of an instrument for measuring different types of cognitive load. Behavior Research Methods, 45(4), 1058-1072.",
    ],
  },
  {
    name: "TAM 척도 (Davis, 1989)",
    altNames: ["Technology Acceptance Model Scale"],
    description:
      "Davis(1989)가 개발한 기술수용모형의 핵심 측정 도구. 지각된 유용성(Perceived Usefulness)과 지각된 사용 용이성(Perceived Ease of Use) 각 6문항으로 구성. 국내 연구에서는 LMS·MOOC·메타버스 수용 연구의 표준 척도.",
    originalName: "Technology Acceptance Model",
    author: "Davis, F. D. (1989)",
    itemCount: 12,
    scaleType: "7점 Likert",
    reliability: "Cronbach α = .97 (PU) / .91 (PEU)",
    validity: "다수 메타분석으로 구인 안정성 확인",
    sampleItems: [
      "이 시스템을 사용하면 학습 효율이 높아질 것이다. (PU)",
      "이 시스템은 사용 방법을 익히기 쉽다. (PEU)",
    ],
    tags: ["에듀테크", "수용성"],
    references: [
      "Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319-340.",
    ],
  },
  {
    name: "IMI (내재적 동기 검사)",
    altNames: ["Intrinsic Motivation Inventory"],
    description:
      "Ryan(1982), Deci & Ryan 등이 개발한 자기결정성이론 기반 내재적 동기 다차원 측정도구. 흥미/즐거움·지각된 유능성·노력·가치/유용성·압박/긴장·지각된 선택권의 6개 하위 척도로 구성.",
    originalName: "Intrinsic Motivation Inventory",
    author: "Ryan, R. M. (1982); Deci & Ryan",
    itemCount: 22,
    scaleType: "7점 Likert",
    reliability: "하위 척도별 α = .68~.85",
    validity: "다수 국내외 연구에서 요인 구조 확인",
    resourceUrl: "https://selfdeterminationtheory.org/intrinsic-motivation-inventory/",
    sampleItems: [
      "이 활동이 매우 흥미로웠다.",
      "내가 이 활동을 잘했다고 생각한다.",
      "이 활동을 하면서 긴장하지 않았다.",
    ],
    tags: ["동기", "자기결정성", "다차원"],
    references: [
      "Ryan, R. M. (1982). Control and information in the intrapersonal sphere. Journal of Personality and Social Psychology, 43(3), 450-461.",
    ],
  },
];

// ─── Import 함수 ──────────────────────────────────────────────
export interface SeedImportResult {
  concepts: { created: number; skipped: number };
  variables: { created: number; skipped: number };
  measurements: { created: number; skipped: number };
}

export async function importArchiveSeed(
  createdBy: string,
): Promise<SeedImportResult> {
  const result: SeedImportResult = {
    concepts: { created: 0, skipped: 0 },
    variables: { created: 0, skipped: 0 },
    measurements: { created: 0, skipped: 0 },
  };

  // 기존 데이터 로드 (이름 중복 검사용)
  const [existingC, existingV, existingM] = await Promise.all([
    archiveConceptsApi.list(),
    archiveVariablesApi.list(),
    archiveMeasurementsApi.list(),
  ]);
  const cNames = new Set(existingC.data.map((x) => x.name));
  const vNames = new Set(existingV.data.map((x) => x.name));
  const mNames = new Set(existingM.data.map((x) => x.name));

  for (const c of SEED_CONCEPTS) {
    if (cNames.has(c.name)) {
      result.concepts.skipped++;
      continue;
    }
    await archiveConceptsApi.create({
      ...c,
      createdBy,
    } as Partial<ArchiveConcept>);
    result.concepts.created++;
  }

  for (const v of SEED_VARIABLES) {
    if (vNames.has(v.name)) {
      result.variables.skipped++;
      continue;
    }
    await archiveVariablesApi.create({
      ...v,
      createdBy,
    } as Partial<ArchiveVariable>);
    result.variables.created++;
  }

  for (const m of SEED_MEASUREMENTS) {
    if (mNames.has(m.name)) {
      result.measurements.skipped++;
      continue;
    }
    await archiveMeasurementsApi.create({
      ...m,
      createdBy,
    } as Partial<ArchiveMeasurementTool>);
    result.measurements.created++;
  }

  return result;
}
