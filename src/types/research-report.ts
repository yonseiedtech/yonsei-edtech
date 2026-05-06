// ── 연구 보고서 ──

export interface ResearchGroup {
  id: string;
  name: string;
  paperIds: string[];
  integration: string;
  insight: string;
}

export type EducationFormat = "" | "offline" | "online" | "blended";
export type EvidenceType = "" | "observation" | "assessment" | "survey" | "prior_research" | "other";
export type CauseType = "" | "learner" | "instructional_design" | "environment" | "other";

/**
 * Sprint 58/60: 연구 접근 패러다임
 *  - analytical : 분석·처방형 (ADDIE / 체제적 ID)
 *  - generative : 생성·구성형 (구성주의 · DBR · PAR)
 *  - action_research : 액션리서치 (Sprint 60: 자기 실천 사이클)
 *  - mixed_methods   : 혼합방법론 (Sprint 60: 양적+질적 통합)
 *  - free       : 1.5 챕터 skip
 */
export type ResearchApproach =
  | ""
  | "analytical"
  | "generative"
  | "action_research"
  | "mixed_methods"
  | "free";

export const RESEARCH_APPROACH_LABELS: Record<Exclude<ResearchApproach, "">, string> = {
  analytical: "분석·처방형",
  generative: "생성·구성형",
  action_research: "액션리서치",
  mixed_methods: "혼합방법론",
  free: "자유 진행",
};

export const RESEARCH_APPROACH_HINTS: Record<Exclude<ResearchApproach, "">, string> = {
  analytical:
    "ADDIE / 체제적 교수설계 / 행동주의·인지주의 ID. ‘현상 → 원인 진단 → 이론적 처방’ 흐름. (1.5 진단 5슬라이드)",
  generative:
    "구성주의 학습설계 / DBR / 참여실행연구. ‘맥락 이해 → 함께 만들기 → 반복 진화’ 흐름. (1.5 탐구 3슬라이드)",
  action_research:
    "현장 교사·연구자가 자기 실천을 스스로 개선하는 Plan-Act-Observe-Reflect 사이클. (1.5 액션 3슬라이드)",
  mixed_methods:
    "양적 + 질적 데이터를 통합/대조해 한 연구 문제에 답하는 디자인. 수렴/설명/탐색/내포형. (1.5 혼합 4슬라이드)",
  free:
    "패러다임 분기를 건너뛰고 1 → 2 → 3 으로 곧장 진행. (1.5 슬라이드 모두 skip)",
};

/** Sprint 57: 인터뷰 모드 라벨 (진단 단계 5슬라이드 신설용) */
export const EVIDENCE_TYPE_LABELS: Record<Exclude<EvidenceType, "">, string> = {
  observation: "수업 관찰",
  assessment: "평가/시험 결과",
  survey: "설문/인터뷰",
  prior_research: "선행연구",
  other: "기타",
};

export const CAUSE_TYPE_LABELS: Record<Exclude<CauseType, "">, string> = {
  learner: "학습자 요인",
  instructional_design: "수업·매체 설계",
  environment: "환경·자원",
  other: "기타",
};

export interface ProblemEvidenceItem {
  id: string;
  type: EvidenceType;
  content: string;
}

export interface ProblemCauseItem {
  id: string;
  type: CauseType;
  content: string;
}

export interface ProblemMeasurementItem {
  id: string;
  factor: string;
  indicator: string;
}

// ── v2: 2. 교육공학 이론 — 구조화 입력 ──
export interface TheoryConcept {
  id: string;
  /** 핵심 개념 이름 (예: "최근접발달영역(ZPD)") */
  name: string;
  /** 정의 / 의미 (1~2문장) */
  definition: string;
}

/** 이론 카드: 사용자가 선택한 이론 1개에 대한 상세 입력. */
export interface TheoryCard {
  id: string;
  /** 이론 이름 (예: "Vygotsky 사회문화이론") */
  name: string;
  /** 주요 학자 (선택) */
  scholar?: string;
  /** 발표 연도 (선택) */
  year?: string;
  /** 이 이론을 선택한 이유 (3~5줄) */
  selectionReason?: string;
  /** 핵심 개념 — 반복 입력 (3~5개 권장) */
  concepts?: TheoryConcept[];
  /** 이 이론이 1번 문제와 어떻게 연결되는지 */
  problemLink?: string;
}

