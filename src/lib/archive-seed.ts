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

// ─── 개념 (Concepts) ─────────────────────────────────────────
// seedKey 형식: `concept:{kebab-slug}` — 사용자가 이름 수정해도 동일 항목 인식.
export const SEED_CONCEPTS: SeedConcept[] = [
  {
    seedKey: "concept:self-efficacy",
    name: "자기효능감",
    altNames: ["Self-efficacy", "자기효능감 신념"],
    description:
      "Bandura(1977, 1997)가 제안한 사회인지이론의 핵심 구인으로, 특정 과제를 수행하기 위해 요구되는 행동을 조직하고 실행할 수 있는 자신의 능력에 대한 신념을 의미한다. 학습 상황에서는 학업적 자기효능감(academic self-efficacy)으로 구체화되며, 학습 동기·성취·지속성에 영향을 미치는 핵심 매개 변인으로 다수의 한국 교육공학 연구에서 다뤄졌다.",
    tags: ["동기", "사회인지이론", "정의적 영역"],
    references: [
      "Bandura, A. (1997). Self-efficacy: The exercise of control. W.H. Freeman.",
      // 검증결과 (2026-05): 김아영 (2007) 교육심리연구 인용은 RISS/KCI 검증 불가 → 삭제. 1차 척도 논문은 아래 김아영·박인영(2001).
      "김아영, 박인영 (2001). 학업적 자기효능감 척도 개발 및 타당화 연구. 교육학연구, 39(1), 95-123.",
    ],
  },
  {
    seedKey: "concept:learning-motivation",
    name: "학습동기",
    altNames: ["Learning Motivation", "학업동기"],
    description:
      "학습 행동을 시작·유지·종결하게 만드는 내적·외적 추동의 총칭. Keller(1987)의 ARCS 모형(주의-관련성-자신감-만족감)이 교수설계 영역의 표준 프레임으로 자리 잡았으며, 한국 교육공학 연구에서는 자기결정성 이론(SDT) 기반 내재적/외재적 동기 구분이 함께 사용된다.",
    tags: ["동기", "ARCS", "자기결정성"],
    references: [
      "Keller, J. M. (1987). Development and use of the ARCS model of motivational design. Journal of Instructional Development, 10(3), 2-10.",
      // 검증결과: 봉미미외(2008) 교육심리연구 22(4) 815-839 — RISS/KCI 검증 불가 → 삭제
      // 검증결과: 김아영(2010) 정정 — 학술지·권호·페이지 모두 변경
      "김아영 (2010). 자기결정성이론과 현장 적용 연구. 교육심리연구, 24(3), 583-609.",
    ],
  },
  {
    seedKey: "concept:cognitive-load",
    name: "인지부하",
    altNames: ["Cognitive Load", "정신적 부하"],
    description:
      "Sweller(1988, 1994)의 인지부하이론(Cognitive Load Theory, CLT)에서 비롯된 개념으로, 학습 과제 수행 중 작업기억에 부과되는 정신적 처리 요구량을 의미한다. 내재적(intrinsic)·외재적(extraneous)·본유적(germane) 부하로 구분되며, 멀티미디어 학습 설계 원리(Mayer)와 직결되어 한국 교육공학 연구에서 활발히 적용된다.",
    tags: ["인지", "멀티미디어 학습", "교수설계"],
    references: [
      "Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257-285.",
      // 검증결과: 이상수(2008) 교육공학연구 24(2) 1-26 — RISS/KCI 검증 불가 → 삭제
      // 검증결과: 유영만·김민정(2010) 교육공학연구 26(2) 1-22 — RISS/KCI 검증 불가 → 삭제
    ],
  },
  {
    seedKey: "concept:metacognition",
    name: "메타인지",
    altNames: ["Metacognition", "초인지"],
    description:
      "Flavell(1979)이 제안한 '인지에 대한 인지'로, 자신의 학습 과정을 모니터링·계획·조절하는 능력. 메타인지 지식(knowledge)과 메타인지 조절(regulation)로 구분되며, 자기조절학습의 핵심 구성 요소로 다뤄진다. 한국 교육공학 연구에서는 디지털 학습환경에서의 메타인지 스캐폴딩 설계 연구가 활발하다.",
    tags: ["인지", "자기조절", "고차사고"],
    references: [
      "Flavell, J. H. (1979). Metacognition and cognitive monitoring: A new area of cognitive-developmental inquiry. American Psychologist, 34(10), 906-911.",
      // 검증결과: 신종호·진성희(2009) 교육공학연구 25(4) 167-198 — RISS/KCI 검증 불가 → 삭제
    ],
  },
  {
    seedKey: "concept:self-regulated-learning",
    name: "자기조절학습",
    altNames: ["Self-Regulated Learning", "SRL"],
    description:
      "Zimmerman(1989, 2000)이 체계화한 학습자가 자신의 학습 목표 달성을 위해 인지·정의·행동을 능동적으로 조절하는 과정. 사전계획(forethought)·수행(performance)·자기성찰(self-reflection)의 3단계 순환 모형이 표준이며, 디지털 학습환경 자기조절 지원 도구·LMS 행동 데이터 분석의 이론적 근거로 사용된다.",
    tags: ["자기조절", "학습전략", "메타인지"],
    references: [
      "Zimmerman, B. J. (2000). Attaining self-regulation: A social cognitive perspective. In M. Boekaerts et al. (Eds.), Handbook of self-regulation (pp. 13-39). Academic Press.",
      // 검증결과: 양명희(2002) 박사학위논문 제목 정정 — RISS 실제 제목과 일치하도록 "모형 탐색과" 구절 제거
      "양명희 (2002). 자기조절학습 구성변인과 학업 성취와의 관계 연구. 서울대학교 박사학위논문.",
      // 검증결과: 정한호(2008) 교육공학연구 24(3) — RISS/KCI 검증 불가 → 삭제
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
    altNames: ["Collaborative Learning", "Cooperative Learning"],
    description:
      "Johnson & Johnson(1989), Slavin(1995) 등이 체계화한 학습자들이 공동의 목표를 위해 상호의존적으로 활동하는 학습 형태. 긍정적 상호의존성·개별 책무성·면대면 상호작용·사회적 기술·집단 처리의 5요소를 포함한다. 한국 교육공학에서는 CSCL(Computer-Supported Collaborative Learning) 설계 연구로 확장되었다.",
    tags: ["협력", "CSCL", "사회적 학습"],
    references: [
      "Johnson, D. W., & Johnson, R. T. (1989). Cooperation and competition: Theory and research. Interaction Book Company.",
      // 검증결과: 이수정·강명희(2015) 교육공학연구 31(4) — RISS/KCI 검증 불가 → 삭제
      // 검증결과: 강명희·임병노(2009) 교육공학연구 25(3) — RISS/KCI 검증 불가 → 삭제
    ],
  },
  // ─── 2026 보강: 교육공학 분야 핵심 개념 16개 추가 ───
  {
    seedKey: "concept:educational-technology",
    name: "교육공학",
    altNames: ["Educational Technology", "Instructional Technology", "EdTech"],
    description:
      "AECT(2023) 최신 정의: \"학습경험과 학습환경의 전략적 설계·관리·구현·평가를 통해 지식의 진보, 학습·수행의 향상, 학습자 권한 강화를 추구하는 이론·연구·실천에 대한 윤리적 학문과 응용\". 2008년 정의(학습 촉진·수행 향상)에서 2023년 학습자 권한 강화(empower learners) + 학습경험·환경(learning experiences and environments) 두 축이 신규 추가됨.",
    tags: ["AECT", "정의", "학문분야"],
    references: [
      "AECT (2023). Definition of Educational Technology. https://www.aect.org/aect/about/aect-definition",
      "Januszewski, A., & Molenda, M. (Eds.). (2008). Educational technology: A definition with commentary. Routledge.",
      "Seels, B. B., & Richey, R. C. (1994). Instructional technology: The definition and domains of the field. AECT.",
    ],
  },
  {
    seedKey: "concept:instructional-design",
    name: "교수설계",
    altNames: ["Instructional Design", "ID", "교수체제설계", "ISD"],
    description:
      "학습 목표 달성을 위해 교수·학습 과정을 체계적으로 분석·설계·개발·실행·평가하는 절차. ADDIE 모델, Dick & Carey, Gagné의 9 events, Merrill의 First Principles, 4C/ID 등이 대표 모델. 교육공학 5도메인 중 '설계' 영역의 중심 활동이며 모든 학습 콘텐츠 개발의 기초.",
    tags: ["설계", "ADDIE", "ID", "체제적 접근"],
    references: [
      "Dick, W., Carey, L., & Carey, J. O. (2015). The systematic design of instruction (8th ed.). Pearson.",
      "Gagné, R. M., Wager, W. W., Golas, K. C., & Keller, J. M. (2005). Principles of instructional design (5th ed.). Wadsworth.",
      "Merrill, M. D. (2002). First principles of instruction. ETR&D, 50(3), 43-59.",
    ],
  },
  {
    seedKey: "concept:addie-model",
    name: "ADDIE 모델",
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
    altNames: ["Technological Pedagogical Content Knowledge", "TPCK"],
    description:
      "Mishra & Koehler(2006)가 Shulman(1986)의 PCK를 확장한 교사 지식 프레임워크. 내용지식(CK)·교수지식(PK)·테크놀로지지식(TK)의 3원 교집합에서 형성되는 통합 지식. 디지털 기술을 효과적으로 수업에 통합하기 위한 교사 역량 측정 및 양성 프로그램 설계의 핵심 개념.",
    tags: ["교사역량", "테크놀로지 통합", "PCK"],
    references: [
      "Mishra, P., & Koehler, M. J. (2006). Technological pedagogical content knowledge: A framework for teacher knowledge. Teachers College Record, 108(6), 1017-1054.",
      "Schmidt, D. A. et al. (2009). Technological pedagogical content knowledge (TPACK): The development and validation of an assessment instrument for preservice teachers. JRTE, 42(2), 123-149.",
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
    altNames: ["Digital Literacy", "디지털 문해력", "Digital Competence"],
    description:
      "디지털 도구·정보·미디어를 비판적으로 탐색·평가·활용·창출·공유할 수 있는 통합 역량. 유럽연합 DigComp 2.2(2022) 프레임워크가 5영역(정보·소통·콘텐츠 창출·안전·문제해결) 21역량으로 표준화. 한국에서는 2022 개정 교육과정 핵심 역량과 디지털 교과서 정책의 기초 개념.",
    tags: ["역량", "DigComp", "교육과정"],
    references: [
      "Vuorikari, R., Kluzer, S., & Punie, Y. (2022). DigComp 2.2: The Digital Competence Framework for Citizens. Publications Office of the EU.",
      // 한국어 KCI/한국교육과정평가원 인용은 자동 생성 시 할루시네이션 가능성이 있어 제거 — 운영진 검증 후 보강 필요
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
    altNames: ["Adaptive Learning", "맞춤형 학습", "Adaptive Instruction"],
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
    altNames: ["Cognitive Theory of Multimedia Learning", "CTML"],
    description:
      "Mayer 의 통합 이론으로, 학습자는 시각·청각 이중 채널, 제한된 작업기억, 능동적 처리의 3가지 가정 하에 학습. 12가지 멀티미디어 설계 원리(coherence, signaling, redundancy, spatial/temporal contiguity, segmenting, pre-training, modality, personalization, voice, image, embodiment, generative activity)가 도출되며, 동영상·이러닝 콘텐츠 품질 평가의 표준 frame.",
    tags: ["Mayer", "이러닝", "설계원리"],
    references: [
      "Mayer, R. E. (2020). Multimedia learning (3rd ed.). Cambridge University Press.",
      "Mayer, R. E. (2009). Multimedia learning (2nd ed.). Cambridge University Press.",
      "Mayer, R. E., & Fiorella, L. (Eds.). (2021). The Cambridge handbook of multimedia learning (3rd ed.). Cambridge University Press.",
    ],
  },
  {
    seedKey: "concept:community-of-practice",
    name: "학습공동체",
    altNames: ["Community of Practice", "CoP", "전문학습공동체", "PLC"],
    description:
      "공통 관심·전문성을 공유한 사람들이 정기적 상호작용을 통해 지식·실천을 함께 발전시키는 사회적 학습 단위. Lave & Wenger(1991)가 상황학습(situated learning) 맥락에서 제안. 교사 전문학습공동체(PLC), 기업 내 CoP, MOOC 학습자 커뮤니티 등이 응용 사례. 정체성 형성·상호 멘토링이 핵심 메커니즘.",
    tags: ["사회적 학습", "PLC", "Wenger"],
    references: [
      "Lave, J., & Wenger, E. (1991). Situated learning: Legitimate peripheral participation. Cambridge University Press.",
      "Wenger, E. (1998). Communities of practice: Learning, meaning, and identity. Cambridge University Press.",
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
  {
    seedKey: "concept:internal-validity",
    name: "내적 타당도",
    altNames: ["Internal Validity"],
    description:
      "관찰된 결과가 처치(독립변인) 때문이라고 확신할 수 있는 정도. 핵심은 '그럴듯한 경쟁 가설(plausible rival hypothesis)'의 배제다. Campbell과 Stanley가 정리한 대표 저해 요인은 역사(history), 성숙(maturation), 검사 경험(testing), 측정도구 변화(instrumentation), 통계적 회귀(statistical regression), 피험자 선발(selection), 탈락(mortality) 등이며, 논문 한계 절은 이 요인들을 명시적으로 호명해 어떻게 통제·논의했는지 구조화하는 것이 좋다.",
    tags: ["연구방법론", "타당도", "실험연구"],
    references: [
      "Campbell, D. T., & Stanley, J. C. (1963). Experimental and quasi-experimental designs for research. Houghton Mifflin.",
      "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
    ],
  },
  {
    seedKey: "concept:external-validity",
    name: "외적 타당도",
    altNames: ["External Validity", "일반화 가능성"],
    description:
      "연구 결과를 다른 대상·상황·시기로 일반화할 수 있는 정도. 대표 저해 요인으로 사전검사×처치 상호작용, 선발×실험 상호작용, 호손 효과(Hawthorne effect — 관찰받는다는 인식 자체가 행동을 바꾸는 현상), 중다처치 간섭(이월·순서 효과)이 있다. 특수 표본(예: 특정 기관·집단)을 사용한 연구는 일반화 한계를 명시하는 것이 정석이다.",
    tags: ["연구방법론", "타당도", "일반화"],
    references: [
      "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
      "Bracht, G. H., & Glass, G. V. (1968). The external validity of experiments. American Educational Research Journal, 5(4), 437-474.",
    ],
  },
  {
    seedKey: "concept:quasi-experimental-design",
    name: "준실험설계",
    altNames: ["Quasi-experimental Design", "비동등 통제집단 설계"],
    description:
      "무선배치가 불가능한 현장에서 기존 집단을 활용하는 실험설계. 설계 위계상 단일집단 전후검사 설계(성숙·역사 오염에 취약)나 이질집단 사후검사 설계보다, 사전·사후 측정과 통제집단을 모두 갖춘 '이질(비동등) 통제집단 사전-사후 설계'가 교육 연구에서 가장 강력하고 일반적으로 권장된다. 집단 간 사전 점수가 비동등하면 ANCOVA 등으로 통계적 통제를 병행한다.",
    tags: ["연구방법론", "실험연구", "연구설계"],
    references: [
      "Campbell, D. T., & Stanley, J. C. (1963). Experimental and quasi-experimental designs for research. Houghton Mifflin.",
      "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
    ],
  },
  {
    seedKey: "concept:causal-inference",
    name: "인과관계 추론",
    altNames: ["Causal Inference", "인과 추론 3요건"],
    description:
      "인과 주장을 위해서는 ① 원인이 결과보다 시간적으로 선행하고, ② 원인-결과 간 관련성(공변)이 있으며, ③ 그럴듯한 경쟁 가설이 배제되어야 한다. Mill의 인과 추론 방법(일치법·차이법·공변법·잔여법)이 고전적 논리 기반이며, 집단 비교(차이 검정)는 그 자체로 인과를 입증하지 않는다 — 인과는 통계가 아니라 '설계'로 확보된다는 점이 핵심이다.",
    tags: ["연구방법론", "인과", "연구설계"],
    references: [
      "Mill, J. S. (1843). A system of logic, ratiocinative and inductive. John W. Parker.",
      "Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). Experimental and quasi-experimental designs for generalized causal inference. Houghton Mifflin.",
    ],
  },
  {
    seedKey: "concept:ancova",
    name: "공분산분석(ANCOVA)",
    altNames: ["Analysis of Covariance", "공변량 분석"],
    description:
      "공변량(covariate)의 영향을 통계적으로 제거한 후 집단 간 차이를 비교하는 분석. 준실험에서 집단 간 사전 점수가 비동등할 때 사전 점수를 공변량으로 투입해 조정하는 것이 대표 용법이다. 독립변인은 범주형, 종속변인과 공변량은 연속형이어야 하며, 회귀선 동질성(homogeneity of regression slopes) 등 가정 검토를 함께 보고한다.",
    tags: ["연구방법론", "통계", "준실험"],
    references: [
      "Tabachnick, B. G., & Fidell, L. S. (2019). Using multivariate statistics (7th ed.). Pearson.",
      "Field, A. (2018). Discovering statistics using IBM SPSS statistics (5th ed.). Sage.",
    ],
  },
  {
    seedKey: "concept:central-limit-theorem",
    name: "중심극한정리와 정규성",
    altNames: ["Central Limit Theorem", "CLT"],
    description:
      "표본 크기가 충분히 크면(통상 n≥30) 모집단 분포와 무관하게 표본평균의 분포가 정규분포에 근사한다는 정리. 모수 검정(t검정·ANOVA 등)의 정규성 가정을 방어하는 핵심 논리로, 정규성 검정이 기각되더라도 표본이 충분히 크면 중심극한정리에 근거해 모수 검정의 강건성을 주장할 수 있다.",
    tags: ["연구방법론", "통계", "정규분포"],
    references: [
      "Field, A. (2018). Discovering statistics using IBM SPSS statistics (5th ed.). Sage.",
      "Lumley, T., Diehr, P., Emerson, S., & Chen, L. (2002). The importance of the normality assumption in large public health data sets. Annual Review of Public Health, 23, 151-169.",
    ],
  },
  {
    seedKey: "concept:correlation-regression",
    name: "상관분석과 회귀분석",
    altNames: ["Correlation", "Regression Analysis", "평균으로의 회귀"],
    description:
      "상관분석은 두 연속 변인 간 선형 관계의 강도와 방향(r)을 보여주지만 인과를 입증하지 않는다. 회귀분석은 독립변인이 종속변인을 설명·예측하는 정도(R², β)를 추정한다. '회귀'라는 명칭은 Galton 의 '평균으로의 회귀(regression toward the mean)' 관찰에서 유래했으며, 이 현상은 극단 점수 집단의 재측정 점수가 평균 쪽으로 이동하는 통계적 회귀 위협(내적 타당도)과 같은 뿌리다.",
    tags: ["연구방법론", "통계", "상관", "회귀"],
    references: [
      "Galton, F. (1886). Regression towards mediocrity in hereditary stature. Journal of the Anthropological Institute, 15, 246-263.",
      "Cohen, J., Cohen, P., West, S. G., & Aiken, L. S. (2003). Applied multiple regression/correlation analysis for the behavioral sciences (3rd ed.). Routledge.",
    ],
  },
  {
    seedKey: "concept:sem",
    name: "구조방정식모형(SEM)",
    altNames: ["Structural Equation Modeling", "구조방정식"],
    description:
      "다수의 독립·종속·매개 변인 간 복잡한 인과 구조와 간접효과를 통합적으로 분석하는 기법. 모형은 이론·선행연구에 근거해 설정하고 적합도 지표(CFI, TLI, RMSEA 등)로 검증한다. 매개효과 분석에서 위계적 회귀나 경로분석보다 측정오차를 고려할 수 있어 정밀하며, 후속연구 제언에서 '매개 기제의 모형 검증' 방향으로 자주 제안된다.",
    tags: ["연구방법론", "통계", "매개효과"],
    references: [
      "Kline, R. B. (2016). Principles and practice of structural equation modeling (4th ed.). Guilford Press.",
      "Hu, L., & Bentler, P. M. (1999). Cutoff criteria for fit indexes in covariance structure analysis. Structural Equation Modeling, 6(1), 1-55.",
    ],
  },
  {
    seedKey: "concept:factor-analysis-validity",
    name: "요인분석과 구성타당도",
    altNames: ["Factor Analysis", "Construct Validity"],
    description:
      "문항 간 상관 구조로 잠재 요인을 규명해 측정도구의 구성타당도를 검증하는 기법(탐색적 EFA / 확인적 CFA). 타인이 개발한 척도를 사용할 때는 전문가 내용타당도 검토를 확보하고, 가능하면 본 연구 표본에서 요인구조가 재현되는지(CFA) 확인해 보고하는 것이 심사 방어에 유리하다. 신뢰도(Cronbach's α)와 타당도는 별개 개념이므로 둘 다 보고한다.",
    tags: ["연구방법론", "측정", "타당도"],
    references: [
      "Brown, T. A. (2015). Confirmatory factor analysis for applied research (2nd ed.). Guilford Press.",
      "DeVellis, R. F. (2017). Scale development: Theory and applications (4th ed.). Sage.",
    ],
  },
  {
    seedKey: "concept:delphi-method",
    name: "델파이 기법",
    altNames: ["Delphi Method", "전문가 합의"],
    description:
      "전문가 패널에게 반복 설문과 통제된 피드백을 제공해 의견을 수렴하는 합의 도출 기법. 교육 프로그램 구성·요구분석·미래 예측에 활용되며, 프로그램 내용의 전문가 내용타당도 검토도 델파이형 합의 절차로 정당화할 수 있다. 한계로는 전문가의 관심 부족·전문성 착각이 지적된다.",
    tags: ["연구방법론", "전문가 패널", "합의"],
    references: [
      "Linstone, H. A., & Turoff, M. (Eds.). (1975). The Delphi method: Techniques and applications. Addison-Wesley.",
      "Hsu, C. C., & Sandford, B. A. (2007). The Delphi technique: Making sense of consensus. Practical Assessment, Research, and Evaluation, 12(10), 1-8.",
    ],
  },
  {
    seedKey: "concept:meta-analysis",
    name: "메타분석",
    altNames: ["Meta-analysis", "효과크기 통합"],
    description:
      "동일 주제의 다수 선행연구 효과크기를 정량적으로 통합·요약하는 연구방법. 개별 연구의 표본 한계를 넘어 수량적·종합적·재현가능한 결론을 제공한다. 서론·이론적 배경에서 '해당 분야 메타분석 결과'를 인용하면 연구 필요성과 기대 효과크기의 근거가 강화된다.",
    tags: ["연구방법론", "효과크기", "체계적 문헌고찰"],
    references: [
      "Glass, G. V. (1976). Primary, secondary, and meta-analysis of research. Educational Researcher, 5(10), 3-8.",
      "Borenstein, M., Hedges, L. V., Higgins, J. P. T., & Rothstein, H. R. (2021). Introduction to meta-analysis (2nd ed.). Wiley.",
    ],
  },
  {
    seedKey: "concept:chi-square-test",
    name: "카이제곱 검정",
    altNames: ["Chi-square Test", "χ² 검정", "교차분석"],
    description:
      "변인이 질적·범주형일 때 집단 간 분포 차이나 두 범주형 변인 간 관련성(독립성)을 검증하는 비모수 기법. 실험·준실험 연구에서 성별·학년·이수학기 같은 범주형 배경변수의 집단 간 동질성 검증에 사용하면 선발 위협 방어가 강화된다(연속형 변수의 t검정 동질성 검증과 상보적). 기대빈도가 작은 셀이 많으면 Fisher 정확검정을 고려한다.",
    tags: ["연구방법론", "통계", "범주형 자료"],
    references: [
      "Agresti, A. (2019). An introduction to categorical data analysis (3rd ed.). Wiley.",
      "Field, A. (2018). Discovering statistics using IBM SPSS statistics (5th ed.). Sage.",
    ],
  },
  {
    seedKey: "concept:academic-writing-principles",
    name: "연구보고서 작성 5원칙",
    altNames: ["Academic Writing Principles", "논문 작성 원칙"],
    description:
      "논문 작성의 다섯 가지 기본 원칙: ① 논리성(주장-근거의 정합), ② 객관성(1인칭 '나' 대신 '연구자', 의견에는 근거), ③ 정확성('많은·매우' 등 모호 표현 대신 구체 수치), ④ 일관성(동일 개념은 처음 명명한 용어로 통일), ⑤ 가독성(불필요하게 어려운 용어 지양). 시제는 방법·결과=과거, 정의·목적=현재가 관례이며, 결과(Results)와 결론(Conclusion)은 구분해 작성한다.",
    tags: ["연구방법론", "학술 글쓰기", "APA"],
    references: [
      "American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). APA.",
      "Booth, W. C., Colomb, G. G., Williams, J. M., Bizup, J., & FitzGerald, W. T. (2016). The craft of research (4th ed.). University of Chicago Press.",
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
];

// ─── 측정도구 (Measurement Tools) ─────────────────────────────
// seedKey 형식: `measurement:{kebab-slug}` — 사용자가 이름 수정해도 동일 항목 인식.
export const SEED_MEASUREMENTS: SeedMeasurement[] = [
  {
    seedKey: "measurement:academic-self-efficacy-kim-2007",
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
];

// ─── 연결관계 매핑 (Linking) ──────────────────────────────────
// 개념 이름 → 관련 변인 이름들. 시드 적용 시 자동으로 variableIds 채움 + 변인에 역참조 conceptIds 갱신.
// 이름이 정확히 일치해야 하며 (SEED_VARIABLES.name 또는 기존 DB), 일치 안 하면 해당 링크만 skip.
export const SEED_CONCEPT_VARIABLE_LINKS: Record<string, string[]> = {
  // 기존 8개
  "자기효능감": ["학업적 자기효능감"],
  "학습동기": ["내재적 동기"],
  "인지부하": ["외재적 인지부하"],
  "메타인지": ["자기조절 학습전략"],
  "자기조절학습": ["자기조절 학습전략"],
  "학습몰입": ["학습몰입"],
  "테크놀로지 수용": ["학습 지속의도"],
  "협력학습": ["학업성취도", "학습 만족도"],
  // 신규 16개 중 변인과 연결되는 것 (메타 개념은 변인 매핑 없음)
  "학습분석": ["학업성취도", "학습 지속의도"],
  "플립러닝": ["학업성취도", "학습 만족도", "학습몰입"],
  "게이미피케이션": ["내재적 동기", "학습몰입", "학습 지속의도"],
  "마이크로러닝": ["학습 지속의도"],
  "적응학습": ["학업성취도", "학습 지속의도"],
  "멀티미디어 학습 인지이론": ["외재적 인지부하", "학습 만족도"],
  "학습공동체": ["학습 만족도", "학업적 자기효능감"],
  "사회적 실재감": ["학습 만족도", "학습 지속의도"],
  "학습경험 디자인": ["학습 만족도", "학습몰입"],
};

// 변인 이름 → 관련 측정도구 이름들. 시드 적용 시 자동으로 measurementIds 채움 + 측정도구에 역참조 variableIds.
export const SEED_VARIABLE_MEASUREMENT_LINKS: Record<string, string[]> = {
  "학업적 자기효능감": ["학업적 자기효능감 척도 (김아영, 2007)"],
  "내재적 동기": ["IMI (내재적 동기 검사)", "MSLQ (학습동기·전략 검사)"],
  "학습몰입": ["K-MOLT 학습몰입 척도 (석임복, 2007)"],
  "자기조절 학습전략": [
    "MSLQ (학습동기·전략 검사)",
    "자기조절학습 검사 (양명희, 2002)",
  ],
  "외재적 인지부하": ["Cognitive Load Scale (Leppink et al., 2013)"],
  "학습 지속의도": ["TAM 척도 (Davis, 1989)"],
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
      deepEqualArr(existing.references as string[] | undefined, seedRefs) &&
      deepEqualArr(existing.altNames as string[] | undefined, seedAlts) &&
      deepEqualArr(existing.tags as string[] | undefined, seedTags);
    if (same) {
      result.concepts.skipped++;
      continue;
    }
    await archiveConceptsApi.update(existing.id, {
      description: c.description,
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
