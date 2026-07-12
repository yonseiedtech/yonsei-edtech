/**
 * 교육공학 아카이브 기본 시드 데이터
 *
 * KCI 등재 한국 교육공학·교육심리 논문 + 영문 교과서를 기준으로 정리한
 * 대표 개념·변인·측정도구.
 *
 * "/console/archive"의 "기본 시드 불러오기" 버튼이 호출하는 데이터.
 * 동일 이름의 항목이 이미 있으면 건너뜀 (중복 방지).
 *
 * ⚠️ 한국어 KCI/박사학위 인용 정확성 주의 ⚠️
 * 본 파일에 포함된 한국어 학술 인용(저자·연도·학술지·페이지)은
 * 자동 생성/요약 과정에서 할루시네이션(부정확한 메타데이터) 가능성이 있습니다.
 * 운영진이 RISS/국립중앙도서관 직접 검증 후 보강해 주세요.
 * 영문 인용은 비교적 안정적이지만 판본·페이지는 동일하게 검증 권장.
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
  /** Phase 5 — 시드 멱등성 키. 사용자가 이름 수정해도 동일 항목 인식. */
  seedKey: string;
  name: string;
  description: string;
  /** AECT 공식 역어 — 『교육공학 용어해설』(Richey 편, 학지사 2020) 표제어 기준. */
  aectTerm?: string;
  /** 순화어 — 노션 용어사전집·『교수학습공학』(이명근, 2025) 용어 체계 기준 병기. */
  purifiedName?: string;
  altNames?: string[];
  tags?: string[];
  references?: string[];
}

export interface SeedVariable {
  /** Phase 5 — 시드 멱등성 키. */
  seedKey: string;
  name: string;
  description: string;
  type?: ArchiveVariable["type"];
  altNames?: string[];
  tags?: string[];
  references?: string[];
}