export interface ResearchReport {
  id: string;
  userId: string;
  fieldDescription: string;
  fieldProblem: string;
  problemPhenomenon: string;
  problemEvidence: string;
  problemCause: string;
  problemDefinition: string;
  theoryType: string;
  theoryDefinition: string;
  theoryConnection: string;
  priorResearchAnalysis: string;
  priorResearchPaperIds: string[];
  priorResearchGroups: ResearchGroup[];
  // ── v2: 1. 교육현장의 문제 정의 — 구조화 입력 (모두 옵셔널: 구버전 데이터 호환) ──
  /** 1-1. 대상 학습자 (예: 중학교 2학년) */
  fieldAudience?: string;
  /** 1-1. 교육 형태 */
  fieldFormat?: EducationFormat;
  /** 1-1. 교과 또는 학습 주제 */
  fieldSubject?: string;
  /** 1-2. 현상 — 반복 입력 (구버전 problemPhenomenon이 있으면 첫 항목으로 마이그레이션) */
  problemPhenomena?: string[];
  /** 1-2. 근거 — 유형 + 내용 */
  problemEvidences?: ProblemEvidenceItem[];
  /** 1-2. 원인 — 유형 + 내용 */
  problemCauses?: ProblemCauseItem[];
  /** 1-3. 이 문제의 영향 */
  problemImpact?: string;
  /** 1-3. 왜 해결이 필요한가 */
  problemImportance?: string;
  /** 1-4. 주요 대상 */
  scopeAudience?: string;
  /** 1-4. 초점이 되는 상황/맥락 */
  scopeContext?: string;
  /** 1-4. 제외하거나 한정할 범위 */
  scopeExclusion?: string;
  /** 1-5. 측정 가능성 — 문제 요소 + 관찰 가능한 지표 */
  problemMeasurements?: ProblemMeasurementItem[];
  // ── v3: 1.5 문제 진단/탐구 — Sprint 57+58 (이론 챕터 진입 전 단계, 패러다임 분기) ──
  /** Sprint 58: 연구 접근 패러다임 — 인터뷰 1.5 챕터 슬라이드 분기에 사용 */
  researchApproach?: ResearchApproach;
  /** 1.5-3 (분석형). 이미 시도해본 해결책과 그 결과 */
  diagnosisAttempts?: string;
  /** 1.5-4 (분석형). 현재 상태 vs 도달하려는 상태의 격차 (Performance Gap) */
  diagnosisGap?: string;
  /** 1.5-5 (분석형). 본 연구가 집중할 핵심 원인 — 이론 선택의 근거가 됨 */
  diagnosisPrimaryCause?: string;
  // ── v4: 학습자와 학습 목표 — Sprint 66 (Sprint 67·68 에서 챕터 분리) ──
  /** 3-1. 학습자 프로필 (학년·인원·배경) */
  learnerProfile?: string;
  /** 3-2. 학습자 인지·지식 수준 (사전지식·습관) */
  learnerCognitive?: string;
  /** 3-3. 학습자 정서·동기 상태 (관심·자신감·불안) */
  learnerAffective?: string;
  /** 4-2. 배워야 할 지식·이해 (Bloom 인지) */
  outcomeCognitive?: string;
  /** 4-3. 배워야 할 기능·태도 (Krathwohl 정의적 + Simpson 심동적) */
  outcomeSkillAttitude?: string;
  // ── v5: Sprint 68 — 환경 분석 + 학습 과제·목표 분리·보강 (정통 ID 흐름) ──
  /** 2-1. Learning Context — 학습 환경 (시설·매체·시간·자원) */
  envLearning?: string;
  /** 2-2. Transfer Context — 적용 환경 (학습 후 어디서 발휘) */
  envTransfer?: string;
  /** 2-3. Orienting Context — 제약·정책·문화 맥락 */
  envConstraint?: string;
  /** 4-1. Task Analysis — 학습 과제 위계 분해 (Gagné/Jonassen) — legacy 단일 textarea */
  taskDecompose?: string;
  /** Sprint 75 F5: Task Analysis 단계 분리 입력 — 우선시. 비어있으면 taskDecompose 줄단위로 자동 변환 */
  taskSteps?: string[];
  /** 4-4. Mager ABCD — Audience·Behavior·Condition·Degree 형식 학습 목표 (legacy 단일 필드) */
  outcomeMagerABCD?: string;
  /** Sprint 72 F4: Mager ABCD 분리 입력 — 4 영역별 독립 필드 */
  outcomeMagerA?: string;
  outcomeMagerB?: string;
  outcomeMagerC?: string;
  outcomeMagerD?: string;
  /** 4-2. Sprint 68: 처치를 통해 변화시키려는 학습 영역 (Bloom 3대 영역) — 처치 적합성·차시 수 가이드 트리거 */
  outcomePriorityDomain?: "" | "cognitive" | "affective" | "psychomotor" | "integrated";
  // ── v3 트랙 필드 (Sprint 66 에서 인터뷰 미노출, schema 만 보존 — 추후 고급 모드에서 활용 가능) ──
  /** 1.5-i1 (생성형). 학습자·교사가 현상에 부여하는 의미 */
  inquiryMeaning?: string;
  /** 1.5-i2 (생성형). 설계 맥락·도구·상호작용 */
  inquiryContext?: string;
  /** 1.5-i3 (생성형). 반복 설계 사이클 — 어떻게 함께 진화시킬지 */
  inquiryCycle?: string;
  /** 1.5-a1 (액션리서치). 본인의 현장 위치·역할 */
  actionRole?: string;
  /** 1.5-a2 (액션리서치). Plan-Act-Observe-Reflect 사이클 설계 */
  actionCycle?: string;
  /** 1.5-a3 (액션리서치). 함께 성찰할 동료/공동연구자 */
  actionCommunity?: string;
  /** 1.5-a4 (액션리서치, Sprint 62). 시작 기준선 — 변화 측정 대상 */
  actionBaseline?: string;
  /** 1.5-a5 (액션리서치, Sprint 62). 사이클 동안 수집할 데이터 (저널/현장노트/인터뷰 등) */
  actionDataCollection?: string;
  /** 1.5-a6 (액션리서치, Sprint 62). 자기 정당화 방어 (member check / peer debrief / triangulation) */
  actionValidity?: string;
  /** 1.5-m1 (혼합방법론). 채택한 혼합 디자인 (convergent/explanatory/exploratory/embedded) */
  mixedDesign?: string;
  /** 1.5-m2 (혼합방법론). 양적 데이터 — 무엇을 어떻게 */
  mixedQuant?: string;
  /** 1.5-m3 (혼합방법론). 질적 데이터 — 무엇을 어떻게 */
  mixedQual?: string;
  /** 1.5-m4 (혼합방법론). 두 데이터의 통합 / 대조 방식 */
  mixedIntegration?: string;
  /** 1.5-m5 (혼합방법론, Sprint 62). 양·질 우선순위 (양주도/질주도/동등) */
  mixedPriority?: string;
  /** 1.5-m6 (혼합방법론, Sprint 62). 표집 전략 (연결된/대조된/내포된) */
  mixedSampling?: string;
  /** 1.5-m7 (혼합방법론, Sprint 62). 메타-추론 타당성 — 두 데이터 통합 신뢰성 확보 */
  mixedValidity?: string;
  // ── v2: 2. 교육공학 이론 — 구조화 입력 (옵셔널, 구버전 호환) ──
  /** 2. 적용 이론 카드 — 1~다수 */
  theoryCards?: TheoryCard[];
  /** 2-2. 이론들이 1번 문제와 어떻게 연결되는지 (이론 간 종합) */
  theoryRelationProblem?: string;
  /** 2-2. 각 이론의 역할 분담 (이론 A는 ~를, 이론 B는 ~를 설명) */
  theoryRelationRoles?: string;
  /** 2-2. 통합적 관점 — 이론들이 함께 만들어내는 의미 */
  theoryRelationIntegration?: string;
  lastSavedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 연구 계획서 ──
export interface ResearchProposal {
  id: string;
  userId: string;
  /** 논문 제목 (국문) */
  titleKo: string;
  /** 논문 제목 (영문) */
  titleEn: string;
  /** 연구 목적 */
  purpose: string;
  /** 연구 범위 */
  scope: string;
  /** 연구 방법 */
  method: string;
  /** 연구 내용 */
  content: string;
  /** 참고문헌 (ResearchPaper.id 참조, APA7 형식은 렌더링 시 생성) */
  referencePaperIds: string[];
  lastSavedAt?: string;
  createdAt: string;
  updatedAt: string;
}