export interface SeedMeasurement {
  /** Phase 5 — 시드 멱등성 키. */
  seedKey: string;
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

/**
 * 『교육공학 용어해설』(AECT 공식 용어집) 참고문헌 문자열 — 번역서 표제어 페이지 명시.
 * ⚠️ 저작권: 표제어·역어(사실 정보)와 출처 표기만 사용. 해설 본문은 전재하지 않고
 * 각 개념 설명은 자체 재서술(패러프레이즈)로만 작성한다.
 */
const AECT_REF = (page: number): string =>
  `Richey, R. C. (Ed.). (2013). Encyclopedia of terminology for educational communications and technology. Springer. [이현우, 임규연, 정재삼, 허희옥 공역 (2020). 교육공학 용어해설 (p. ${page}). 학지사]`;

/**
 * 『교수학습공학: 이론적 기초와 동향』(이명근, 2025) 참고문헌 문자열.
 * 연세대 교육대학원 직계 저자의 학습이론 11계열 체계 — 표기·분류 참조 및 재서술 출처.
 * ⚠️ 본문 전재 금지 — 설명은 자체 재서술만.
 */
const LEE_REF = (page: number): string =>
  `이명근 (2025). 교수학습공학: 이론적 기초와 동향 (p. ${page}). 학지사.`;

// ─── 개념 (Concepts) ─────────────────────────────────────────
// seedKey 형식: `concept:{kebab-slug}` — 사용자가 이름 수정해도 동일 항목 인식.
export const SEED_CONCEPTS: SeedConcept[] = [
  {
    seedKey: "concept:self-efficacy",
    name: "자기효능감",
    aectTerm: "자기효능감",
    altNames: ["Self-efficacy", "자기효능감 신념"],
    description:
      "Bandura(1977, 1997)가 제안한 사회인지이론의 핵심 구인으로, 특정 과제를 수행하기 위해 요구되는 행동을 조직하고 실행할 수 있는 자신의 능력에 대한 신념을 의미한다. 학습 상황에서는 학업적 자기효능감(academic self-efficacy)으로 구체화되며, 학습 동기·성취·지속성에 영향을 미치는 핵심 매개 변인으로 다수의 한국 교육공학 연구에서 다뤄졌다.",
    tags: ["동기", "사회인지이론", "정의적 영역"],
    references: [
      "Bandura, A. (1997). Self-efficacy: The exercise of control. W.H. Freeman.",
      // 검증결과 (2026-05): 김아영 (2007) 교육심리연구 인용은 RISS/KCI 검증 불가 → 삭제. 1차 척도 논문은 아래 김아영·박인영(2001).
      "김아영, 박인영 (2001). 학업적 자기효능감 척도 개발 및 타당화 연구. 교육학연구, 39(1), 95-123.",
      AECT_REF(366),
    ],
  },
  {
    seedKey: "concept:learning-motivation",
    name: "학습동기",
    aectTerm: "동기",
    altNames: ["Learning Motivation", "학업동기", "Motivation"],
    description:
      "학습 행동을 시작·유지·종결하게 만드는 내적·외적 추동의 총칭. Keller(1987)의 ARCS 모형(주의-관련성-자신감-만족감)이 교수설계 영역의 표준 프레임으로 자리 잡았으며, 한국 교육공학 연구에서는 자기결정성 이론(SDT) 기반 내재적/외재적 동기 구분이 함께 사용된다.",
    tags: ["동기", "ARCS", "자기결정성"],
    references: [
      "Keller, J. M. (1987). Development and use of the ARCS model of motivational design. Journal of Instructional Development, 10(3), 2-10.",
      // 검증결과: 봉미미외(2008) 교육심리연구 22(4) 815-839 — RISS/KCI 검증 불가 → 삭제
      // 검증결과: 김아영(2010) 정정 — 학술지·권호·페이지 모두 변경
      "김아영 (2010). 자기결정성이론과 현장 적용 연구. 교육심리연구, 24(3), 583-609.",
      AECT_REF(293),
    ],
  },
  {
    seedKey: "concept:cognitive-load",
    name: "인지부하",
    aectTerm: "인지부하",
    altNames: ["Cognitive Load", "정신적 부하"],
    description:
      "Sweller(1988, 1994)의 인지부하이론(Cognitive Load Theory, CLT)에서 비롯된 개념으로, 학습 과제 수행 중 작업기억에 부과되는 정신적 처리 요구량을 의미한다. 내재적(intrinsic)·외재적(extraneous)·본유적(germane) 부하로 구분되며, 멀티미디어 학습 설계 원리(Mayer)와 직결되어 한국 교육공학 연구에서 활발히 적용된다.",
    tags: ["인지", "멀티미디어 학습", "교수설계"],
    references: [
      "Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257-285.",
      // 검증결과: 이상수(2008) 교육공학연구 24(2) 1-26 — RISS/KCI 검증 불가 → 삭제
      // 검증결과: 유영만·김민정(2010) 교육공학연구 26(2) 1-22 — RISS/KCI 검증 불가 → 삭제
      AECT_REF(75),
    ],
  },
  {
    seedKey: "concept:metacognition",
    name: "메타인지",
    aectTerm: "메타인지",
    altNames: ["Metacognition", "초인지"],
    description:
      "Flavell(1979)이 제안한 '인지에 대한 인지'로, 자신의 학습 과정을 모니터링·계획·조절하는 능력. 메타인지 지식(knowledge)과 메타인지 조절(regulation)로 구분되며, 자기조절학습의 핵심 구성 요소로 다뤄진다. 한국 교육공학 연구에서는 디지털 학습환경에서의 메타인지 스캐폴딩 설계 연구가 활발하다.",
    tags: ["인지", "자기조절", "고차사고"],
    references: [
      "Flavell, J. H. (1979). Metacognition and cognitive monitoring: A new area of cognitive-developmental inquiry. American Psychologist, 34(10), 906-911.",
      // 검증결과: 신종호·진성희(2009) 교육공학연구 25(4) 167-198 — RISS/KCI 검증 불가 → 삭제
      AECT_REF(284),
    ],
  },
  {
    seedKey: "concept:self-regulated-learning",
    name: "자기조절학습",
    aectTerm: "자기조절",
    altNames: ["Self-Regulated Learning", "SRL", "Self-Regulation"],
    description:
      "Zimmerman(1989, 2000)이 체계화한 학습자가 자신의 학습 목표 달성을 위해 인지·정의·행동을 능동적으로 조절하는 과정. 사전계획(forethought)·수행(performance)·자기성찰(self-reflection)의 3단계 순환 모형이 표준이며, 디지털 학습환경 자기조절 지원 도구·LMS 행동 데이터 분석의 이론적 근거로 사용된다.",
    tags: ["자기조절", "학습전략", "메타인지"],
    references: [
      "Zimmerman, B. J. (2000). Attaining self-regulation: A social cognitive perspective. In M. Boekaerts et al. (Eds.), Handbook of self-regulation (pp. 13-39). Academic Press.",
      // 검증결과: 양명희(2002) 박사학위논문 제목 정정 — RISS 실제 제목과 일치하도록 "모형 탐색과" 구절 제거
      "양명희 (2002). 자기조절학습 구성변인과 학업 성취와의 관계 연구. 서울대학교 박사학위논문.",
      // 검증결과: 정한호(2008) 교육공학연구 24(3) — RISS/KCI 검증 불가 → 삭제
      AECT_REF(367),
    ],
  },
  {
    seedKey: "concept:learning-flow",
    name: "학습몰입",
    altNames: ["Learning Flow", "Engagement"],
    description:
      "Csikszentmihalyi(1990)의 몰입(flow) 이론을 학습 맥락으로 확장한 개념. 도전과 능력의 균형, 명확한 목표, 즉각적 피드백 조건 하에서 학습자가 활동에 깊이 몰두하는 최적 경험 상태. 한국 교육공학 연구에서는 게이미피케이션·이러닝·VR 학습환경 설계의 효과 측정 지표로 빈번히 사용된다.",
    tags: ["몰입", "최적경험", "정의적 영역"],
    references: [
      "Csikszentmihalyi, M. (1990). Flow: The psychology of optimal experience. Harper & Row.",
      // 검증결과: 석임복(2007) 박사학위논문 제목 정정 — RISS 실제 제목과 일치
      "석임복 (2007). 학습 몰입의 구조: 척도, 성격, 조건, 관여. 경북대학교 박사학위논문.",
      // 검증결과: 김진호(2003) 교육심리연구 17(4) — 학술지 17권 4호 목차 조회 시 해당 저자 논문 없음 → 삭제
    ],
  },
  {
    seedKey: "concept:technology-acceptance",
    name: "테크놀로지 수용",
    altNames: ["Technology Acceptance", "TAM"],
    description:
      "Davis(1989)가 제안한 기술수용모형(Technology Acceptance Model)에서 비롯된 구인. 지각된 유용성(PU)과 지각된 사용 용이성(PEU)이 사용 의도와 실제 사용 행동을 예측한다. 한국 교육공학 연구에서는 LMS·MOOC·AI 튜터·메타버스 학습환경 도입 연구의 이론적 기반으로 광범위하게 활용된다.",
    tags: ["에듀테크", "수용성", "사용 의도"],
    references: [
      "Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319-340.",
      // 검증결과: 이종연(2014) 교육공학연구 30(2) — RISS/KCI 검증 불가 → 삭제
      // 검증결과: 임걸(2011) 정정 — 학술지명 + 제목 모두 변경 (KCI 직접 확인)
      "임걸 (2011). 스마트 러닝 교수학습 설계모형 탐구. 컴퓨터교육학회 논문지, 14(2), 33-45.",
    ],
  },
  {
    seedKey: "concept:collaborative-learning",
    name: "협력학습",
    aectTerm: "협력학습",
    altNames: ["Collaborative Learning", "Cooperative Learning"],
    description:
      "Johnson & Johnson(1989), Slavin(1995) 등이 체계화한 학습자들이 공동의 목표를 위해 상호의존적으로 활동하는 학습 형태. 긍정적 상호의존성·개별 책무성·면대면 상호작용·사회적 기술·집단 처리의 5요소를 포함한다. 한국 교육공학에서는 CSCL(Computer-Supported Collaborative Learning) 설계 연구로 확장되었다.",
    tags: ["협력", "CSCL", "사회적 학습"],
    references: [
      "Johnson, D. W., & Johnson, R. T. (1989). Cooperation and competition: Theory and research. Interaction Book Company.",
      // 검증결과: 이수정·강명희(2015) 교육공학연구 31(4) — RISS/KCI 검증 불가 → 삭제
      // 검증결과: 강명희·임병노(2009) 교육공학연구 25(3) — RISS/KCI 검증 불가 → 삭제
      AECT_REF(81),
    ],
  },
  // ─── 2026 보강: 교육공학 분야 핵심 개념 16개 추가 ───
  {
    seedKey: "concept:educational-technology",
    name: "교육공학",
    aectTerm: "교육공학",
    altNames: ["Educational Technology", "Instructional Technology", "EdTech"],
    description:
      "AECT(2023) 최신 정의: \"학습경험과 학습환경의 전략적 설계·관리·구현·평가를 통해 지식의 진보, 학습·수행의 향상, 학습자 권한 강화를 추구하는 이론·연구·실천에 대한 윤리적 학문과 응용\". 2008년 정의(학습 촉진·수행 향상)에서 2023년 학습자 권한 강화(empower learners) + 학습경험·환경(learning experiences and environments) 두 축이 신규 추가됨.",
    tags: ["AECT", "정의", "학문분야"],
    references: [
      "AECT (2023). Definition of Educational Technology. https://www.aect.org/aect/about/aect-definition",
      "Januszewski, A., & Molenda, M. (Eds.). (2008). Educational technology: A definition with commentary. Routledge.",
      "Seels, B. B., & Richey, R. C. (1994). Instructional technology: The definition and domains of the field. AECT.",
      AECT_REF(155),
    ],
  },
  {
    seedKey: "concept:instructional-design",
    name: "교수설계",
    aectTerm: "교수설계",
    altNames: ["Instructional Design", "ID", "교수체제설계", "ISD"],
    description:
      "학습 목표 달성을 위해 교수·학습 과정을 체계적으로 분석·설계·개발·실행·평가하는 절차. ADDIE 모델, Dick & Carey, Gagné의 9 events, Merrill의 First Principles, 4C/ID 등이 대표 모델. 교육공학 5도메인 중 '설계' 영역의 중심 활동이며 모든 학습 콘텐츠 개발의 기초.",
    tags: ["설계", "ADDIE", "ID", "체제적 접근"],
    references: [
      "Dick, W., Carey, L., & Carey, J. O. (2015). The systematic design of instruction (8th ed.). Pearson.",
      "Gagné, R. M., Wager, W. W., Golas, K. C., & Keller, J. M. (2005). Principles of instructional design (5th ed.). Wadsworth.",
      "Merrill, M. D. (2002). First principles of instruction. ETR&D, 50(3), 43-59.",
      AECT_REF(222),
    ],
  },
  {
    seedKey: "concept:addie-model",
    name: "ADDIE 모델",
    aectTerm: "ADDIE 모형",
    altNames: ["ADDIE Model"],
    description:
      "교수설계(ID)의 가장 보편적인 절차 모델. Analysis(분석) → Design(설계) → Development(개발) → Implementation(실행) → Evaluation(평가)의 5단계 순환. 단계별 산출물이 다음 단계 입력이 되며, 마지막 평가에서 이전 단계로 피드백되는 형성·총괄 평가 흐름을 포함한다.",
    tags: ["ID", "절차", "설계 모델"],
    references: [
      "Branch, R. M. (2009). Instructional design: The ADDIE approach. Springer.",
      "Molenda, M. (2003). In search of the elusive ADDIE model. Performance Improvement, 42(5), 34-36.",
    ],
  },
  {
    seedKey: "concept:tpack",
    name: "TPACK",
    aectTerm: "테크놀로지 활용 교수내용지식",
    altNames: ["Technological Pedagogical Content Knowledge", "TPCK"],
    description:
      "Mishra & Koehler(2006)가 Shulman(1986)의 PCK를 확장한 교사 지식 프레임워크. 내용지식(CK)·교수지식(PK)·테크놀로지지식(TK)의 3원 교집합에서 형성되는 통합 지식. 디지털 기술을 효과적으로 수업에 통합하기 위한 교사 역량 측정 및 양성 프로그램 설계의 핵심 개념.",
    tags: ["교사역량", "테크놀로지 통합", "PCK"],
    references: [
      "Mishra, P., & Koehler, M. J. (2006). Technological pedagogical content knowledge: A framework for teacher knowledge. Teachers College Record, 108(6), 1017-1054.",
      "Schmidt, D. A. et al. (2009). Technological pedagogical content knowledge (TPACK): The development and validation of an assessment instrument for preservice teachers. JRTE, 42(2), 123-149.",
      AECT_REF(392),
    ],
  },
  {
    seedKey: "concept:samr-model",
    name: "SAMR 모델",
    altNames: ["SAMR Model"],
    description:
      "Puentedura(2006)가 제안한 테크놀로지 통합 수준 평가 프레임워크. Substitution(대체)·Augmentation(증강)·Modification(변형)·Redefinition(재정의)의 4단계로 디지털 도구 활용 깊이를 진단. 위 단계로 갈수록 기술이 수업의 본질을 변화시키는 정도가 커진다. 디지털 전환 시대 교사 컨설팅과 연수 설계의 단골 frame.",
    tags: ["테크놀로지 통합", "디지털 전환", "교사 연수"],
    references: [
      "Puentedura, R. R. (2006). Transformation, technology, and education. http://hippasus.com/resources/tte/",
      "Hamilton, E. R., Rosenberg, J. M., & Akcaoglu, M. (2016). The substitution augmentation modification redefinition (SAMR) model: A critical review and suggestions for its use. TechTrends, 60(5), 433-441.",
    ],
  },
  {
    seedKey: "concept:learning-analytics",
    name: "학습분석",
    altNames: ["Learning Analytics", "LA"],
    description:
      "학습자의 행동·맥락·산출 데이터를 수집·측정·분석·보고하여 학습과 학습환경을 이해·최적화하는 분야. SoLAR(Society for Learning Analytics Research, 2011~) 와 학술지 Journal of Learning Analytics 가 주도. 학습관리시스템(LMS) 로그, 디지털 교재 사용 기록, 협업 도구 활동을 활용한 위험학습자 조기 진단·개입(Early Warning) 연구가 활발하다.",
    tags: ["데이터", "LMS", "LA", "조기 진단"],
    references: [
      "Siemens, G., & Long, P. (2011). Penetrating the fog: Analytics in learning and education. EDUCAUSE Review, 46(5), 30-32.",
      "Gašević, D., Dawson, S., & Siemens, G. (2015). Let's not forget: Learning analytics are about learning. TechTrends, 59(1), 64-71.",
    ],
  },
  {
    seedKey: "concept:digital-literacy",
    name: "디지털 리터러시",
    aectTerm: "디지털 리터러시",
    altNames: ["Digital Literacy", "디지털 문해력", "Digital Competence"],
    description:
      "디지털 도구·정보·미디어를 비판적으로 탐색·평가·활용·창출·공유할 수 있는 통합 역량. 유럽연합 DigComp 2.2(2022) 프레임워크가 5영역(정보·소통·콘텐츠 창출·안전·문제해결) 21역량으로 표준화. 한국에서는 2022 개정 교육과정 핵심 역량과 디지털 교과서 정책의 기초 개념.",
    tags: ["역량", "DigComp", "교육과정"],
    references: [
      "Vuorikari, R., Kluzer, S., & Punie, Y. (2022). DigComp 2.2: The Digital Competence Framework for Citizens. Publications Office of the EU.",
      // 한국어 KCI/한국교육과정평가원 인용은 자동 생성 시 할루시네이션 가능성이 있어 제거 — 운영진 검증 후 보강 필요
      AECT_REF(138),
    ],
  },
  {
    seedKey: "concept:flipped-learning",
    name: "플립러닝",
    altNames: ["Flipped Learning", "Flipped Classroom", "거꾸로 학습"],
    description:
      "전통적 교실 수업과 가정 학습의 순서를 뒤집어, 개념 학습은 사전 영상·자료로 가정에서, 적용·토론·문제해결은 교실에서 진행하는 혼합학습 모델. Bergmann & Sams(2012)가 보급. 메타분석(Lo & Hew, 2017)에서 전통 강의 대비 학업성취·만족도 효과크기 양(+) 보고. 사전학습 충실도가 효과 결정 변인.",
    tags: ["혼합학습", "거꾸로", "Bergmann"],
    references: [
      "Bergmann, J., & Sams, A. (2012). Flip your classroom: Reach every student in every class every day. ISTE.",
      "Lo, C. K., & Hew, K. F. (2017). A critical review of flipped classroom challenges in K-12 education. RPTEL, 12(4).",
      // 한국어 KCI 인용은 자동 생성 시 할루시네이션 가능성이 있어 제거 — 운영진 검증 후 보강 필요
    ],
  },
  {
    seedKey: "concept:gamification",
    name: "게이미피케이션",
    altNames: ["Gamification", "교육 게이미피케이션"],
    description:
      "게임 메커닉스(점수·배지·리더보드·서사·미션)를 비게임 학습 맥락에 적용해 동기·몰입·지속을 높이는 설계 전략. Deterding et al.(2011) 정의 표준. 자기결정성이론(SDT)의 자율성·유능감·관계성 욕구 충족이 효과 매개. 단순 PBL(Points-Badges-Leaderboards) 보다 서사·선택권 설계가 깊은 학습 유발.",
    tags: ["동기", "게임", "PBL"],
    references: [
      "Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). From game design elements to gamefulness: Defining \"gamification\". MindTrek 2011.",
      "Hamari, J., Koivisto, J., & Sarsa, H. (2014). Does gamification work? A literature review of empirical studies on gamification. HICSS 2014.",
    ],
  },
  {
    seedKey: "concept:microlearning",
    name: "마이크로러닝",
    altNames: ["Microlearning", "마이크로 콘텐츠"],
    description:
      "5~15분 분량의 짧은 단위 콘텐츠로 단일 학습 목표 1개를 즉시 학습·적용하는 형식. 모바일 사용 환경·HRD 의 just-in-time 학습 흐름과 결합되어 2010년대 후반 확산. 인지부하이론의 작업기억 한계 + 망각곡선 보상(반복) 원리 기반. SCORM 단편화·xAPI 추적이 기술 인프라.",
    tags: ["모바일", "HRD", "JIT"],
    references: [
      "Hug, T. (Ed.). (2007). Didactics of microlearning. Waxmann.",
      "Major, A., & Calandrino, T. (2018). Beyond chunking: Micro-learning secrets for effective online design. FDLA Journal, 3(13).",
    ],
  },
  {
    seedKey: "concept:computational-thinking",
    name: "컴퓨팅 사고력",
    altNames: ["Computational Thinking", "CT"],
    description:
      "Wing(2006)이 제시한 문제를 컴퓨터가 처리할 수 있는 형태로 표현·해결하는 사고 능력. 분해(decomposition)·패턴 인식(pattern recognition)·추상화(abstraction)·알고리즘(algorithm)의 4가지 핵심 요소. 한국 2015·2022 개정 교육과정 SW·AI 교육 핵심 목표이며 디지털 새싹·SW중심학교 사업의 기초.",
    tags: ["SW교육", "AI교육", "Wing"],
    references: [
      "Wing, J. M. (2006). Computational thinking. Communications of the ACM, 49(3), 33-35.",
      "Shute, V. J., Sun, C., & Asbell-Clarke, J. (2017). Demystifying computational thinking. Educational Research Review, 22, 142-158.",
    ],
  },
  {
    seedKey: "concept:adaptive-learning",
    name: "적응학습",
    aectTerm: "적응적 시스템",
    altNames: ["Adaptive Learning", "맞춤형 학습", "Adaptive Instruction", "Adaptive Systems"],
    description:
      "학습자의 사전지식·수행·선호·맥락 데이터에 기반해 콘텐츠·난이도·경로·피드백을 실시간 개인화하는 학습 시스템. ITS(Intelligent Tutoring System)·AI 학습 플랫폼이 기술 기반. Knewton·ALEKS·Smart Sparrow 등이 상용 사례. 한국에선 AI 디지털교과서(2025~) 정책으로 본격 도입.",
    tags: ["AI", "개인화", "ITS"],
    references: [
      "VanLehn, K. (2011). The relative effectiveness of human tutoring, intelligent tutoring systems, and other tutoring systems. Educational Psychologist, 46(4), 197-221.",
      "Aleven, V. et al. (2016). Help helps, but only so much: Research on help seeking with intelligent tutoring systems. IJAIED, 26(1), 205-223.",
    ],
  },
  {
    seedKey: "concept:ctml",
    name: "멀티미디어 학습 인지이론",
    aectTerm: "멀티미디어 학습",
    altNames: ["Cognitive Theory of Multimedia Learning", "CTML", "Multimedia Learning"],
    description:
      "Mayer 의 통합 이론으로, 학습자는 시각·청각 이중 채널, 제한된 작업기억, 능동적 처리의 3가지 가정 하에 학습. 12가지 멀티미디어 설계 원리(coherence, signaling, redundancy, spatial/temporal contiguity, segmenting, pre-training, modality, personalization, voice, image, embodiment, generative activity)가 도출되며, 동영상·이러닝 콘텐츠 품질 평가의 표준 frame.",
    tags: ["Mayer", "이러닝", "설계원리"],
    references: [
      "Mayer, R. E. (2020). Multimedia learning (3rd ed.). Cambridge University Press.",
      "Mayer, R. E. (2009). Multimedia learning (2nd ed.). Cambridge University Press.",
      "Mayer, R. E., & Fiorella, L. (Eds.). (2021). The Cambridge handbook of multimedia learning (3rd ed.). Cambridge University Press.",
      AECT_REF(299),
    ],
  },
  {
    seedKey: "concept:community-of-practice",
    name: "학습공동체",
    aectTerm: "실천공동체",
    altNames: ["Community of Practice", "CoP", "전문학습공동체", "PLC", "실천공동체"],
    description:
      "공통 관심·전문성을 공유한 사람들이 정기적 상호작용을 통해 지식·실천을 함께 발전시키는 사회적 학습 단위. Lave & Wenger(1991)가 상황학습(situated learning) 맥락에서 처음 소개했으며, '장기간에 걸쳐 사람·활동·세상 사이에 이루어지는 일련의 관계'로 설명된다. Wenger는 공동체를 영역(domain)·공동체(community)·실천(practice)의 세 핵심 요소로 구조화했다 — 공유된 관심 영역이 참여 동기와 지식 조직 방식을 이끌고, 구성원의 초점이 옮겨 가면 영역의 경계도 함께 움직인다. 교사 전문학습공동체(PLC), 기업 내 CoP, MOOC 학습자 커뮤니티 등이 응용 사례이며 정체성 형성·상호 멘토링이 핵심 메커니즘.",
    tags: ["사회적 학습", "PLC", "Wenger"],
    references: [
      "Lave, J., & Wenger, E. (1991). Situated learning: Legitimate peripheral participation. Cambridge University Press.",
      "Wenger, E. (1998). Communities of practice: Learning, meaning, and identity. Cambridge University Press.",
      AECT_REF(89),
    ],
  },
  {
    seedKey: "concept:social-presence",
    name: "사회적 실재감",
    altNames: ["Social Presence", "Community of Inquiry CoI"],
    description:
      "온라인 학습 환경에서 학습자가 다른 참여자를 '실제 사람'으로 지각하는 정도. Garrison, Anderson, Archer(2000)의 탐구공동체(CoI) 모델 3요소 중 하나로 인지적 실재감(cognitive presence)·교수적 실재감(teaching presence)과 함께 작동. 원격·블렌디드 학습의 학습 만족도·지속의도를 설명하는 핵심 매개변인.",
    tags: ["온라인학습", "CoI", "Garrison"],
    references: [
      "Garrison, D. R., Anderson, T., & Archer, W. (2000). Critical inquiry in a text-based environment: Computer conferencing in higher education. The Internet and Higher Education, 2(2-3), 87-105.",
      // 한국어 KCI 인용은 자동 생성 시 할루시네이션 가능성이 있어 제거 — 운영진 검증 후 보강 필요
    ],
  },
  {
    seedKey: "concept:learning-experience-design",
    name: "학습경험 디자인",
    altNames: ["Learning Experience Design", "LX Design", "LXD"],
    description:
      "UX(User Experience) 설계 원리를 학습 설계에 적용해 학습자의 인지·정서·맥락 경험을 총체적으로 디자인하는 접근. 전통 ID 가 콘텐츠·절차 중심이라면 LXD 는 학습자 여정(learner journey)·터치포인트·정서적 흐름을 중시. AECT 2023 정의의 '학습경험과 학습환경' 강화와 직접 연결되는 최신 흐름.",
    tags: ["UX", "LX", "AECT 2023"],
    references: [
      "Schmidt, M., & Huang, R. (2022). Defining learning experience design: Voices from the field of learning design & technology. TechTrends, 66(2), 141-158.",
      "Jahnke, I., Lee, Y. M., Pham, M., He, H., & Austin, L. (2020). Unpacking the inherent design principles of mobile microlearning. Technology, Knowledge and Learning, 25, 585-619.",
      "Floor, N. (2018). Learning experience design (LXD): An introduction. lxd.org.",
    ],
  },

  // ─── 연구방법론 (2026-06-11 보충 — 석사 논문 작성·심사 방어 지원) ───
  // 영문 정전(canonical) 교과서 인용 위주로 구성 — 한국어 인용 할루시네이션 리스크 회피.

  // ─── 2026-07-12 보강: AECT 『교육공학 용어해설』 갭 반영 23개 ───
  // docs/plans/aect-archive-gap-2026-07-12.md 기준. 설명은 원문 전재가 아닌
  // 자체 재서술(패러프레이즈·번역투 순화)이며, 표제어 페이지를 AECT_REF 로 명시.
  {
    seedKey: "concept:behaviorism",
    name: "행동주의",
    aectTerm: "행동주의",
    altNames: ["Behaviorism"],
    description:
      "학습을 마음속 상태에 대한 추측이 아니라 관찰 가능한 행동의 변화로 이해하려는 심리학 이론 체계의 총칭. 20세기 초 Pavlov·Watson·Thorndike의 연구에서 출발했고, Skinner가 행동은 뒤따르는 결과(강화·약화)에 따라 조성된다는 작동적 조건화를 정립하며 고전적 조건화와 구분했다. 자극-반응-결과 변인을 조작해 복잡한 행동을 이끌어 낼 수 있다는 발견은 프로그램 수업·행동목표·수행 중심 설계 등 교육공학 초기 혁신의 이론적 바탕이 되었으며, 교육공학의 이론과 실제에 가장 큰 영향을 남긴 사조로 평가된다.",
    tags: ["학습이론", "행동주의", "이론적 지향"],
    references: [
      "Skinner, B. F. (1954). The science of learning and the art of teaching. Harvard Educational Review, 24, 86-97.",
      AECT_REF(53),
    ],
  },
  {
    seedKey: "concept:cognitive-learning-theory",
    name: "인지주의 학습이론",
    aectTerm: "인지주의 학습이론",
    altNames: ["Cognitive Learning Theory", "인지주의"],
    description:
      "학습자의 머릿속에서 일어나는 일에 주목하는 학습이론 계열. 사람이 정보를 획득·구축·처리·조직·저장·인출·적용하는 방식을 다루는 인지심리학 원리에 기반하며, 교수와 학습을 매개하는 인지 구조·처리 과정·표상의 발달에 초점을 둔다. 단일 이론이라기보다 스키마이론·정보처리이론·전이 연구 등 인지의 여러 국면을 설명하는 틀의 모음에 가깝다. Ausubel의 유의미학습과 선행조직자, Bruner의 발견학습, Gagné의 학습성과 영역과 교수사태가 대표적이며, 부호화-저장-인출로 이어지는 기억 과정을 학습 설계의 근거로 삼는다.",
    tags: ["학습이론", "인지주의", "이론적 지향"],
    references: [
      "Smith, P. L., & Ragan, T. J. (2005). Instructional design (3rd ed.). Wiley.",
      AECT_REF(74),
    ],
  },
  {
    seedKey: "concept:constructivism",
    name: "구성주의",
    aectTerm: "구성주의",
    altNames: ["Constructivism"],
    description:
      "지식은 전달받는 것이 아니라 학습자가 환경과 상호작용하며 스스로 구성한다는 인식론이자 학습이론. 새로운 정보를 이미 알고 있는 것과 연결할 때 학습이 일어난다고 본다. Piaget는 발달을 학습의 선행 조건으로 본 반면 Vygotsky는 학습이 발달을 이끈다고 보았으며, 근접발달영역(ZPD)에서 유능한 타인(멘토)과의 상호작용이 학습을 촉진한다고 설명했다. 학습은 목적 지향적이고 사회·문화적 도구를 매개로 이루어지며 협력적 탐구 공동체 속에서 가장 잘 일어난다고 본다. 학습자 중심 수업·상황인지·실천공동체 등 현대 교육공학 설계 원리 다수가 이 관점에서 나왔다.",
    tags: ["학습이론", "구성주의", "이론적 지향"],
    references: [
      "Vygotsky, L. S. (1978). Mind in society: The development of higher psychological processes. Harvard University Press.",
      AECT_REF(107),
    ],
  },
  {
    seedKey: "concept:schema-theory",
    name: "스키마이론",
    aectTerm: "스키마이론",
    altNames: ["Schema Theory", "도식이론"],
    description:
      "경험을 압축해 표상한 추상적 지식 구조(스키마)로 기억과 이해를 설명하는 인지 이론. Bartlett(1932)는 사람이 경험을 사진처럼 그대로 저장하지 않고 심적 표상으로 구성하며, 회상은 저장된 것의 재생이 아니라 스키마를 바탕으로 한 재구성이라고 보았다. Piaget는 아동이 경험을 이해하기 위해 스키마를 만들고, 새 경험을 기존 스키마에 통합하거나(동화) 스키마 자체를 바꾸는(조절) 방식으로 발달한다고 설명했다. 선행조직자·정교화 전략 같은 교수전략과 인지부하이론의 스키마 자동화 개념의 토대가 된다.",
    tags: ["인지", "학습이론", "이론적 지향"],
    references: [
      "Bartlett, F. C. (1932). Remembering: A study in experimental and social psychology. Cambridge University Press.",
      AECT_REF(361),
    ],
  },
  {
    seedKey: "concept:information-processing-theory",
    name: "정보처리이론",
    aectTerm: "정보처리이론",
    altNames: ["Information Processing Theory", "IPT"],
    description:
      "인간의 학습을 정보의 처리 과정으로 설명하는 인지 이론. 자극이 주의·지각을 거쳐 작업기억과 장기기억에서 처리·저장·인출되는 흐름을 다룬다. 통계·확률로 정보 전달을 다루던 정보이론에서 갈라져 나와, 1950년대 인지심리학자들이 정보 자체가 아닌 사건을 이해하는 인간 요소를 중심에 두고 발전시켰다. Broadbent의 필터 이론, Miller의 매직 넘버(7±2)와 청크 단위 처리 개념이 대표적이며, 멀티미디어 학습 설계와 인지부하 연구의 이론적 뿌리가 된다.",
    tags: ["인지", "학습이론", "이론적 지향"],
    references: [
      "Miller, G. A. (1956). The magical number seven, plus or minus two: Some limits on our capacity for processing information. Psychological Review, 63(2), 81-97.",
      AECT_REF(207),
    ],
  },
  {
    seedKey: "concept:cognitive-strategies",
    name: "인지전략",
    aectTerm: "인지전략",
    altNames: ["Cognitive Strategies"],
    description:
      "정보를 저장하고 떠올리는 일을 돕는 정신적 기술. 학습자가 배운 것을 생각하거나 문제를 해결할 때 기억 유지와 사고를 관리하는 방식으로, 자동화되면 의식하지 않고도 사용된다. 어떤 전략을 언제 쓸지 아는 것이 중요하며, 자신의 사고 과정에 대한 지식인 메타인지가 전략의 효과적 사용을 돕는다. 청킹·리허설·정교화·기억술·심상 등이 대표적 예이고, Gagné는 인지전략을 학습성과의 다섯 영역 중 하나로 꼽았다.",
    tags: ["인지", "학습전략"],
    references: [
      "Gagné, R. M. (1985). The conditions of learning and theory of instruction (4th ed.). Holt, Rinehart and Winston.",
      AECT_REF(78),
    ],
  },
  {
    seedKey: "concept:scaffolding",
    name: "스캐폴딩",
    aectTerm: "스캐폴딩",
    altNames: ["Scaffolding", "비계"],
    description:
      "학습자가 혼자서는 해내기 어려운 과제를 수행할 때 제공하는 일시적 지원. Vygotsky의 근접발달영역 개념에 뿌리를 두고 인지적 도제 이론에서 발전했으며, 학습의 사회적 맥락과 전문가-학습자 상호작용을 강조한다. 조언부터 직접적 도움까지 형태가 다양하고, 안내·프롬프트·피드백이 설계의 필수 요소다. 교수자는 학습 진도를 지켜보며 지원의 양을 조절하다가 학습자가 능숙해지면 점차 거두어들인다(fading). 최근에는 테크놀로지가 과제 일부를 자동화하거나 활동을 조직화해 인지부하를 줄여 주는 동적 스캐폴딩 연구가 활발하다.",
    tags: ["교수전략", "Vygotsky", "지원"],
    references: [
      "Wood, D., Bruner, J. S., & Ross, G. (1976). The role of tutoring in problem solving. Journal of Child Psychology and Psychiatry, 17(2), 89-100.",
      AECT_REF(359),
    ],
  },
  {
    seedKey: "concept:learning-transfer",
    name: "학습전이",
    aectTerm: "전이",
    altNames: ["Transfer", "Transfer of Learning", "전이"],
    description:
      "새로 배운 지식·기술·태도를 실제 맥락에 적용하는 정도. 교육에 들인 투자가 성과로 이어지는가를 가늠하는 지표로, 학습 연구 초기(Thorndike & Woodworth, 1901)부터 다뤄진 오래된 주제다. 익힌 기술을 유사한 상황에서 그대로 활용하는 근전이(near transfer)와, 새롭고 복잡한 상황으로 창의적으로 확장해 적용하는 원전이(far transfer)로 구분된다. 근전이는 반복 연습과 교정적 피드백으로 높일 수 있으나 원전이는 달성이 어려워, 문제 중심의 전체적이고 다양한 연습을 제공하는 학습 환경이 필요하다고 본다.",
    tags: ["학습과정", "전이", "HRD"],
    references: [
      "Perkins, D. N., & Salomon, G. (1992). Transfer of learning. In International encyclopedia of education (2nd ed.). Pergamon Press.",
      AECT_REF(401),
    ],
  },
  {
    seedKey: "concept:situated-cognition",
    name: "상황인지",
    aectTerm: "상황인지",
    altNames: ["Situated Cognition", "상황학습", "Situated Learning"],
    description:
      "지식은 그것이 쓰이는 상황과 분리된 채 존재하지 않고 사회문화적 맥락 안에 존재한다고 보는 관점. 학습은 특정 시간·장소에서 맥락화되어 일어나며, 의미는 사회적으로 구성되므로 같은 내용도 어떤 환경에서 배우는가에 따라 학습되는 것이 달라진다. 실천공동체는 지식과 기술이 구성되는 틀이 되고, 집단마다 자신의 지식을 다르게 규정하므로 문제 해결 접근도 달라진다. 학습자가 맥락 안으로 들어갈 때 습득하는 지식의 범주와 순서 자체가 변한다고 보며, 인지적 도제·실제적 활동·앵커드 교수법 등 실제 맥락 기반 설계의 이론적 기초다.",
    tags: ["학습이론", "구성주의", "맥락"],
    references: [
      "Brown, J. S., Collins, A., & Duguid, P. (1989). Situated cognition and the culture of learning. Educational Researcher, 18(1), 32-42.",
      AECT_REF(380),
    ],
  },
  {
    seedKey: "concept:cognitive-apprenticeship",
    name: "인지적 도제",
    aectTerm: "인지적 도제",
    altNames: ["Cognitive Apprenticeship"],
    description:
      "전통적 도제가 눈에 보이는 기술을 전수한다면, 인지적 도제는 전문가의 보이지 않는 사고 과정을 가시화해 배우게 하는 교수 모형이다. 전통 도제와의 차이는 세 가지 — 인지적·초인지적 과정을 겉으로 드러내 관찰·수행·연습할 수 있게 하고, 활동을 학습자가 이해할 수 있는 실제 맥락에 두며, 학습 전이를 위해 공통 요소를 성찰하고 말로 설명할 기회를 준다. 내용·방법·계열화·사회학의 네 차원으로 설계하며, 방법 차원은 모델링·코칭·스캐폴딩·발화(명료화)·성찰·탐구로 구성된다.",
    tags: ["교수전략", "도제", "상황학습"],
    references: [
      "Collins, A., Brown, J. S., & Holum, A. (1991). Cognitive apprenticeship: Making thinking visible. American Educator, 15(3), 6-11.",
      AECT_REF(71),
    ],
  },
  {
    seedKey: "concept:advance-organizer",
    name: "선행조직자",
    aectTerm: "선행조직자",
    altNames: ["Advance Organizer"],
    description:
      "본문 학습 내용보다 추상성·일반성·포괄성이 높은 수준에서 핵심 아이디어의 뼈대를 미리 제시하는 도입 자료(Ausubel, 1960). 단순한 개관과 달리 학습자의 기존 인지구조 속 관념과 연결되도록 설계되며, 새 정보가 포괄성 높은 상위 개념 아래 포섭되게 돕는다. 새로운 상위 개념 틀을 제공하는 설명적(expository) 조직자와, 기존 스키마를 활성화해 새 아이디어와의 유사점·차이점을 또렷하게 해 주는 비교적(comparative) 조직자의 두 유형이 있다. 구체적 세부는 생략하고 간결하게 서술할 때 효과가 커진다.",
    tags: ["교수전략", "Ausubel", "유의미학습"],
    references: [
      "Ausubel, D. P. (1960). The use of advance organizers in the learning and retention of meaningful verbal material. Journal of Educational Psychology, 51(5), 267-272.",
      AECT_REF(30),
    ],
  },
  {
    seedKey: "concept:problem-based-learning",
    name: "문제 기반 학습",
    aectTerm: "문제 기반 학습",
    altNames: ["Problem-Based Learning", "PBL", "문제중심학습"],
    description:
      "해당 분야의 실제 현장에서 만날 법한, 실제적이고 복잡하며 도전적인 문제 속에 학습자를 직접 놓는 교육과정 개발·교수·학습 접근. 1970년대 캐나다 맥마스터대학교 의과대학에서 강의로 얻은 지식이 임상 실습으로 옮겨 가지 못하는 문제를 해결하기 위해 창안됐다. 학습자는 문제를 규정하고 필요한 지식을 스스로 찾아 적용하며 교수자는 촉진자 역할을 맡는다. 구성주의적 접근·학습자 중심 수업과 맞닿아 있으며, 비구조화된 문제 설계의 질이 성패를 가른다.",
    tags: ["교수전략", "PBL", "학습자 중심"],
    references: [
      "Barrows, H. S. (1986). A taxonomy of problem-based learning methods. Medical Education, 20(6), 481-486.",
      AECT_REF(330),
    ],
  },
  {
    seedKey: "concept:project-based-learning",
    name: "프로젝트 기반 학습",
    aectTerm: "프로젝트 기반 학습",
    altNames: ["Project-Based Learning", "PjBL"],
    description:
      "실세계 문제에 기초한 추진 질문(driving question)에 답하기 위해 학습자가 탐구·협력하며, 배운 내용을 자신만의 산출물로 표현하는 종합적 교수 방법. 확장된 탐구 과정에서 학습자의 자율성과 자기결정이 보장되지만, 핵심 학습 내용을 다루도록 교수자가 계획하고 촉진한다는 점에서 방임형 활동과 다르다. 산출물 제작에 중점을 둔다는 점에서 문제 기반 학습과, 협동·협력 학습에 초점을 둔다는 점에서 개인 탐구와 구분된다. 협업·의사소통·문제해결·비판적 사고 같은 21세기 역량 함양과 결합해 주목받는다.",
    tags: ["교수전략", "프로젝트", "21세기 역량"],
    references: [
      "Blumenfeld, P. C., Soloway, E., Marx, R. W., Krajcik, J. S., Guzdial, M., & Palincsar, A. (1991). Motivating project-based learning: Sustaining the doing, supporting the learning. Educational Psychologist, 26(3-4), 369-398.",
      AECT_REF(342),
    ],
  },
  {
    seedKey: "concept:self-directed-learning",
    name: "자기주도학습",
    aectTerm: "자기주도학습",
    altNames: ["Self-Directed Learning", "SDL"],
    description:
      "학습자가 자신의 학습 프로젝트를 선택하고 이끌어 갈 수 있도록 스스로 힘을 갖추는 것(empowerment)이자, 교수자의 안내를 최소한으로 받으며 학습목표를 달성하게 하는 교수 기법. Tough(1971)가 성인들이 일상에서 연간 수백 시간의 비형식 학습 프로젝트를 수행한다는 사실을 밝혔고, Knowles(1975)가 성인학습이론(안드라고지)의 일부로 대중화했다. 학습자의 비판적 성찰과 해방까지 지향한다는 철학적 관점도 있다. 자기조절학습이 과제 수행 중의 인지·행동 조절에 초점을 둔다면, 자기주도학습은 무엇을 왜 배울지 결정하는 학습 기획 전반의 주도권을 강조한다.",
    tags: ["성인학습", "자기주도", "안드라고지"],
    references: [
      "Knowles, M. S. (1975). Self-directed learning: A guide for learners and teachers. Association Press.",
      AECT_REF(364),
    ],
  },
  {
    seedKey: "concept:discovery-learning",
    name: "발견학습",
    aectTerm: "발견학습",
    altNames: ["Discovery Learning"],
    description:
      "사람이 능동적인 의미 창조를 통해 새로운 지식을 얻는다고 보는 인식론적 이론이자, 학습자가 문제 공간을 탐구하며 지식을 만들어 내고 일반화하도록 이끄는 귀납적 교수전략. Dewey와 Piaget의 연구에서 출발해 1950년대 후반 Bruner가 이끈 인지 혁명과 함께 확산됐다. 개념·규칙을 먼저 설명하는 연역적(설명식) 접근과 반대로, 학습자는 안내된 초기 경험에 몰입해 스스로 규칙성을 찾아낸다. 탐구 기반 학습과 가까우나, 순수 발견보다 안내된 발견이 효과적이라는 연구가 축적되어 있다.",
    tags: ["교수전략", "Bruner", "귀납적 접근"],
    references: [
      "Bruner, J. S. (1961). The act of discovery. Harvard Educational Review, 31(1), 21-32.",
      AECT_REF(144),
    ],
  },
  {
    seedKey: "concept:blended-learning",
    name: "블렌디드 러닝",
    aectTerm: "블렌디드 러닝",
    altNames: ["Blended Learning", "혼합학습", "혼합형 학습"],
    description:
      "면대면 학습과 온라인(매개된) 학습을 의도적으로 통합하는 학습 형태. 전통 수업 위에 테크놀로지를 얹는 데 그치지 않고, ICT를 활용해 효과적인 설계를 바탕으로 두 양식을 엮어 의도된 학습경험을 만들어 내는 일이다. 무엇을 어떤 비율로 혼합하는가(매체·맥락·동시적/비동시적 커뮤니케이션·접근 방법)에 따라 스펙트럼이 넓어 조작적 정의는 유동적이며, 상호작용과 협력의 촉진, 시공간을 넘어선 확장이 차별화 가치로 꼽힌다. 플립러닝은 대표적인 블렌디드 설계 사례다.",
    tags: ["이러닝", "혼합학습", "설계"],
    references: [
      "Graham, C. R. (2006). Blended learning systems: Definition, current trends, and future directions. In C. J. Bonk & C. R. Graham (Eds.), The handbook of blended learning (pp. 3-21). Pfeiffer.",
      AECT_REF(56),
    ],
  },
  {
    seedKey: "concept:distance-education",
    name: "원격교육",
    aectTerm: "원격교육 및 학습",
    altNames: ["Distance Education and Learning", "원격학습", "Distance Learning"],
    description:
      "교사와 학습자가 물리적으로 떨어진 상태에서 매체를 통해 상호작용하며 이루어지는 교육. 원격학습·분산학습·이러닝·온라인학습·가상학교 등의 용어와 자주 혼용되지만 강조점이 다르다 — 이러닝은 커뮤니케이션 테크놀로지를, 분산학습·원격학습은 학습자의 장소를, 원격교육은 교사와 학습자 양쪽의 관계를 부각한다. 어떤 용어를 선택하는가에는 시사점·가정·가치가 반영되므로 비판적 의식이 필요하다는 지적도 있다. 기관 기반의 형식 교육이라는 점에서 독학과 구별된다.",
    tags: ["이러닝", "원격교육", "온라인학습"],
    references: [
      "Moore, M. G., & Kearsley, G. (2012). Distance education: A systems view of online learning (3rd ed.). Wadsworth.",
      AECT_REF(146),
    ],
  },
  {
    seedKey: "concept:mobile-learning",
    name: "모바일 학습",
    aectTerm: "모바일 학습",
    altNames: ["Mobile Learning", "m-러닝", "엠러닝"],
    description:
      "기술의 유동성과 학습자·학습의 이동성을 전제로, 학습 환경과 공간을 넘나들며 일어나는 모든 유형의 학습. 초기에는 '모바일 기기를 사용하는 이러닝'으로 정의됐으나 기술 중심에서 맥락 중심, 다시 학습자 중심으로 정의가 발전해 왔다. 고정된 컴퓨터에 묶인 이러닝의 제약을 넘어 언제 어디서나 자료에 접근할 수 있다는 점이 출발점이었고, 유비쿼터스 학습(U-러닝)과 가까운 개념으로 다뤄진다. 목적에 따라 강조하는 속성이 달라 정의 자체가 여전히 진화 중인 영역이다.",
    tags: ["이러닝", "모바일", "유비쿼터스"],
    references: [
      "Traxler, J. (2009). Learning in a mobile age. International Journal of Mobile and Blended Learning, 1(1), 1-12.",
      AECT_REF(290),
    ],
  },
  {
    seedKey: "concept:universal-design-for-learning",
    name: "보편적 학습설계",
    aectTerm: "보편적 학습설계",
    altNames: ["Universal Design for Learning", "UDL"],
    description:
      "건축의 보편적 설계에서 출발해, 혜택이 명시적으로 의도되지 않았던 학생까지 포함해 모든 학생이 사용할 수 있는 유연한 교육과정을 만드는 접근(CAST 제안). 학습자 특성은 연속선 위에 있고 모든 학습 요구가 명확히 진단되지는 않는다는 전제에서, 완성 후 덧대는(retrofit) 방식이 아니라 처음부터 다양성을 고려해 설계한다. 텍스트 음성 변환, 큰 글자, 본문 내장 용어사전처럼 특정 집단을 위한 기능이 모두에게 유용해지는 것이 전형적 사례이며, 특수교육 지원을 대체하는 것은 아니다.",
    tags: ["접근성", "UDL", "포용"],
    references: [
      "Rose, D. H., & Meyer, A. (2002). Teaching every student in the digital age: Universal design for learning. ASCD.",
      AECT_REF(404),
    ],
  },
  {
    seedKey: "concept:open-educational-resources",
    name: "공개교육자료",
    aectTerm: "공개교육자료",
    altNames: ["Open Educational Resources", "OER"],
    description:
      "전통적 저작권 제한보다 자유롭게 교수·학습·연구에 사용할 수 있도록 준비되고 허가된 디지털 자료. 콘텐츠 제작·전송·검색과 LMS 운영을 위한 소프트웨어 도구, 학습객체·자기교수 모듈·전체 코스 같은 교육용 콘텐츠, 행정적 지원까지 포괄한다. 자료의 속성보다 접근·사용·수정·공유를 가능하게 하는 기능이 본질이라는 견해(Downes)도 있으며, MIT에서 시작된 오픈코스웨어(OCW) 운동과 교육을 인간의 권리로 선언한 유네스코 2012 파리 세계대회가 확산의 이정표다.",
    tags: ["OER", "개방", "저작권"],
    references: [
      "Atkins, D. E., Brown, J. S., & Hammond, A. L. (2007). A review of the open educational resources (OER) movement: Achievements, challenges, and new opportunities. The William and Flora Hewlett Foundation.",
      AECT_REF(313),
    ],
  },
  {
    seedKey: "concept:learning-object",
    name: "학습객체",
    aectTerm: "학습객체",
    altNames: ["Learning Object", "LO"],
    description:
      "학습을 지원하기 위해 사용·재사용·참조될 수 있는 자원. 가장 넓게는 디지털 여부를 가리지 않는 모든 형식을 포함하는 정의(Wiley, 2000)가 인용되지만, 실무에서는 단원·모듈·코스 단위로 수업을 구성하거나 수업 안에서 재사용할 수 있는 디지털 자원을 가리키는 경우가 많다. 정의가 다양해 디지털 요소의 유무와 학습 목적과의 결합 여부가 구분 기준으로 제안됐다. 메타데이터 표준과 저장소(repository)를 통한 공유·재사용이 실용적 핵심이며, 지식객체·정보객체 등 유사 개념과 함께 논의된다.",
    tags: ["콘텐츠", "재사용", "표준"],
    references: [
      "Wiley, D. A. (2000). Connecting learning objects to instructional design theory: A definition, a metaphor, and a taxonomy. In D. A. Wiley (Ed.), The instructional use of learning objects. AECT.",
      AECT_REF(256),
    ],
  },
  {
    seedKey: "concept:needs-assessment",
    name: "요구사정",
    aectTerm: "요구사정",
    altNames: ["Needs Assessment", "요구분석", "Need Analysis"],
    description:
      "현재 성과와 바람직한 성과 사이의 차이(요구)를 확인하고, 그 차이를 줄이는 데 드는 비용과 방치했을 때의 비용을 견주어 우선순위를 정하는 절차. 해결 대상으로 선정된 요구가 곧 '문제'가 된다(Kaufman). Kaufman·Rossett·Mager 등이 방법론을 발전시켰고 수행분석·전단분석(front-end analysis)이 변형된 형태다. 사정(assessment)은 성과 차이의 확인, 분석(analysis)은 차이의 요소와 근본 원인 규명이라는 구분이 제안되어 두 용어의 혼용을 경계한다. 교수설계 ADDIE의 첫 단계를 이루는 활동이다.",
    tags: ["분석", "요구", "수행공학"],
    references: [
      "Rossett, A. (1987). Training needs assessment. Educational Technology Publications.",
      AECT_REF(305),
    ],
  },
  // ─── 2026-07-12 보강 2차: AECT 갭 12개 (이론·게임·수행공학·조직 계열) ───
  {
    seedKey: "concept:mastery-learning",
    name: "완전학습",
    aectTerm: "완전학습",
    altNames: ["Mastery Learning"],
    description:
      "적절한 학습 상황과 질 높은 수업, 충분한 시간이 주어지면 거의 모든 학생이 높은 수준의 학업성취에 도달할 수 있다고 보는 교수 접근(Carroll, 1963; Bloom, 1976). Carroll이 적성을 '학습에 필요한 시간'으로 재개념화한 학교학습 모형이 출발점이며, Bloom은 학습에 실제로 사용한 시간이 학습 수준을 설명한다고 보고 형성평가-교정 학습의 순환으로 이를 체계화했다. 진도가 아니라 도달 기준(mastery criterion)을 고정하고 시간을 변수로 두는 발상의 전환이 핵심으로, 개별화 수업·완전학습형 이러닝 설계의 이론적 기반이다.",
    tags: ["교수전략", "Bloom", "개별화"],
    references: [
      "Bloom, B. S. (1976). Human characteristics and school learning. McGraw-Hill.",
      "Carroll, J. B. (1963). A model of school learning. Teachers College Record, 64(8), 723-733.",
      AECT_REF(273),
    ],
  },
  {
    seedKey: "concept:anchored-instruction",
    name: "앵커드 교수법",
    aectTerm: "앵커드 교수법",
    altNames: ["Anchored Instruction", "정황 교수", "앵커드 수업"],
    description:
      "실제적 상황을 학습의 기본 닻(anchor)으로 삼는 교육학적 접근. 실제 세계의 상황을 문제와 문제해결 경로의 토대로 제시하고, 추상적 개념이 아니라 학습자에게 친숙한 맥락 위에서 수업을 전개한다. 통합적이고 실제적인 레슨을 위해 주제(theme) 중심으로 구성하기도 하며, 문제해결 연습의 한 부분으로 기능한다. 밴더빌트 인지테크놀로지그룹(CTGV)의 재스퍼 우드베리(Jasper Woodbury) 비디오 시리즈가 대표 사례로, 상황인지·실제적 활동 이론과 맞닿아 있다.",
    tags: ["교수전략", "상황학습", "문제해결"],
    references: [
      "Cognition and Technology Group at Vanderbilt (1990). Anchored instruction and its relationship to situated cognition. Educational Researcher, 19(6), 2-10.",
      AECT_REF(38),
    ],
  },
  {
    seedKey: "concept:dual-coding-theory",
    name: "이중부호화이론",
    aectTerm: "이중부호화이론",
    altNames: ["Dual Coding Theory", "DCT"],
    description:
      "Paivio(1971)가 제안하고 정교화해 온 이론으로, 작동기억에는 언어 정보를 다루는 시스템(로고젠)과 비언어적 객체·사건을 다루는 시스템(이마젠)의 구분된 두 시스템이 있다고 본다. 두 시스템은 독립적으로 작동하되 병렬·동시 작동이 가능하고, '개'라는 단어와 개의 이미지처럼 연계된 연합적 처리가 일어난다. 구체적 단어보다 그림이 더 쉽게 회상된다는 연구 결과에 바탕을 두며, Mayer의 멀티미디어 학습 인지이론이 이중부호화·인지부하·능동적 처리를 통합하면서 이러닝 설계 원리의 뿌리가 되었다.",
    tags: ["인지", "Paivio", "멀티미디어 학습"],
    references: [
      "Paivio, A. (1971). Imagery and verbal processes. Holt, Rinehart & Winston.",
      "Paivio, A. (1986). Mental representations: A dual coding approach. Oxford University Press.",
      AECT_REF(151),
    ],
  },
  {
    seedKey: "concept:distributed-cognition",
    name: "분산인지",
    aectTerm: "분산인지",
    altNames: ["Distributed Cognition"],
    description:
      "인지가 개인의 머릿속에만 있지 않고 사람들 사이, 그리고 문화적으로 제공된 도구·기구에 걸쳐 분산되어 있다고 보는 관점. 인지심리학자이자 인류학자인 Edwin Hutchins가 1990년대 미 군함의 항해 조정 작업을 관찰한 연구에서 발전시켰다. '사람은 다른 사람들과 협력하여, 그리고 문화적으로 제공된 도구의 도움으로 생각한다'(Salomon, 1993)는 명제로 요약되며, 인지는 복잡한 사회문화적 세계 안에서 항상 맥락화된다고 본다. CSCL·인지도구·팀 기반 문제해결 환경 설계의 이론적 근거가 된다.",
    tags: ["인지", "사회문화", "CSCL"],
    references: [
      "Hutchins, E. (1995). Cognition in the wild. MIT Press.",
      "Salomon, G. (Ed.). (1993). Distributed cognitions: Psychological and educational considerations. Cambridge University Press.",
      AECT_REF(148),
    ],
  },
  {
    seedKey: "concept:knowledge-management",
    name: "지식경영",
    aectTerm: "지식경영",
    altNames: ["Knowledge Management", "KM"],
    description:
      "경쟁 우위를 얻고 유지하기 위해 조직 안에서 지식을 수집·개발·공유·적용하는 일련의 활동과 과정. 1990년대에 인지과학의 발전과 인간 학습·메타인지에 대한 이해가 비즈니스 경영 분야와 결합하며 형성됐고, 조직이 물리적 자산보다 인간 자산(지적자본)에 더 큰 가치를 두기 시작한 흐름을 반영한다. 데이터(분절된 사실)-정보(맥락 부여)-지식(경험·의사소통·추론으로 처리된 고차원)의 위계 구분이 기초 개념이며, 인력 노령화·이직에 따른 조직 지식 유출의 해결책으로 주목받는다. 전문가 시스템·조직이론·인지과학이 이론적 기반이다.",
    tags: ["조직", "HRD", "지식"],
    references: [
      "Nonaka, I., & Takeuchi, H. (1995). The knowledge-creating company. Oxford University Press.",
      AECT_REF(240),
    ],
  },
  {
    seedKey: "concept:learning-organization",
    name: "학습조직",
    aectTerm: "학습조직",
    altNames: ["Learning Organization"],
    description:
      "구성원들이 진정으로 원하는 결과를 만들어 내고, 새롭고 확장된 사고방식이 길러지며, 협력적 노력이 가능하고, 함께 학습하는 방법을 지속적으로 알아 가는 조직(Senge, 1990). 전략적 개발의 관점에서 모든 구성원의 학습을 촉진하고, 가치 있는 정보와 지식을 생산해 행동을 바꾸고 최종 결과물을 향상시키는 곳으로 설명된다. 단기 성과가 아닌 장기 지속성에 투자해야 하며, 학습과정에 영향을 미치는 사람·운영 절차(미션과 정책)·문화와 공유 가치의 세 요인이 좌우한다. 지식경영·수행 향상과 함께 조직 차원 교육공학의 핵심 축이다.",
    tags: ["조직", "Senge", "HRD"],
    references: [
      "Senge, P. M. (1990). The fifth discipline: The art and practice of the learning organization. Doubleday.",
      AECT_REF(258),
    ],
  },
  {
    seedKey: "concept:performance-improvement",
    name: "수행 향상",
    aectTerm: "수행 향상",
    altNames: ["Performance Improvement", "PI", "수행공학", "Human Performance Technology", "HPT"],
    description:
      "측정 가능한 수행과 결과 지향적 체제 안에서 조직·절차·개인의 수행을 어떻게 향상시킬지를 다루는 분야. 수행공학(HPT)과 사실상 동의어지만, 도구보다 성과에 초점을 둔다는 뜻에서 '수행 향상'이 선호되기도 한다. 수행의 기회와 문제를 체제적 접근으로 다루면서 교수설계(ID)의 지평을 훈련 바깥(환경·유인·프로세스 개선)으로 확장했다. 가장 널리 쓰이는 ISPI 수행 향상 모형은 수행 분석-원인 분석-인터벤션 선정·설계·개발-실행-평가의 서로 연결된 다섯 요소로 구성된다.",
    tags: ["HPT", "HRD", "수행공학"],
    references: [
      "Van Tiem, D. M., Moseley, J. L., & Dessinger, J. C. (2004). Fundamentals of performance technology (2nd ed.). ISPI.",
      AECT_REF(321),
    ],
  },
  {
    seedKey: "concept:epss",
    name: "전자수행지원 시스템",
    aectTerm: "전자수행지원 시스템",
    altNames: ["Electronic Performance Support System", "EPSS", "수행지원시스템"],
    description:
      "과제 완수를 안내하고 정보를 제공하는, 컴퓨터로 전달되는 수행 향상 인터벤션. 훈련처럼 작업 '이전'에 배우는 것이 아니라 작업이 수행되는 '동안' 적시(just-in-time)에 활용된다는 점이 두드러진 특징이다. 수행자가 작업 맥락 안에서 구체적 과제를 더 잘 해내도록 돕는 적시 정보·자원·도구의 저장소로, '매우 정교한 과학기술적 직무보조(job aid)'로도 설명된다. 과제를 수행하는 동안 필요한 지식과 기술을 자연스럽게 습득하게 한다는 점에서 형식 훈련의 대안·보완재로 다뤄진다.",
    tags: ["HPT", "직무지원", "JIT"],
    references: [
      "Gery, G. (1991). Electronic performance support systems. Weingarten Publications.",
      AECT_REF(162),
    ],
  },
  {
    seedKey: "concept:simulation",
    name: "시뮬레이션",
    aectTerm: "시뮬레이션",
    altNames: ["Simulation"],
    description:
      "특정한 사회적·물리적 실재를 점진적으로 전개하는 사례 연구(evolving case study)로, 참가자가 진짜와 같은 역할을 수행하며 위험과 문제를 다루고 자신의 결정이 미치는 영향을 경험하게 하는 방법(Gredler, 2004). 컴퓨터 기반 시뮬레이션은 자연 또는 인공 시스템·과정의 모델을 포함하는 프로그램으로 정의되며(De Jong & van Joolingen, 1998), 참여자가 가상 시스템의 변수를 조작하고 결과를 관찰하는 경험적 시뮬레이션과 상징적 시뮬레이션으로 나뉜다. 현실을 반영하는 정도인 충실성(fidelity)이 핵심 설계 변수이고, '이기는 것'이 목적인 게임과 구분된다. 군사·의학·비즈니스·과학 교육에서 오랜 역사를 갖는다.",
    tags: ["시뮬레이션", "게임", "경험학습"],
    references: [
      "Gredler, M. E. (2004). Games and simulations and their relationships to learning. In D. H. Jonassen (Ed.), Handbook of research on educational communications and technology (2nd ed., pp. 571-581). Lawrence Erlbaum.",
      AECT_REF(377),
    ],
  },
  {
    seedKey: "concept:digital-game-based-learning",
    name: "디지털 게임 기반 학습",
    aectTerm: "디지털 게임 기반 학습",
    altNames: ["Digital Game-Based Learning", "DGBL", "게임기반학습"],
    description:
      "디지털 게임에 의해 촉진되거나 지원되는 학습. 게임은 '참가자들이 규칙으로 정의된 인위적 갈등에 참여하고 양적인 결과로 나타나는 시스템'(Salen & Zimmerman, 2003)으로 정의되며, 목적 달성을 위해 내용·지식을 적용해야 하는 경쟁적 활동이라는 점이 특징이다. 상용 기성 게임(COTS)을 교수-학습용으로 전용하는 접근과 학습을 위해 처음부터 설계된 기능성 게임(serious game)으로 나뉘고, 시뮬레이션·전략·액션·역할극의 네 핵심 유형(Apperley, 2006)으로 범주화된다. 게이미피케이션(게임 요소의 부분 적용)과 달리 완결된 게임 플레이 자체가 학습 활동이 된다.",
    tags: ["게임", "기능성 게임", "동기"],
    references: [
      "Prensky, M. (2001). Digital game-based learning. McGraw-Hill.",
      AECT_REF(134),
    ],
  },
  {
    seedKey: "concept:pedagogical-agent",
    name: "교육용 에이전트",
    aectTerm: "에이전트",
    altNames: ["Pedagogical Agent", "Agent", "교육학적 에이전트", "학습 에이전트"],
    description:
      "에이전트는 두 가지 의미를 갖는다(Erickson, 1997) — 행동 개시·목표 설정·계획·의사소통·상황 대응을 인간의 직접 통제 없이 수행하는 자율적 컴퓨터 프로그램이라는 의미와, 사용자에게 인간처럼 보이는 생명체의 특징이라는 의미다. 교육 분야에서 가장 자주 논의되는 것은 교육용(pedagogical) 에이전트로, 교육적 상황에서 학습을 지원하거나 촉진하기 위해 고안된 애니메이션 캐릭터를 가리킨다. 움직이고 말하며 사용자와 상호작용하는 인터페이스·애니메이티드·인텔리전트 에이전트 등 다양한 수식어와 결합해 쓰이며, AI 튜터·학습 동반자(learning companion) 연구의 계보로 이어진다.",
    tags: ["에이전트", "AI", "멀티미디어"],
    references: [
      "Johnson, W. L., Rickel, J. W., & Lester, J. C. (2000). Animated pedagogical agents: Face-to-face interaction in interactive learning environments. IJAIED, 11(1), 47-78.",
      AECT_REF(33),
    ],
  },
  {
    seedKey: "concept:cognitive-tools",
    name: "인지도구",
    aectTerm: "인지도구",
    altNames: ["Cognitive Tools", "마인드툴", "Mindtools"],
    description:
      "테크놀로지'로' 학습하는 것(learning with technology)을 가리키는 개념으로, 테크놀로지'로부터' 학습하는 것(learning from technology)과 대비된다. 인지과학적 관점과 더불어 학습을 촉진하기 위해 정보기술을 사고의 파트너로 사용하면서 발달했고, 사회문화적 심리학과 활동이론이 개념 발전의 풍부한 자원을 제공했다. 개념지도·시뮬레이션·데이터베이스·스프레드시트처럼 학습자가 지식을 조직·표상·성찰하도록 인지 부담을 나눠 지는 도구들이 해당하며, Jonassen의 마인드툴(mindtools) 논의로 널리 알려졌다.",
    tags: ["인지", "테크놀로지 통합", "Jonassen"],
    references: [
      "Jonassen, D. H. (2000). Computers as mindtools for schools: Engaging critical thinking (2nd ed.). Merrill.",
      AECT_REF(79),
    ],
  },
  {
    seedKey: "concept:cone-of-experience",
    name: "경험의 원추",
    aectTerm: "경험의 원추",
    altNames: ["Cone of Experience", "데일의 원추"],
    description:
      "Edgar Dale(1946)이 저서 『시청각 교수방법』에서 제시한, 매체가 제공하는 학습 경험을 구체성-추상성 차원으로 배열한 모형. 원추 아래쪽은 직접적·목적적 경험, 위로 갈수록 구성된 경험·극화된 경험·시범·견학·전시·교육 텔레비전·영화·녹음과 정사진·시각기호·언어기호 순으로 추상성이 커진다. 아래가 위보다 우월하다는 경직된 위계가 아니라, 학습자에게 필요한 경험의 구체성 수준에 맞춰 매체를 고르라는 의미다. Dale 자신도 원추를 학습 과정의 정확한 순서로 읽는 오류를 경계했으며, Bruner의 행위적-영상적-상징적 표상 분류와 대응된다.",
    tags: ["매체", "시청각", "Dale"],
    references: [
      "Dale, E. (1969). Audiovisual methods in teaching (3rd ed.). Dryden Press.",
      AECT_REF(103),
    ],
  },

  // ─── 2026-07-12 보강 3차: AECT 갭 9개 (이론·전략·상호작용 계열) ───
  {
    seedKey: "concept:cultural-historical-activity-theory",
    name: "문화역사적 활동이론",
    aectTerm: "문화역사적 활동이론",
    altNames: ["Cultural Historical Activity Theory", "CHAT", "활동이론", "Activity Theory"],
    description:
      "인간의 의식과 학습을 유기체와 환경을 갈라놓는 이원론에서 벗어나, 문화적으로 매개된 활동 속에서 이해하려는 이론적 프레임워크. 1920~30년대 러시아의 Vygotsky와 Leontiev의 작업으로 거슬러 올라가며, 사회문화적 이론·사회역사적 이론과 여러 형태로 함께 언급된다. Vygotsky의 중재된 행위 개념 — 개인은 인공물·도구·타인과의 기호적 상호작용을 통해 의미와 의식을 발달시킨다 — 이 출발점이고, 자극-반응 모형을 크게 벗어나 주체·도구(매개 인공물)·목표(대상)를 인간활동 분석의 최소 단위로 삼는다. CSCL·활동체제 분석 등 교육공학 연구 설계에서 활발히 활용된다.",
    tags: ["학습이론", "Vygotsky", "사회문화"],
    references: [
      "Engeström, Y. (1987). Learning by expanding: An activity-theoretical approach to developmental research. Orienta-Konsultit.",
      AECT_REF(115),
    ],
  },
  {
    seedKey: "concept:elaboration-strategies",
    name: "정교화 전략",
    aectTerm: "정교화 전략",
    altNames: ["Elaboration Strategies", "정교화", "Elaboration"],
    description:
      "학습할 내용과 사전지식 사이에 안정적인 내적 연결을 구축하는 인지전략. 새 정보를 기존 지식에 기대어 확장·연결함으로써 학습과 기억의 효율을 높이고 작동기억의 부담을 줄인다. 바꾸어 말하기·요약·유추·생성적 노트·스스로 질문하고 답하기 등이 대표 기법이며, 실생활 문제해결을 돕는 인지구조 형성을 지향한다. 1970년대 Reigeluth와 동료들은 이를 교수설계 차원으로 확장한 정교화 이론(Elaboration Theory)을 제안해, 단순한 것에서 복잡한 것으로 나아가는 범위·계열 결정의 안내 틀을 제공했다.",
    tags: ["인지", "학습전략", "Reigeluth"],
    references: [
      "Reigeluth, C. M. (1999). The elaboration theory: Guidance for scope and sequence decisions. In C. M. Reigeluth (Ed.), Instructional-design theories and models: A new paradigm of instructional theory (pp. 425-453). Lawrence Erlbaum.",
      AECT_REF(159),
    ],
  },
  {
    seedKey: "concept:conditions-of-learning",
    name: "학습의 조건",
    aectTerm: "학습의 조건",
    altNames: ["Conditions of Learning", "가네의 학습조건"],
    description:
      "Gagné(1985)의 고전적 연구에서 비롯된 개념으로, 학습이 일어나기 위한 조건을 내적 조건과 외적 조건의 두 범주로 나눈다. 내적 조건은 수업 중 학습자 안에서 일어나는 정신적 과정 — 자극을 감각기억으로 수용하고, 장기기억을 위해 자료를 부호화하며, 전이를 위해 일반화하는 것 — 을 말하고, 외적 조건은 이를 지원하도록 밖에서 마련되는 교수 사태를 말한다. 학습이 근본적으로 내면적 활동이라는 인지주의·정보처리이론의 입장을 반영하며, 학습성과 유형별로 다른 조건이 필요하다는 통찰이 9가지 교수사태(events of instruction) 설계의 근거가 된다.",
    tags: ["학습이론", "Gagné", "교수설계"],
    references: [
      "Gagné, R. M. (1985). The conditions of learning and theory of instruction (4th ed.). Holt, Rinehart and Winston.",
      AECT_REF(101),
    ],
  },
  {
    seedKey: "concept:attribution-theory",
    name: "귀인이론",
    aectTerm: "귀인이론",
    altNames: ["Attribution Theory"],
    description:
      "자신의 수행의 질에 대해 학습자가 대는 이유(귀인)가 이후의 동기와 수행에 어떤 영향을 미치는지 설명하는 이론. 학업적 성공·실패에 대한 해석이 동기와 수행을 좌우한다는 것이 핵심이며(Weiner, 1985), 학습자는 결과를 운·과제 난이도·능력·노력 중 하나로 설명하는 경향이 있다. 통제 소재(내적/외적) 개념과 통합되어, 결과를 자신이 통제할 수 있는 요인(특히 노력)에 귀인하는 학습자가 향후 학업에서 더 유리하다는 연구가 축적되었다. 학습 동기 설계·피드백 문구 설계에서 노력 귀인을 촉진하는 근거로 쓰인다.",
    tags: ["동기", "Weiner", "이론적 지향"],
    references: [
      "Weiner, B. (1985). An attributional theory of achievement motivation and emotion. Psychological Review, 92(4), 548-573.",
      AECT_REF(45),
    ],
  },
  {
    seedKey: "concept:inquiry-based-learning",
    name: "탐구 기반 학습",
    aectTerm: "탐구 기반 학습",
    altNames: ["Inquiry-Based Learning", "탐구학습", "탐구기반학습"],
    description:
      "지식이 실제 세계에서 어떻게 작동하는지를 실제적인 방법으로 파고들며 세상을 이해하고 알아가는 역동적 과정. 질문·문제·이슈를 출발점으로 학습자가 스스로 탐구를 설계하고 증거를 모아 결론에 이르며, 교수자는 안내자 역할을 한다. 발견학습과 가까우나, 탐구 기반 프로그램은 학습자가 아이디어를 입증하는 데 과학적이고 논리적인 규칙을 체계적으로 익히게 된다는 점이 강조된다. 과학교육에서 출발해 학습자 중심 수업·문제 기반 학습·프로젝트 기반 학습과 한 계열을 이룬다.",
    tags: ["교수전략", "탐구", "학습자 중심"],
    references: [
      "Kuhlthau, C. C., Maniotes, L. K., & Caspari, A. K. (2007). Guided inquiry: Learning in the 21st century. Libraries Unlimited.",
      AECT_REF(217),
    ],
  },
  {
    seedKey: "concept:learner-centered-instruction",
    name: "학습자 중심 수업",
    aectTerm: "학습자 중심 수업",
    altNames: ["Learner-Centered Instruction", "학습자 중심 교육"],
    description:
      "단일한 교수방법이라기보다 교수자 중심의 반대편에 서는 교수 패러다임. '개별 학습자와 학습 자체에 초점을 둔 관점'(McCombs & Whisler, 1997)으로 정의되며, 구성주의에 기반을 둔다 — 지식은 개별적으로 또는 사회적 합의를 통해 구성되고, 실제 맥락에 연계될 때 더 쉽게 습득된다. 학습자는 교수자가 전달하는 내용을 수동적으로 받는 대신 학습 과정에 능동적으로 참여해 자신의 지식을 구성한다. 미국심리학회(APA) 특별팀이 정리한 학습자 중심 심리학 원리(인지·메타인지, 동기·정서, 발달·사회, 개인차 요인)가 대표적 준거 틀이다.",
    tags: ["교수 패러다임", "구성주의", "학습자 중심"],
    references: [
      "McCombs, B. L., & Whisler, J. S. (1997). The learner-centered classroom and school. Jossey-Bass.",
      AECT_REF(244),
    ],
  },
  {
    seedKey: "concept:feedback",
    name: "피드백",
    aectTerm: "피드백",
    altNames: ["Feedback"],
    description:
      "바람직한 성취를 향한 진행 상황을 점검·평가할 수 있도록 설계된, 목표 달성에 관한 정보(Spector et al., 2008). 학습에 근본적인 요소로(Hattie & Timperley, 2007), 교수설계의 거의 모든 국면에서 발견되며 교수체제설계(ISD)의 이론적 기반이 되는 주요 요소로 꼽힌다. ISD의 순환적 특성 자체가 과정을 개선하는 정보(형성평가)에 의존하고, 수행 능숙도는 연습과 피드백을 함께 요구한다. 수행향상시스템의 중요한 원리이기도 하며, 시기(즉시/지연)·구체성·정서적 톤이 효과를 좌우하는 설계 변수로 연구된다.",
    tags: ["교수전략", "형성평가", "설계 요소"],
    references: [
      "Hattie, J., & Timperley, H. (2007). The power of feedback. Review of Educational Research, 77(1), 81-112.",
      AECT_REF(181),
    ],
  },
  {
    seedKey: "concept:interaction",
    name: "상호작용",
    aectTerm: "상호작용",
    altNames: ["Interaction"],
    description:
      "합의된 단일 정의는 없지만, 교수적 관점에서는 '학습자와 학습환경 간에 서로 영향을 주고받는 상호 교환적 사건'(Nuriddin, 2011)으로 정의된다. 학습자-교수자·학습자-학습자·학습자-내용의 고전적 3유형(Moore)에 학습자-인터페이스를 더한 4유형 구분이 널리 쓰이고, 실시간 여부에 따라 동시적/비동시적 상호작용으로도 나뉜다. 원격교육에서 상호작용은 필요하고 가능해야 하지만 그것이 학습의 전부는 아니며, 강요된 상호작용은 없는 것만큼 해로울 수 있다는 경계도 함께 논의된다. 협력 과정을 통한 지식 구성을 지원하도록 설계하는 것이 요점이다.",
    tags: ["상호작용", "원격교육", "설계 요소"],
    references: [
      "Moore, M. G. (1989). Three types of interaction. American Journal of Distance Education, 3(2), 1-7.",
      AECT_REF(234),
    ],
  },
  {
    seedKey: "concept:just-in-time-learning",
    name: "적시학습",
    aectTerm: "적시학습",
    altNames: ["Just-in-Time Learning", "JIT 학습"],
    description:
      "미래 언젠가 쓸 지식을 미리 배워 두는 전통적·계열적 학습과 달리, 요구가 생기는 바로 그 시점에 필요한 정보를 제공받는 비계열적 학습. 효과적인 학습은 활동·맥락·실제에 내재되어 있을 때 일어난다는 상황학습 관점(Lave & Wenger, 1991)에 뿌리를 두며, 학습의 실제적 요구는 합법적 주변적 참여의 과정을 통해 생겨난다. 직무보조·수행지원(EPSS)이 개인 차원의 적시학습이라면, 소셜 네트워킹 도구와 온라인 실천공동체는 협력 차원의 적시학습 수단을 제공한다. 마이크로러닝·검색 기반 학습의 이론적 배경이기도 하다.",
    tags: ["JIT", "상황학습", "HRD"],
    references: [
      "Lave, J., & Wenger, E. (1991). Situated learning: Legitimate peripheral participation. Cambridge University Press.",
      AECT_REF(237),
    ],
  },

  // ─── 2026-07-13 보강 4차: 『교수학습공학』(이명근, 2025) 학습이론 계열 7종 ───
  // 순화어(purifiedName)는 노션 용어사전집·이 책의 용어 체계 기준. 설명은 자체 재서술.
  {
    seedKey: "concept:classical-conditioning",
    name: "고전적 조건화",
    purifiedName: "고전 조건화",
    altNames: ["Classical Conditioning", "파블로프 조건화", "Pavlovian Conditioning"],
    description:
      "Pavlov(1849~1936)가 소화 생리학 연구(1904년 노벨 생리의학상) 과정에서 발견해 체계화한, 인간 학습에 대한 과학적 탐구의 출발점이 된 이론. 무조건 자극(먹이)에 자연히 따르는 무조건 반응(침 분비) 앞에 중립 자극(종소리)을 반복해서 짝지으면, 중립 자극만으로도 반응이 일어나는 조건 자극-조건 반응의 연합이 형성된다. 학습을 자극 간 연합으로 설명하는 연합론의 원형이지만, 우세한 자극이 다른 자극의 연합을 가로막는 차단(blocking) 같은 현상은 단순한 자극 인접만으로 설명되지 않아, 학습에 대한 다른 관점(인지적 접근)의 필요성을 시사한 한계로 논의된다.",
    tags: ["학습이론", "행동주의", "Pavlov"],
    references: [
      "Pavlov, I. P. (1927). Conditioned reflexes: An investigation of the physiological activity of the cerebral cortex. Oxford University Press.",
      LEE_REF(45),
    ],
  },
  {
    seedKey: "concept:connectionism-conditioning",
    name: "결합 조건화",
    altNames: [
      "Connectionism",
      "도구적 조건화",
      "수단 조건화",
      "Instrumental Conditioning",
      "시행착오 학습",
      "Trial-and-Error Learning",
      "효과의 법칙",
      "Law of Effect",
    ],
    description:
      "최초의 현대 학습이론가로 평가되는 Thorndike(1874~1949)의 이론. 학습을 자극과 반응 사이의 결합(connection)이 형성·강화되는 과정으로 보며, 시행착오를 거쳐 보상을 얻는 데 성공한 반응이 살아남는다는 점에서 수단(도구적) 조건화로도 분류된다. 학습의 전제 조건으로 준비도의 법칙·연습의 법칙·효과의 법칙의 3대 학습법칙을 제시했고, 특히 만족스러운 결과가 뒤따른 결합이 강해진다는 효과의 법칙은 이후 Skinner의 강화 개념으로 이어지는 다리가 되었다. 진화론의 영향을 받은 기능주의적 입장에서 교육 문제 해결에 이론을 적용할 것을 역설한 학자이기도 하다.",
    tags: ["학습이론", "행동주의", "Thorndike"],
    references: [
      "Thorndike, E. L. (1911). Animal intelligence: Experimental studies. Macmillan.",
      LEE_REF(57),
    ],
  },
  {
    seedKey: "concept:contiguous-conditioning",
    name: "인접 조건화",
    altNames: ["Contiguous Conditioning", "근접 조건형성", "Contiguity Theory"],
    description:
      "Guthrie(1886~1959)가 고전 조건화(Pavlov)와 결합 조건화(Thorndike)의 영향 아래 수립한 이론으로, 자극과 반응이 시간적으로 붙어(인접) 일어나는 것 자체를 학습의 충분조건으로 본다. 강화나 반복 없이도 어떤 자극 상황에서 마지막으로 한 행동이 그 상황과 단번에 연합된다는 일회시행 학습(one-trial learning)이 특징적 주장이다. 습관을 고치려면 나쁜 반응을 부르는 자극 상황에서 다른 반응이 일어나게 만들라는 습관 교정법(역치법·피로법·상반자극법)이 실천적 함의로 꼽히며, 연합론적 행동주의의 독특한 갈래로 생명력을 유지하고 있다.",
    tags: ["학습이론", "행동주의", "Guthrie"],
    references: [
      "Guthrie, E. R. (1952). The psychology of learning (Rev. ed.). Harper & Row.",
      LEE_REF(69),
    ],
  },
  {
    seedKey: "concept:operant-conditioning",
    name: "조작적 조건화",
    purifiedName: "작동 조건화",
    altNames: ["Operant Conditioning", "작동적 조건화", "작동 조건화"],
    description:
      "Skinner가 정립한 이론으로, 행동을 유발하는 사전 자극을 정확히 짚을 수 있는 고전·결합 조건화와 달리, 유기체가 먼저 방출한 행동(작동 반응)이 그 뒤에 따라오는 결과에 의해 미래 발생 가능성이 결정된다고 본다. 학습의 본질은 '강화 유관(reinforcement contingency)에 의한 작동 반응의 조형(shaping)'으로 요약된다. 결과가 행동을 늘리면 강화, 줄이면 벌이며, 여기서의 강화인(reinforcer)은 목표 달성의 수단으로 주어지는 보상(reward)과 개념적으로 구분된다. 프로그램 수업·행동목표·수행 중심 설계 등 교육공학 초기 방법론의 직접적 뿌리다.",
    tags: ["학습이론", "행동주의", "Skinner"],
    references: [
      "Skinner, B. F. (1953). Science and human behavior. Macmillan.",
      LEE_REF(79),
    ],
  },
  {
    seedKey: "concept:gestalt-learning-theory",
    name: "형태주의 학습이론",
    altNames: ["Gestalt Theory", "게슈탈트 이론", "통찰학습", "Insight Learning"],
    description:
      "Köhler·Koffka·Lewin 등이 발전시킨, 행동주의의 요소 분해적 접근에 맞서 학습을 지각 전체 구조(형태, Gestalt)의 재조직으로 설명하는 이론. 근본 원리는 모든 심리적 사상이 유의미하고 완전하며 단순해지려는 경향을 지닌다는 함축의 원리(law of Prägnanz)이고, 그 아래 완결성·근린성·유사성·연속성·공통행선의 지각 원리들이 놓인다. 학습자는 자극 상황과 상호작용하는 가운데 지각의 변화로 형태를 파악하며 — 문제 상황의 요소 관계를 한순간에 재구조화하는 통찰(insight)이 대표 현상 — 문제에 대한 정확한 표상 형성을 학습의 본질로 본다는 점에서 인지주의의 선구가 되었다.",
    tags: ["학습이론", "인지주의", "Gestalt"],
    references: [
      "Köhler, W. (1925). The mentality of apes. Harcourt, Brace.",
      LEE_REF(93),
    ],
  },
  {
    seedKey: "concept:latent-learning",
    name: "잠재학습",
    purifiedName: "신호학습",
    altNames: [
      "Latent Learning",
      "Sign Learning",
      "목적적 행동주의",
      "Purposive Behaviorism",
      "인지도",
      "Cognitive Map",
    ],
    description:
      "Tolman(1886~1959)이 수립한 이론으로, 강화 없이도 학습이 일어나 저장되었다가 필요할 때 수행으로 드러난다는 잠재학습 현상을 통해 학습과 수행을 개념적으로 분리했다. 유기체는 자극-반응의 기계적 연쇄가 아니라 '무엇이 무엇으로 이어지는가'라는 신호-의미 관계(sign-significate)를 학습하며, 미로를 학습한 쥐가 공간의 인지도(cognitive map)를 형성한다는 실험이 유명하다. 환경 변인과 개인차 변인 사이에 가설·욕구·식별·운동기능 같은 중재 변인을 두어 행동을 설명한 목적적 행동주의는 행동주의와 인지주의를 잇는 가교로 평가된다.",
    tags: ["학습이론", "인지주의 가교", "Tolman"],
    references: [
      "Tolman, E. C. (1948). Cognitive maps in rats and men. Psychological Review, 55(4), 189-208.",
      LEE_REF(107),
    ],
  },
  {
    seedKey: "concept:observational-learning",
    name: "관찰학습",
    altNames: [
      "Observational Learning",
      "사회학습이론",
      "Social Learning Theory",
      "사회인지이론",
      "Social Cognitive Theory",
      "모델링",
      "Modeling",
    ],
    description:
      "Bandura가 체계화한 이론으로, 인간은 직접 강화를 받지 않아도 타인(모델)의 행동과 그 결과를 관찰하는 것만으로 학습한다고 본다. 선택적 주의집중으로 파지된 인지 표상이 본보기(template) 역할을 하고, 인지적 연습을 거쳐 부호화·저장되었다가 긍정적 결과(강화)가 예상될 때 행동으로 산출된다 — 주의·파지·산출·동기의 과정 구분이 여기서 나온다. 모델이 강화받는 것을 보는 대리 강화는 기대를 형성하고 동기를 유발하는 정보적 기능을 하며, 자기 관찰·자기 평가에서 오는 내적(자기) 강화가 외재적 강화보다 강력하다는 행동의 자기조절 원리는 자기효능감·자기조절학습 이론으로 발전했다.",
    tags: ["학습이론", "사회인지", "Bandura"],
    references: [
      "Bandura, A. (1977). Social learning theory. Prentice-Hall.",
      LEE_REF(145),
    ],
  },
];

// ─── 변인 (Variables) ─────────────────────────────────────────
// seedKey 형식: `variable:{kebab-slug}` — 사용자가 이름 수정해도 동일 항목 인식.
export const SEED_VARIABLES: SeedVariable[] = [
  {
    seedKey: "variable:academic-self-efficacy",
    name: "학업적 자기효능감",
    altNames: ["Academic Self-Efficacy"],
    description:
      "학업 과제를 성공적으로 수행할 수 있다는 학습자의 신념. 자신감·자기조절효능감·과제난이도선호의 하위 요인으로 구성되며, 학업성취도·학습몰입·학습 지속성과 정적 상관을 보이는 대표적 정의적 학습 변인.",
    type: "affective",
    tags: ["자기효능감", "동기"],
    references: [
      // 검증결과: 김아영(2007) 교육심리연구 인용은 RISS/KCI 검증 불가 → 1차 척도 논문 김아영·박인영(2001)로 정정
      "김아영, 박인영 (2001). 학업적 자기효능감 척도 개발 및 타당화 연구. 교육학연구, 39(1), 95-123.",
    ],
  },
  {
    seedKey: "variable:intrinsic-motivation",
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
    seedKey: "variable:learning-flow",
    name: "학습몰입",
    altNames: ["Learning Engagement", "Flow"],
    description:
      "학습 활동에 깊이 몰두하여 시간 감각이 사라지고 자기의식이 약해지는 최적 경험 상태. 인지적·정의적·행동적 몰입의 다차원 구조로 측정되며, 학업성취·학습 만족도의 핵심 예측 변인.",
    type: "affective",
    tags: ["몰입", "정의적 영역"],
    references: [
      // 검증결과: 석임복(2007) 박사학위논문 제목 정정 (RISS 실제 제목)
      "석임복 (2007). 학습 몰입의 구조: 척도, 성격, 조건, 관여. 경북대학교 박사학위논문.",
    ],
  },
  {
    seedKey: "variable:academic-achievement",
    name: "학업성취도",
    altNames: ["Academic Achievement"],
    description:
      "학습 목표 달성 정도를 객관적으로 측정한 결과. 시험 점수·과제 점수·총점·학점 등으로 조작화되며, 거의 모든 교육공학 효과성 연구의 핵심 종속 변인.",
    type: "cognitive",
    tags: ["성취", "결과 변인"],
    references: [],
  },
  {
    seedKey: "variable:learning-satisfaction",
    name: "학습 만족도",
    altNames: ["Learning Satisfaction"],
    description:
      "학습 경험·내용·방법·환경에 대한 학습자의 정서적 평가. 이러닝·블렌디드 러닝 효과 연구의 표준 결과 변인이며, 학습 지속의도와 강한 정적 상관을 가진다.",
    type: "affective",
    tags: ["만족도", "이러닝"],
    references: [
      // 검증결과: 임정훈(2003) 교육공학연구 19(2) — 검증 round 미포함, 보수적으로 제거. 운영진 RISS 확인 후 보강 권장.
    ],
  },
  {
    seedKey: "variable:srl-strategies",
    name: "자기조절 학습전략",
    altNames: ["Self-Regulated Learning Strategies"],
    description:
      "학습자가 학습 목표 달성을 위해 사용하는 인지적·메타인지적·자원관리 전략의 총체. 시연·정교화·조직화·계획·점검·노력관리 등의 하위 전략으로 측정된다.",
    type: "behavioral",
    tags: ["자기조절", "학습전략"],
    references: [
      // 검증결과: 양명희(2002) 박사학위논문 제목 정정 (RISS 실제 제목)
      "양명희 (2002). 자기조절학습 구성변인과 학업 성취와의 관계 연구. 서울대학교 박사학위논문.",
    ],
  },
  {
    seedKey: "variable:extraneous-cognitive-load",
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
    seedKey: "variable:continuance-intention",
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

  // ─── 2026-06 보강: 교육공학 석사 논문 빈출 변인 11개 추가 ───
  // 영문 정전(canonical) 1차 출처만 인용 — 한국어 KCI 인용 할루시네이션 리스크 회피.
  {
    seedKey: "variable:task-value",
    name: "과제가치",
    altNames: ["Task Value", "과제 가치 지각"],
    description:
      "학습 과제가 자신에게 얼마나 중요하고 유용하며 흥미로운지에 대한 학습자의 지각. 기대-가치 이론(expectancy-value theory)의 핵심 구인으로 내재적 흥미가치·달성가치·효용가치·비용의 하위 차원으로 구분된다. MSLQ 동기 영역의 하위 척도로 측정되는 경우가 많으며, 학습 지속·과목 선택·성취를 예측한다.",
    type: "affective",
    tags: ["동기", "기대가치이론"],
    references: [
      "Wigfield, A., & Eccles, J. S. (2000). Expectancy-value theory of achievement motivation. Contemporary Educational Psychology, 25(1), 68-81.",
    ],
  },
  {
    seedKey: "variable:achievement-goal-orientation",
    name: "성취목표지향성",
    altNames: ["Achievement Goal Orientation", "목표지향성"],
    description:
      "학습자가 성취 상황에서 추구하는 목표의 질적 유형. Elliot & McGregor(2001)의 2×2 프레임워크가 표준으로, 숙달접근·숙달회피·수행접근·수행회피의 4유형으로 구분된다. 학습전략 사용·시험불안·내재적 동기와의 차별적 관계가 반복 검증되어 교육공학 실험 연구의 공변량·조절변인으로 자주 투입된다.",
    type: "affective",
    tags: ["동기", "목표", "2x2 프레임워크"],
    references: [
      "Elliot, A. J., & McGregor, H. A. (2001). A 2 × 2 achievement goal framework. Journal of Personality and Social Psychology, 80(3), 501-519.",
    ],
  },
  {
    seedKey: "variable:teaching-presence",
    name: "교수실재감",
    altNames: ["Teaching Presence", "교수적 실재감"],
    description:
      "온라인 학습 환경에서 의미 있는 학습 성과를 위해 인지적·사회적 과정을 설계·촉진·직접 지도하는 교수자 활동에 대한 학습자의 지각. CoI(탐구공동체) 모델의 3실재감 중 하나로, 설계와 조직·담화 촉진·직접 교수의 3개 하위 범주로 측정된다. 원격수업 만족도·학습성과 연구의 핵심 예측 변인.",
    type: "environmental",
    tags: ["CoI", "온라인학습", "실재감"],
    references: [
      "Anderson, T., Rourke, L., Garrison, D. R., & Archer, W. (2001). Assessing teaching presence in a computer conferencing context. Journal of Asynchronous Learning Networks, 5(2), 1-17.",
    ],
  },
  {
    seedKey: "variable:social-presence",
    name: "사회적 실재감",
    altNames: ["Social Presence"],
    description:
      "온라인 환경에서 학습자가 자신을 '실제 사람'으로 드러내고 타인을 실재하는 존재로 지각하는 정도. 정서적 표현·개방적 의사소통·집단 응집성의 하위 범주로 측정된다(CoI 모델). 원격·블렌디드 학습의 만족도와 지속의도를 매개하는 대표 변인.",
    type: "affective",
    tags: ["CoI", "온라인학습", "실재감"],
    references: [
      "Short, J., Williams, E., & Christie, B. (1976). The social psychology of telecommunications. Wiley.",
      "Garrison, D. R., Anderson, T., & Archer, W. (2000). Critical inquiry in a text-based environment: Computer conferencing in higher education. The Internet and Higher Education, 2(2-3), 87-105.",
    ],
  },
  {
    seedKey: "variable:cognitive-presence",
    name: "인지적 실재감",
    altNames: ["Cognitive Presence"],
    description:
      "지속적 성찰과 담화를 통해 학습자가 의미를 구성하고 확인해 가는 정도. 촉발 사건(triggering event)→탐색(exploration)→통합(integration)→해결(resolution)의 실천적 탐구(practical inquiry) 4단계로 조작화된다. CoI 모델 3실재감 중 학습의 인지적 깊이를 직접 반영하는 변인.",
    type: "cognitive",
    tags: ["CoI", "온라인학습", "실재감"],
    references: [
      "Garrison, D. R., Anderson, T., & Archer, W. (2001). Critical thinking, cognitive presence, and computer conferencing in distance education. American Journal of Distance Education, 15(1), 7-23.",
    ],
  },
  {
    seedKey: "variable:learner-interaction",
    name: "상호작용",
    altNames: ["Interaction", "학습자 상호작용"],
    description:
      "원격·온라인 학습에서 일어나는 의사소통적 교류. Moore(1989)의 고전적 구분에 따라 학습자-내용, 학습자-교수자, 학습자-학습자 상호작용의 3유형으로 측정된다. 이러닝 설계 품질·실재감·만족도 연구에서 독립 또는 매개 변인으로 광범위하게 사용된다.",
    type: "behavioral",
    tags: ["원격교육", "이러닝", "Moore"],
    references: [
      "Moore, M. G. (1989). Editorial: Three types of interaction. American Journal of Distance Education, 3(2), 1-7.",
    ],
  },
  {
    seedKey: "variable:learner-engagement",
    name: "학습참여",
    altNames: ["Learner Engagement", "Student Engagement", "학업열의"],
    description:
      "학습 활동에 대한 행동적(참여·노력)·정서적(흥미·소속감)·인지적(전략·자기조절) 투입의 총체. 몰입(flow)이 순간적 최적 경험이라면 참여(engagement)는 비교적 지속적인 상태로 구분된다. 학업열의(academic engagement) 전통에서는 활력·헌신·몰두의 3요인(UWES-S)으로 측정된다.",
    type: "behavioral",
    tags: ["참여", "열의", "다차원"],
    references: [
      "Fredricks, J. A., Blumenfeld, P. C., & Paris, A. H. (2004). School engagement: Potential of the concept, state of the evidence. Review of Educational Research, 74(1), 59-109.",
    ],
  },
  {
    seedKey: "variable:mental-effort",
    name: "정신적 노력",
    altNames: ["Mental Effort", "주관적 인지부하"],
    description:
      "과제 수행 중 학습자가 투입했다고 지각하는 인지적 자원의 양. Paas(1992)의 단일 문항 9점 척도가 인지부하 연구의 고전적 조작화이며, 수행 점수와 결합해 교수 효율성(instructional efficiency) 지표를 산출하는 데 쓰인다. 전체 작업부하는 NASA-TLX 로 다차원 측정한다.",
    type: "cognitive",
    tags: ["인지부하", "주관적 측정"],
    references: [
      "Paas, F. G. W. C. (1992). Training strategies for attaining transfer of problem-solving skill in statistics: A cognitive-load approach. Journal of Educational Psychology, 84(4), 429-434.",
    ],
  },
  {
    seedKey: "variable:learning-transfer",
    name: "학습전이",
    altNames: ["Learning Transfer", "Transfer of Training", "교육훈련전이"],
    description:
      "교육·훈련에서 학습한 지식과 기술을 실제 직무·새로운 맥락에 일반화하여 적용하고 유지하는 정도. Baldwin & Ford(1988)의 전이 모형(학습자 특성·훈련 설계·작업 환경)이 표준 프레임이며, HRD·기업교육 프로그램 효과성 연구의 핵심 종속 변인.",
    type: "behavioral",
    tags: ["HRD", "기업교육", "전이"],
    references: [
      "Baldwin, T. T., & Ford, J. K. (1988). Transfer of training: A review and directions for future research. Personnel Psychology, 41(1), 63-105.",
    ],
  },
  {
    seedKey: "variable:digital-literacy",
    name: "디지털 리터러시",
    altNames: ["Digital Literacy", "디지털 문해력"],
    description:
      "디지털 도구와 정보를 비판적으로 탐색·평가·활용·창출할 수 있는 역량을 변인으로 조작화한 것. Ng(2012)는 기술적(technical)·인지적(cognitive)·사회정서적(social-emotional) 차원의 교차 모형을 제안했다. 에듀테크 수용·온라인 학습 성과 연구에서 선행 변인이나 조절 변인으로 투입된다.",
    type: "cognitive",
    tags: ["역량", "에듀테크"],
    references: [
      "Ng, W. (2012). Can we teach digital natives digital literacy? Computers & Education, 59(3), 1065-1078.",
    ],
  },
  {
    seedKey: "variable:technostress",
    name: "테크노스트레스",
    altNames: ["Technostress"],
    description:
      "정보통신기술 사용 요구에 적응하는 과정에서 경험하는 스트레스. Ragu-Nathan et al.(2008)은 과부하(techno-overload)·침습(invasion)·복잡성(complexity)·불안정(insecurity)·불확실성(uncertainty)의 5개 유발요인으로 구조화했다. 교사의 에듀테크 수용·원격수업 피로 연구에서 부적 선행 변인으로 사용된다.",
    type: "affective",
    tags: ["에듀테크", "스트레스", "교사"],
    references: [
      "Ragu-Nathan, T. S., Tarafdar, M., Ragu-Nathan, B. S., & Tu, Q. (2008). The consequences of technostress for end users in organizations: Conceptual development and empirical validation. Information Systems Research, 19(4), 417-433.",
      "Brod, C. (1984). Technostress: The human cost of the computer revolution. Addison-Wesley.",
    ],
  },
];

// ─── 측정도구 (Measurement Tools) ─────────────────────────────
// seedKey 형식: `measurement:{kebab-slug}` — 사용자가 이름 수정해도 동일 항목 인식.
export const SEED_MEASUREMENTS: SeedMeasurement[] = [
  {
    seedKey: "measurement:academic-self-efficacy-kim-2007",
    name: "학업적 자기효능감 척도 (김아영, 2007)",
    altNames: ["Academic Self-Efficacy Scale"],
    description:
      "한국 학습자의 학업적 자기효능감을 측정하는 KCI 표준 척도. 척도 원개발은 김아영·박인영(2001, 교육학연구 39(1))이며 김아영(2007) 저서에 수록·확산되었다. 자신감·자기조절효능감·과제난이도선호의 3개 하위 요인 28문항으로 구성되고, 중간(중립) 없는 6점 강제선택형으로 응답한다.",
    originalName: "Academic Self-Efficacy Scale (Korean version)",
    author: "김아영·박인영 (2001) / 김아영 (2007) 저서 수록",
    itemCount: 28,
    scaleType: "6점 Likert (1=전혀 그렇지 않다 ~ 6=매우 그렇다, 중립 없는 짝수형)",
    reliability: "Cronbach α = .87 (전체) / 하위 요인 .76~.85",
    validity: "확인적 요인분석으로 3요인 구조 검증 (CFI > .90, RMSEA < .08)",
    sampleItems: [
      "나는 어려운 과제도 노력하면 해낼 수 있다.",
      "나는 새로운 학습 내용도 잘 이해할 수 있다.",
      "어려운 문제를 푸는 것이 흥미롭다.",
    ],
    tags: ["자기효능감", "한국형", "KCI"],
    references: [
      // 검증결과: 1차 척도 논문은 김아영·박인영(2001) 교육학연구 — 단행본은 학지사 2007년 발간
      "김아영, 박인영 (2001). 학업적 자기효능감 척도 개발 및 타당화 연구. 교육학연구, 39(1), 95-123.",
      "김아영 (2007). 학업적 자기효능감: 이론과 현장연구. 학지사.",
    ],
  },
  {
    seedKey: "measurement:mslq",
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
    seedKey: "measurement:k-molt",
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
      // 검증결과: 석임복(2007) 박사학위논문 제목 정정 (RISS 실제 제목)
      "석임복 (2007). 학습 몰입의 구조: 척도, 성격, 조건, 관여. 경북대학교 박사학위논문.",
    ],
  },
  {
    seedKey: "measurement:srl-yang-2002",
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
      // 검증결과: 양명희(2002) 박사학위논문 제목 정정 (RISS 실제 제목)
      "양명희 (2002). 자기조절학습 구성변인과 학업 성취와의 관계 연구. 서울대학교 박사학위논문.",
    ],
  },
  {
    seedKey: "measurement:cognitive-load-leppink-2013",
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
    seedKey: "measurement:tam-davis-1989",
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
    seedKey: "measurement:imi",
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
      "Ryan, R. M. (1982). Control and information in the intrapersonal sphere: An extension of cognitive evaluation theory. Journal of Personality and Social Psychology, 43(3), 450-461.",
    ],
  },

  // ─── 2026-06 보강: 정전(canonical) 측정도구 10개 추가 ───
  // 원전 서지·신뢰도는 2026-06 웹 검증 완료. 확인 불가한 수치(문항수·α)는 필드 생략.
  {
    seedKey: "measurement:imms-keller-2010",
    name: "IMMS 학습동기 검사 (Keller, 2010)",
    altNames: ["Instructional Materials Motivation Survey"],
    description:
      "Keller 의 ARCS 모형에 기반해 특정 교수자료에 대한 학습자의 동기 반응을 측정하는 상황 특수적 도구. 주의집중(12)·관련성(9)·자신감(9)·만족감(6)의 4개 하위 척도 36문항. 이러닝·멀티미디어 콘텐츠의 동기 설계 효과 검증에서 표준 도구로 사용된다.",
    originalName: "Instructional Materials Motivation Survey (IMMS)",
    author: "Keller, J. M. (2010)",
    itemCount: 36,
    scaleType: "5점 Likert",
    reliability: "Cronbach α = .96 (전체) / 주의 .89, 관련성 .81, 자신감 .90, 만족감 .92 (Keller, 2010)",
    validity: "ARCS 4요인 구조 — 다수 후속 타당화 연구(Loorbach et al., 2015 등)",
    tags: ["동기", "ARCS", "교수자료"],
    references: [
      "Keller, J. M. (2010). Motivational design for learning and performance: The ARCS model approach. Springer.",
      "Loorbach, N., Peters, O., Karreman, J., & Steehouder, M. (2015). Validation of the Instructional Materials Motivation Survey (IMMS) in a self-directed instructional setting. British Journal of Educational Technology, 46(1), 204-218.",
    ],
  },
  {
    seedKey: "measurement:flow-state-scale",
    name: "Flow State Scale (Jackson & Marsh, 1996)",
    altNames: ["FSS", "몰입상태척도"],
    description:
      "Csikszentmihalyi 몰입 이론의 9차원(도전-기술 균형, 행위-의식 통합, 명확한 목표, 모호하지 않은 피드백, 과제 집중, 통제감, 자의식 상실, 시간 변형, 자기목적적 경험)을 각 4문항씩 측정하는 36문항 도구. 스포츠 맥락에서 개발되었으나 학습·게임·이러닝 몰입 연구로 광범위하게 확장되었다.",
    originalName: "Flow State Scale (FSS)",
    author: "Jackson, S. A., & Marsh, H. W. (1996)",
    itemCount: 36,
    scaleType: "5점 Likert",
    validity: "확인적 요인분석으로 9개 1차 요인 + 1개 상위요인 구조 지지 (원전)",
    tags: ["몰입", "다차원", "flow"],
    references: [
      "Jackson, S. A., & Marsh, H. W. (1996). Development and validation of a scale to measure optimal experience: The Flow State Scale. Journal of Sport and Exercise Psychology, 18(1), 17-35.",
    ],
  },
  {
    seedKey: "measurement:nasa-tlx",
    name: "NASA-TLX (Hart & Staveland, 1988)",
    altNames: ["NASA Task Load Index", "작업부하지수"],
    description:
      "과제 수행의 주관적 작업부하(workload)를 정신적 요구·신체적 요구·시간적 요구·수행·노력·좌절의 6개 차원으로 측정하는 다차원 평정 도구. 각 차원을 0~100 시각 아날로그형 척도로 평정하고, 쌍대비교 가중치를 결합해 종합 점수를 산출한다(가중 생략 Raw TLX 변형도 통용). 인지부하·UX·시뮬레이션 학습 연구의 범용 도구.",
    originalName: "NASA Task Load Index (NASA-TLX)",
    author: "Hart, S. G., & Staveland, L. E. (1988)",
    itemCount: 6,
    scaleType: "차원별 0~100 평정 (+ 쌍대비교 가중)",
    validity: "16개 실험·다양한 과제 유형에 걸친 경험적 개발 (원전)",
    sampleItems: [
      "이 과제는 정신적으로 얼마나 부담스러웠습니까? (정신적 요구)",
      "과제를 수행하기 위해 얼마나 열심히 노력해야 했습니까? (노력)",
    ],
    tags: ["인지부하", "작업부하", "다차원"],
    references: [
      "Hart, S. G., & Staveland, L. E. (1988). Development of NASA-TLX (Task Load Index): Results of empirical and theoretical research. In P. A. Hancock & N. Meshkati (Eds.), Human mental workload (pp. 139-183). North-Holland.",
    ],
  },
  {
    seedKey: "measurement:paas-mental-effort",
    name: "Paas 정신적 노력 척도 (Paas, 1992)",
    altNames: ["Mental Effort Rating Scale", "주관적 인지부하 척도"],
    description:
      "학습·과제 수행에 투입한 정신적 노력을 '매우 매우 낮음'부터 '매우 매우 높음'까지 9점 단일 문항으로 평정하는 인지부하 연구의 고전적 도구. 간편성 덕분에 과제 직후 반복 측정이 가능하며, 수행 점수와 결합한 교수 효율성(instructional efficiency) 지표 산출에 사용된다.",
    originalName: "9-point Mental Effort Rating Scale",
    author: "Paas, F. G. W. C. (1992)",
    itemCount: 1,
    scaleType: "9점 평정 (단일 문항)",
    sampleItems: [
      "방금 과제를 수행하는 데 투입한 정신적 노력의 정도를 평정하시오 (1=매우 매우 낮음 ~ 9=매우 매우 높음).",
    ],
    tags: ["인지부하", "단일문항"],
    references: [
      "Paas, F. G. W. C. (1992). Training strategies for attaining transfer of problem-solving skill in statistics: A cognitive-load approach. Journal of Educational Psychology, 84(4), 429-434.",
    ],
  },
  {
    seedKey: "measurement:coi-survey",
    name: "CoI 설문 (Arbaugh et al., 2008)",
    altNames: ["Community of Inquiry Survey", "탐구공동체 설문"],
    description:
      "Garrison 등의 탐구공동체(CoI) 모델 3실재감을 측정하는 표준 도구. 교수실재감 13문항·사회적 실재감 9문항·인지적 실재감 12문항의 총 34문항으로 구성되며, 다기관 표본(미국·캐나다 4개 대학원)에서 타당화되었다. 온라인·블렌디드 학습 연구의 사실상 표준 척도.",
    originalName: "Community of Inquiry (CoI) Survey Instrument",
    author: "Arbaugh, Cleveland-Innes, Diaz, Garrison, Ice, Richardson, & Swan (2008)",
    itemCount: 34,
    scaleType: "5점 Likert (0~4)",
    reliability: "Cronbach α = .94 (교수실재감) / .91 (사회적 실재감) / .95 (인지적 실재감)",
    validity: "다기관 표본 요인분석으로 3요인 구조 지지 (원전)",
    tags: ["CoI", "실재감", "온라인학습"],
    references: [
      "Arbaugh, J. B., Cleveland-Innes, M., Diaz, S. R., Garrison, D. R., Ice, P., Richardson, J. C., & Swan, K. P. (2008). Developing a community of inquiry instrument: Testing a measure of the Community of Inquiry framework using a multi-institutional sample. The Internet and Higher Education, 11(3-4), 133-136.",
    ],
  },
  {
    seedKey: "measurement:uwes-s",
    name: "UWES-S 학업열의 척도 (Schaufeli et al., 2002)",
    altNames: ["Utrecht Work Engagement Scale-Student", "학업참여 척도"],
    description:
      "직무열의 척도(UWES)를 학생용으로 번안한 학업열의(academic engagement) 측정 도구. 활력(vigor)·헌신(dedication)·몰두(absorption)의 3요인 17문항으로, 스페인·포르투갈·네덜란드 대학생 표본의 국가 간 비교 연구에서 타당화되었다. 9문항 단축형(UWES-9S)도 널리 사용된다.",
    originalName: "Utrecht Work Engagement Scale - Student (UWES-S)",
    author: "Schaufeli, Martínez, Marques Pinto, Salanova, & Bakker (2002)",
    itemCount: 17,
    scaleType: "7점 빈도 척도 (0=전혀 없음 ~ 6=항상)",
    validity: "3개국 표본 확인적 요인분석으로 3요인 구조 지지 (원전)",
    tags: ["학업열의", "참여", "다차원"],
    references: [
      "Schaufeli, W. B., Martínez, I. M., Marques Pinto, A., Salanova, M., & Bakker, A. B. (2002). Burnout and engagement in university students: A cross-national study. Journal of Cross-Cultural Psychology, 33(5), 464-481.",
    ],
  },
  {
    seedKey: "measurement:agq",
    name: "AGQ 성취목표 설문 (Elliot & McGregor, 2001)",
    altNames: ["Achievement Goal Questionnaire", "2x2 성취목표 척도"],
    description:
      "성취목표를 숙달접근·숙달회피·수행접근·수행회피의 2×2 프레임워크로 측정하는 12문항 도구(목표 유형별 3문항). 요인분석으로 4구인의 독립성이 지지되었으며, 이후 문항 표현을 목표 정의에 정밀화한 개정판 AGQ-R(Elliot & Murayama, 2008)이 발표되었다.",
    originalName: "Achievement Goal Questionnaire (AGQ)",
    author: "Elliot, A. J., & McGregor, H. A. (2001)",
    itemCount: 12,
    scaleType: "7점 Likert",
    validity: "요인분석으로 2×2 4구인 구조 지지 (원전)",
    tags: ["동기", "목표지향성"],
    references: [
      "Elliot, A. J., & McGregor, H. A. (2001). A 2 × 2 achievement goal framework. Journal of Personality and Social Psychology, 80(3), 501-519.",
      "Elliot, A. J., & Murayama, K. (2008). On the measurement of achievement goals: Critique, illustration, and application. Journal of Educational Psychology, 100(3), 613-628.",
    ],
  },
  {
    seedKey: "measurement:ltsi",
    name: "LTSI 학습전이체계 검사 (Holton, Bates, & Ruona, 2000)",
    altNames: ["Learning Transfer System Inventory"],
    description:
      "교육훈련의 전이를 촉진·저해하는 전이 체계 요인을 측정하는 자기보고 검사. 1,616명 훈련 참가자 표본의 탐색적 요인분석으로 16개 요인 구조(전이 동기·전이 설계·상사 지원·동료 지원·결과 기대 등)가 도출되었고, 2차 요인분석에서 풍토·직무효용·보상의 상위 3요인이 확인되었다. HRD 전이 연구의 표준 진단 도구.",
    originalName: "Learning Transfer System Inventory (LTSI)",
    author: "Holton, E. F. III, Bates, R. A., & Ruona, W. E. A. (2000)",
    scaleType: "5점 Likert",
    validity: "EFA 16요인 + 2차 요인분석 상위 3요인 구조 (원전, N=1,616)",
    tags: ["HRD", "학습전이", "다차원"],
    references: [
      "Holton, E. F. III, Bates, R. A., & Ruona, W. E. A. (2000). Development of a generalized learning transfer system inventory. Human Resource Development Quarterly, 11(4), 333-360.",
    ],
  },
  {
    seedKey: "measurement:technostress-creators",
    name: "테크노스트레스 유발요인 척도 (Ragu-Nathan et al., 2008)",
    altNames: ["Technostress Creators Scale"],
    description:
      "조직 구성원의 테크노스트레스 유발요인을 과부하(techno-overload)·침습(techno-invasion)·복잡성(techno-complexity)·불안정(techno-insecurity)·불확실성(techno-uncertainty)의 5개 하위 요인으로 측정하는 도구. 직무만족·조직몰입과의 구조 모형으로 타당화되었으며, 교사·학습자 대상 에듀테크 스트레스 연구로 번안 확장되었다.",
    originalName: "Technostress Creators Scale",
    author: "Ragu-Nathan, T. S., Tarafdar, M., Ragu-Nathan, B. S., & Tu, Q. (2008)",
    validity: "구조방정식모형으로 5요인 구조 및 법칙적 타당도 검증 (원전)",
    tags: ["에듀테크", "스트레스", "다차원"],
    references: [
      "Ragu-Nathan, T. S., Tarafdar, M., Ragu-Nathan, B. S., & Tu, Q. (2008). The consequences of technostress for end users in organizations: Conceptual development and empirical validation. Information Systems Research, 19(4), 417-433.",
    ],
  },
  {
    seedKey: "measurement:digital-literacy-ng-2012",
    name: "디지털 리터러시 척도 (Ng, 2012)",
    altNames: ["Digital Literacy Questionnaire"],
    description:
      "대학생의 디지털 리터러시 자기지각을 기술적·인지적·사회정서적 차원 모형에 기반해 측정하는 설문. '디지털 네이티브' 담론을 실증 검토한 원전 연구에서 사용되었으며, 이후 다수 국가에서 번안·타당화되어 에듀테크 수용·온라인 학습 연구의 선행 변인 측정에 활용된다.",
    originalName: "Digital Literacy Questionnaire",
    author: "Ng, W. (2012)",
    itemCount: 17,
    scaleType: "혼합형 — 진술문 5점 Likert(1=전혀 아니다 ~ 5=매우 그렇다, 17문항) + 일부 역량 자기평가 10점 척도(1~10)",
    tags: ["디지털 리터러시", "역량"],
    references: [
      "Ng, W. (2012). Can we teach digital natives digital literacy? Computers & Education, 59(3), 1065-1078.",
    ],
  },
];

// ─── 연결관계 매핑 (Linking) ──────────────────────────────────
// 개념 이름 → 관련 변인 이름들. 시드 적용 시 자동으로 variableIds 채움 + 변인에 역참조 conceptIds 갱신.
// 이름이 정확히 일치해야 하며 (SEED_VARIABLES.name 또는 기존 DB), 일치 안 하면 해당 링크만 skip.
export const SEED_CONCEPT_VARIABLE_LINKS: Record<string, string[]> = {
  // 기존 8개
  "자기효능감": ["학업적 자기효능감"],
  "학습동기": ["내재적 동기", "과제가치", "성취목표지향성"],
  "인지부하": ["외재적 인지부하", "정신적 노력"],
  "메타인지": ["자기조절 학습전략"],
  "자기조절학습": ["자기조절 학습전략"],
  "학습몰입": ["학습몰입", "학습참여"],
  "테크놀로지 수용": ["학습 지속의도", "테크노스트레스"],
  "협력학습": ["학업성취도", "학습 만족도", "상호작용"],
  // 신규 16개 중 변인과 연결되는 것 (메타 개념은 변인 매핑 없음)
  "학습분석": ["학업성취도", "학습 지속의도"],
  "플립러닝": ["학업성취도", "학습 만족도", "학습몰입", "학습참여"],
  "게이미피케이션": ["내재적 동기", "학습몰입", "학습 지속의도", "학습참여"],
  "마이크로러닝": ["학습 지속의도"],
  "적응학습": ["학업성취도", "학습 지속의도"],
  "멀티미디어 학습 인지이론": ["외재적 인지부하", "학습 만족도", "정신적 노력"],
  "학습공동체": ["학습 만족도", "학업적 자기효능감"],
  "사회적 실재감": [
    "학습 만족도",
    "학습 지속의도",
    "사회적 실재감",
    "교수실재감",
    "인지적 실재감",
    "상호작용",
  ],
  "학습경험 디자인": ["학습 만족도", "학습몰입"],
  // 2026-06 보강 — 신규 변인 연결
  "교수설계": ["학습전이"],
  "디지털 리터러시": ["디지털 리터러시", "테크노스트레스"],
  // 2026-07-12 AECT 갭 보강 — 신규 개념 연결 (이론 계열 메타 개념은 변인 매핑 없음)
  "학습전이": ["학습전이"],
  "스캐폴딩": ["학업성취도", "외재적 인지부하"],
  "자기주도학습": ["자기조절 학습전략", "학업적 자기효능감"],
  "문제 기반 학습": ["학업성취도", "학습참여"],
  "프로젝트 기반 학습": ["학습참여", "학업성취도"],
  "블렌디드 러닝": ["학습 만족도", "상호작용"],
  "모바일 학습": ["학습 지속의도"],
  "원격교육": ["학습 만족도", "학습 지속의도", "상호작용"],
  // 3차 (상호작용·학습자 중심 계열)
  "상호작용": ["상호작용", "학습 만족도"],
  "학습자 중심 수업": ["학습참여"],
  "귀인이론": ["학업적 자기효능감"],
  // 4차 (『교수학습공학』 학습이론 계열 — 관찰학습만 변인 연결, 나머지 이론은 메타 개념)
  "관찰학습": ["학업적 자기효능감", "자기조절 학습전략"],
};

// 변인 이름 → 관련 측정도구 이름들. 시드 적용 시 자동으로 measurementIds 채움 + 측정도구에 역참조 variableIds.
export const SEED_VARIABLE_MEASUREMENT_LINKS: Record<string, string[]> = {
  "학업적 자기효능감": ["학업적 자기효능감 척도 (김아영, 2007)"],
  "내재적 동기": [
    "IMI (내재적 동기 검사)",
    "MSLQ (학습동기·전략 검사)",
    "IMMS 학습동기 검사 (Keller, 2010)",
  ],
  "학습몰입": [
    "K-MOLT 학습몰입 척도 (석임복, 2007)",
    "Flow State Scale (Jackson & Marsh, 1996)",
  ],
  "자기조절 학습전략": [
    "MSLQ (학습동기·전략 검사)",
    "자기조절학습 검사 (양명희, 2002)",
  ],
  "외재적 인지부하": ["Cognitive Load Scale (Leppink et al., 2013)"],
  "학습 지속의도": ["TAM 척도 (Davis, 1989)"],
  // 2026-06 보강 — 신규 변인·측정도구 연결
  "학습 만족도": ["IMMS 학습동기 검사 (Keller, 2010)"],
  "과제가치": ["MSLQ (학습동기·전략 검사)"],
  "성취목표지향성": ["AGQ 성취목표 설문 (Elliot & McGregor, 2001)"],
  "교수실재감": ["CoI 설문 (Arbaugh et al., 2008)"],
  "사회적 실재감": ["CoI 설문 (Arbaugh et al., 2008)"],
  "인지적 실재감": ["CoI 설문 (Arbaugh et al., 2008)"],
  "학습참여": ["UWES-S 학업열의 척도 (Schaufeli et al., 2002)"],
  "정신적 노력": [
    "Paas 정신적 노력 척도 (Paas, 1992)",
    "NASA-TLX (Hart & Staveland, 1988)",
  ],
  "학습전이": ["LTSI 학습전이체계 검사 (Holton, Bates, & Ruona, 2000)"],
  "테크노스트레스": ["테크노스트레스 유발요인 척도 (Ragu-Nathan et al., 2008)"],
  "디지털 리터러시": ["디지털 리터러시 척도 (Ng, 2012)"],
};

// ─── Import 함수 ──────────────────────────────────────────────
export interface SeedImportResult {
  concepts: { created: number; skipped: number };
  variables: { created: number; skipped: number };
  measurements: { created: number; skipped: number };
  /** 연결관계 갱신 통계 (Linking) */
  links: {
    conceptToVariable: number;
    variableToMeasurement: number;
  };
}

export async function importArchiveSeed(
  createdBy: string,
): Promise<SeedImportResult> {
  const result: SeedImportResult = {
    concepts: { created: 0, skipped: 0 },
    variables: { created: 0, skipped: 0 },
    measurements: { created: 0, skipped: 0 },
    links: { conceptToVariable: 0, variableToMeasurement: 0 },
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

  // ─── Linking — 시드 적용 후 이름→ID 매핑으로 양방향 연결 ───
  const [finalC, finalV, finalM] = await Promise.all([
    archiveConceptsApi.list(),
    archiveVariablesApi.list(),
    archiveMeasurementsApi.list(),
  ]);
  const conceptByName = new Map(finalC.data.map((c) => [c.name, c]));
  const variableByName = new Map(finalV.data.map((v) => [v.name, v]));
  const measurementByName = new Map(finalM.data.map((m) => [m.name, m]));

  // 개념 → 변인 양방향
  // 변인 측 conceptIds 누적 위한 buffer
  const variableConceptAccumulator = new Map<string, Set<string>>();
  for (const [conceptName, variableNames] of Object.entries(
    SEED_CONCEPT_VARIABLE_LINKS,
  )) {
    const c = conceptByName.get(conceptName);
    if (!c) continue;
    const varIds = variableNames
      .map((n) => variableByName.get(n)?.id)
      .filter((id): id is string => !!id);
    if (varIds.length === 0) continue;
    const existing = new Set((c.variableIds as string[] | undefined) ?? []);
    varIds.forEach((id) => existing.add(id));
    await archiveConceptsApi.update(c.id, {
      variableIds: Array.from(existing),
    });
    result.links.conceptToVariable += varIds.length;
    // 변인 측 역참조 누적
    for (const vName of variableNames) {
      const v = variableByName.get(vName);
      if (!v) continue;
      let set = variableConceptAccumulator.get(v.id);
      if (!set) {
        set = new Set((v.conceptIds as string[] | undefined) ?? []);
        variableConceptAccumulator.set(v.id, set);
      }
      set.add(c.id);
    }
  }
  // 변인 conceptIds 일괄 갱신
  for (const [vId, set] of variableConceptAccumulator) {
    await archiveVariablesApi.update(vId, { conceptIds: Array.from(set) });
  }

  // 변인 → 측정도구 양방향
  const measurementVariableAccumulator = new Map<string, Set<string>>();
  for (const [variableName, measurementNames] of Object.entries(
    SEED_VARIABLE_MEASUREMENT_LINKS,
  )) {
    const v = variableByName.get(variableName);
    if (!v) continue;
    const mIds = measurementNames
      .map((n) => measurementByName.get(n)?.id)
      .filter((id): id is string => !!id);
    if (mIds.length === 0) continue;
    const existing = new Set((v.measurementIds as string[] | undefined) ?? []);
    mIds.forEach((id) => existing.add(id));
    await archiveVariablesApi.update(v.id, {
      measurementIds: Array.from(existing),
    });
    result.links.variableToMeasurement += mIds.length;
    // 측정도구 측 역참조 누적
    for (const mName of measurementNames) {
      const m = measurementByName.get(mName);
      if (!m) continue;
      let set = measurementVariableAccumulator.get(m.id);
      if (!set) {
        set = new Set((m.variableIds as string[] | undefined) ?? []);
        measurementVariableAccumulator.set(m.id, set);
      }
      set.add(v.id);
    }
  }
  for (const [mId, set] of measurementVariableAccumulator) {
    await archiveMeasurementsApi.update(mId, { variableIds: Array.from(set) });
  }

  return result;
}

// ─── References 갱신 함수 — 이미 DB 에 적재된 항목의 메타데이터(references/description/altNames) 만 시드 기준으로 덮어쓰기 ───
// 사용 시나리오: 한국어 인용 정정 후 기존 DB 항목 일괄 갱신. variableIds 등 연결관계는 보존.
// 멱등성 보장: 시드와 동일한 항목은 변경 없음, 차이 있는 것만 update.

export interface SeedRefreshResult {
  concepts: { updated: number; skipped: number; notFound: number };
  variables: { updated: number; skipped: number; notFound: number };
  measurements: { updated: number; skipped: number; notFound: number };
}

function deepEqualArr(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
  return true;
}

export async function refreshArchiveSeedReferences(
  updatedBy: string,
): Promise<SeedRefreshResult> {
  const result: SeedRefreshResult = {
    concepts: { updated: 0, skipped: 0, notFound: 0 },
    variables: { updated: 0, skipped: 0, notFound: 0 },
    measurements: { updated: 0, skipped: 0, notFound: 0 },
  };

  const [existingC, existingV, existingM] = await Promise.all([
    archiveConceptsApi.list(),
    archiveVariablesApi.list(),
    archiveMeasurementsApi.list(),
  ]);
  const conceptByName = new Map(existingC.data.map((c) => [c.name, c]));
  const variableByName = new Map(existingV.data.map((v) => [v.name, v]));
  const measurementByName = new Map(existingM.data.map((m) => [m.name, m]));

  // 개념
  for (const c of SEED_CONCEPTS) {
    const existing = conceptByName.get(c.name);
    if (!existing) {
      result.concepts.notFound++;
      continue;
    }
    const seedRefs = c.references ?? [];
    const seedAlts = c.altNames ?? [];
    const seedTags = c.tags ?? [];
    const same =
      existing.description === c.description &&
      (existing.aectTerm ?? undefined) === c.aectTerm &&
      // purifiedName 은 "시드에 있고 기존에 비어 있을 때만 채움" — 그 경우만 차이로 판정 (멱등).
      !(c.purifiedName && !existing.purifiedName) &&
      deepEqualArr(existing.references as string[] | undefined, seedRefs) &&
      deepEqualArr(existing.altNames as string[] | undefined, seedAlts) &&
      deepEqualArr(existing.tags as string[] | undefined, seedTags);
    if (same) {
      result.concepts.skipped++;
      continue;
    }
    await archiveConceptsApi.update(existing.id, {
      description: c.description,
      ...(c.aectTerm ? { aectTerm: c.aectTerm } : {}),
      // purifiedName 은 시드에 값이 있을 때만 채움 — 운영자가 직접 입력한 순화어는 보존.
      ...(c.purifiedName && !existing.purifiedName ? { purifiedName: c.purifiedName } : {}),
      references: seedRefs,
      altNames: seedAlts,
      tags: seedTags,
      // variableIds 등 연결관계는 보존 (별도 mutation 으로만 변경)
    } as Partial<ArchiveConcept>);
    result.concepts.updated++;
  }

  // 변인
  for (const v of SEED_VARIABLES) {
    const existing = variableByName.get(v.name);
    if (!existing) {
      result.variables.notFound++;
      continue;
    }
    const seedRefs = v.references ?? [];
    const seedAlts = v.altNames ?? [];
    const seedTags = v.tags ?? [];
    const same =
      existing.description === v.description &&
      existing.type === v.type &&
      deepEqualArr(existing.references as string[] | undefined, seedRefs) &&
      deepEqualArr(existing.altNames as string[] | undefined, seedAlts) &&
      deepEqualArr(existing.tags as string[] | undefined, seedTags);
    if (same) {
      result.variables.skipped++;
      continue;
    }
    await archiveVariablesApi.update(existing.id, {
      description: v.description,
      type: v.type,
      references: seedRefs,
      altNames: seedAlts,
      tags: seedTags,
    } as Partial<ArchiveVariable>);
    result.variables.updated++;
  }

  // 측정도구 (altNames 는 ArchiveMeasurementTool 타입에 없으므로 동적 필드로 처리)
  for (const m of SEED_MEASUREMENTS) {
    const existing = measurementByName.get(m.name);
    if (!existing) {
      result.measurements.notFound++;
      continue;
    }
    const seedRefs = m.references ?? [];
    const seedTags = m.tags ?? [];
    const seedSamples = m.sampleItems ?? [];
    const same =
      existing.description === m.description &&
      existing.originalName === m.originalName &&
      existing.author === m.author &&
      existing.itemCount === m.itemCount &&
      existing.scaleType === m.scaleType &&
      existing.reliability === m.reliability &&
      existing.validity === m.validity &&
      existing.resourceUrl === m.resourceUrl &&
      deepEqualArr(existing.references as string[] | undefined, seedRefs) &&
      deepEqualArr(existing.tags as string[] | undefined, seedTags) &&
      deepEqualArr(existing.sampleItems as string[] | undefined, seedSamples);
    if (same) {
      result.measurements.skipped++;
      continue;
    }
    await archiveMeasurementsApi.update(existing.id, {
      description: m.description,
      originalName: m.originalName,
      author: m.author,
      itemCount: m.itemCount,
      scaleType: m.scaleType,
      reliability: m.reliability,
      validity: m.validity,
      resourceUrl: m.resourceUrl,
      sampleItems: seedSamples,
      references: seedRefs,
      tags: seedTags,
    } as Partial<ArchiveMeasurementTool>);
    result.measurements.updated++;
  }

  // updatedBy 메타 — 로그용
  void updatedBy;
  return result;
}
