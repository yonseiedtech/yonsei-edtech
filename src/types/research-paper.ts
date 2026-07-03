// ── 연구활동 (Research Papers) ──
export type PaperType = "thesis" | "academic";
export type ThesisLevel = "master" | "doctoral";
export type PaperReadStatus = "to_read" | "reading" | "completed";

export interface PaperVariables {
  independent?: string[];
  dependent?: string[];
  mediator?: string[];
  moderator?: string[];
  control?: string[];
}

export interface ResearchPaper {
  id: string;
  userId: string;

  paperType: PaperType;
  thesisLevel?: ThesisLevel;
  title: string;
  authors?: string;
  year?: number;
  venue?: string;
  /** 학술논문 권 (volume) */
  volume?: string;
  /** 학술논문 호/편 (issue) */
  issue?: string;
  /** 학술논문 페이지 범위 (예: "123-150") */
  pages?: string;
  doi?: string;
  url?: string;

  variables?: PaperVariables;
  /** 연구 대상·표본 (R4 문헌 매트릭스 '대상' 열, 2026-07-03) */
  sample?: string;
  methodology?: string;
  findings?: string;
  insights?: string;
  myConnection?: string;

  /**
   * 참고문헌 — 사용자가 복사·붙여넣기한 원문(서지정보 한 줄당 1건 권장).
   * 향후 구조화/네트워크 시각화 분석을 위한 raw 텍스트 저장.
   */
  references?: string;

  tags?: string[];
  readStatus?: PaperReadStatus;
  rating?: 1 | 2 | 3 | 4 | 5;

  /** 읽기 시작 일자 (YYYY-MM-DD). 상태가 "읽는 중"으로 바뀔 때 자동 기록 (수동 수정 가능) */
  readStartedAt?: string;
  /** 완독 일자 (YYYY-MM-DD). 상태가 "완독"으로 바뀔 때 자동 기록 (수동 수정 가능) */
  readCompletedAt?: string;

  /** true면 임시저장 상태 — 본 리스트에서 별도 섹션으로 노출, 메인 카운트에서 제외 */
  isDraft?: boolean;
  /** 임시저장 시 마지막으로 머문 위저드 단계 (1~5). 재개 시 해당 단계로 점프. */
  lastEditStep?: number;

  /** 졸업생 학위논문 DB 에서 임포트한 경우 — 원본 thesis id 추적 (선택) */
  sourceAlumniThesisId?: string;

  /** 초록 (AlumniThesis 임포트 또는 사용자 직접 입력) */
  abstract?: string;

  createdAt: string;
  updatedAt: string;
}

// ── 지도 노트 (교수 피드백 기록·반영 추적, 2026-06-11) ──

/** 피드백 출처 — 지도교수 / 심사위원(부심) / 동료·세미나 / 스스로 메모 */
export type FeedbackSource = "advisor" | "committee" | "peer" | "self";

export const FEEDBACK_SOURCE_LABELS: Record<FeedbackSource, string> = {
  advisor: "지도교수",
  committee: "심사위원",
  peer: "동료/세미나",
  self: "셀프 메모",
};

/** 피드백 관련 장 — 논문 5장 + 전반 */
export type FeedbackChapter = WritingPaperChapterKey | "general";

export const FEEDBACK_CHAPTER_LABELS: Record<FeedbackChapter, string> = {
  general: "전반",
  intro: "서론",
  background: "이론적 배경",
  method: "연구 방법",
  results: "연구 결과",
  conclusion: "결론",
};

export interface FeedbackActionItem {
  text: string;
  done: boolean;
}

/** 지도 노트 1건 — Firestore `advisor_feedback_notes` (본인 전용) */
export interface AdvisorFeedbackNote {
  id: string;
  userId: string;
  /** 지도받은 날짜 (YYYY-MM-DD) */
  meetingDate: string;
  source: FeedbackSource;
  chapter: FeedbackChapter;
  /** 지도 내용 메모 */
  content: string;
  /** 반영을 위한 할 일 분해 (선택) */
  actionItems?: FeedbackActionItem[];
  /** pending=미반영, applied=반영 완료 */
  status: "pending" | "applied";
  /** 어떻게 반영했는지 기록 (반영 완료 시) */
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 내 논문 작성 (단일 문서 MVP) ──
export type WritingPaperChapterKey =
  | "intro"        // 서론
  | "background"   // 이론적 배경
  | "method"       // 연구 방법
  | "results"      // 연구 결과
  | "conclusion";  // 결론

// ── 연구 방향 프로파일 (2026-06-11 — 에디터 맞춤화) ──
export type ResearchApproachType = "quantitative" | "qualitative" | "mixed";
export type ResearchDesignType =
  | "experimental"        // 실험 (무선할당)
  | "quasi_experimental"  // 준실험 (비동등 집단)
  | "non_experimental"    // 비실험 (조사·상관·기술)
  | "qualitative_design"  // 질적 설계 (사례·현상학·근거이론 등)
  | "undecided";

export const WRITING_APPROACH_LABELS: Record<ResearchApproachType, string> = {
  quantitative: "양적 연구",
  qualitative: "질적 연구",
  mixed: "혼합 연구",
};

export const RESEARCH_DESIGN_LABELS: Record<ResearchDesignType, string> = {
  experimental: "실험 설계",
  quasi_experimental: "준실험 설계",
  non_experimental: "비실험 (조사·상관)",
  qualitative_design: "질적 설계",
  undecided: "미정",
};

/** 주요 통계 분석 방법 — 결과 장 가정 검정 가이드 맞춤화 (2026-06-12) */
export type StatMethodType =
  | "ttest"
  | "anova"
  | "ancova"
  | "regression"
  | "correlation"
  | "chisquare"
  | "sem"
  | "factor_analysis";

export const STAT_METHOD_LABELS: Record<StatMethodType, string> = {
  ttest: "t검정",
  anova: "ANOVA (분산분석)",
  ancova: "ANCOVA (공분산분석)",
  regression: "회귀분석",
  correlation: "상관분석",
  chisquare: "카이제곱(χ²)",
  sem: "구조방정식(SEM)",
  factor_analysis: "요인분석",
};

export interface WritingResearchProfile {
  approach: ResearchApproachType;
  design: ResearchDesignType;
  /** 주요 분석 방법 (복수) — 양적·혼합 한정, 질적이면 빈 배열 */
  methods?: StatMethodType[];
}

// ── 구조화 본문: 챕터 → 섹션(소제목) → 단락 (2026-06-11) ──
export interface WritingParagraph {
  id: string;
  text: string;
}

export interface WritingSection {
  id: string;
  /** 소제목 — 예: "연구의 필요성", "연구 목적 및 연구 문제" */
  heading: string;
  paragraphs: WritingParagraph[];
}

/**
 * 구조화된 연구문제 항목 — 서론 '연구 문제'를 항목별로 관리(추가/삭제).
 * 각 문제에 관련 연구방법(archive_research_methods)·통계방법(archive_statistical_methods) ID를 태그로 연결.
 */
/** R2(2026-07-03): 연구 가설의 방향 */
export type HypothesisDirection = "" | "positive" | "negative" | "difference" | "nondirectional";

export const HYPOTHESIS_DIRECTION_LABELS: Record<Exclude<HypothesisDirection, "">, string> = {
  positive: "정적(+) 영향·관계",
  negative: "부적(−) 영향·관계",
  difference: "집단 간 차이",
  nondirectional: "비방향적",
};

export interface ResearchQuestionItem {
  id: string;
  text: string;
  /** archive_research_methods doc id 목록 */
  researchMethodIds: string[];
  /** archive_statistical_methods doc id 목록 */
  statMethodIds: string[];
  /** R2(2026-07-03): 연구문제와 짝을 이루는 연구 가설 — 서술문(…일 것이다) */
  hypothesisText?: string;
  /** R2: 가설 방향 — 이론·선행연구 근거가 있으면 방향까지 명시 */
  hypothesisDirection?: HypothesisDirection;
}

/** R5(2026-07-03): 측정도구 신뢰도 표 행 — 방법 장 위젯 */
export interface InstrumentItem {
  id: string;
  /** 도구명 (측정 변인) */
  name: string;
  /** 출처 — 원개발자·번안자(연도) */
  source: string;
  /** 문항 수 — 자유 표기 (예: "20(4요인)") */
  itemCount: string;
  /** 척도 (예: 5점 Likert) */
  scale: string;
  /** 선행연구 신뢰도 α */
  alphaPrior: string;
  /** 본 연구 신뢰도 α — 분석 후 기입 */
  alphaCurrent: string;
}

/** R5(2026-07-03): 연구 절차 타임라인 단계 — 방법 장 위젯 */
export interface ProcedureStep {
  id: string;
  /** 시기 (예: 1주차, 2026.3 둘째 주) */
  period: string;
  /** 단계 (예: 사전검사·처치·사후검사) */
  label: string;
  /** 주요 내용 */
  activity: string;
}

/** 부록 항목 — 제목 + 관련 메모/설명 (설문지·도구·표 등 목록) */
export interface AppendixItem {
  id: string;
  title: string;
  note: string;
}

export interface WritingPaper {
  id: string;
  userId: string;
  title?: string;
  /**
   * 5장 본문 (평문) — 구조화 모드 도입 후에는 sections 의 직렬화본.
   * 콘솔 어드민·작성 이력 charCount 등 기존 소비처 호환용으로 항상 함께 저장.
   */
  chapters?: Partial<Record<WritingPaperChapterKey, string>>;
  /** 구조화 본문 (v2) — 있으면 에디터는 이 구조를 사용 */
  sections?: Partial<Record<WritingPaperChapterKey, WritingSection[]>>;
  /** 연구 방향 프로파일 — 섹션 템플릿·작성 가이드 맞춤화 */
  researchProfile?: WritingResearchProfile;
  /** 초록 본문 (사이클 70 — 5장 본문과 별개 요약 아티팩트) */
  abstract?: string;
  /** 초록 키워드 (3~5개 권장) */
  abstractKeywords?: string[];
  /** 영문 초록 (R1, 2026-07-03) */
  abstractEn?: string;
  /** 참고문헌 텍스트 — 계획서·보고서 문헌에서 APA7 생성 후 자유 편집 (R3, 2026-07-03) */
  references?: string;
  /** 연구윤리 체크리스트 완료 항목 id 목록 (R2, 2026-07-03) */
  ethicsChecked?: string[];
  /** 측정도구 신뢰도 표 행 (R5, 2026-07-03) */
  instruments?: InstrumentItem[];
  /** 연구 절차 타임라인 (R5, 2026-07-03) */
  procedureSteps?: ProcedureStep[];
  /** 구조화된 연구문제 (서론) — 항목별 텍스트 + 연구방법·통계방법 태그 */
  researchQuestions?: ResearchQuestionItem[];
  /** 부록 목록 — 제목 + 메모 */
  appendices?: AppendixItem[];
  /** UI 표시용 마지막 자동 저장 시각 (ISO) */
  lastSavedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 명시적 버전 스냅샷 — Firestore `writing_paper_versions` (본인 전용).
 * writing_paper_history(자동 쓰로틀 통계 로그)와 달리 사용자가 의도적으로
 * 라벨을 붙여 저장하고, 복원할 수 있는 전체 본문 스냅샷.
 */
export interface WritingPaperVersion {
  id: string;
  userId: string;
  paperId: string;
  /** 사용자 지정 라벨 — 예: "지도교수 1차 피드백 반영 전" */
  label: string;
  title?: string;
  chapters?: Partial<Record<WritingPaperChapterKey, string>>;
  sections?: Partial<Record<WritingPaperChapterKey, WritingSection[]>>;
  researchProfile?: WritingResearchProfile;
  // QA-v2(2026-07-03): 스냅샷에 부속 아티팩트 포함 — 구버전 스냅샷은 필드 부재(선택 복원)
  abstract?: string;
  abstractKeywords?: string[];
  abstractEn?: string;
  references?: string;
  researchQuestions?: ResearchQuestionItem[];
  ethicsChecked?: string[];
  instruments?: InstrumentItem[];
  procedureSteps?: ProcedureStep[];
  appendices?: AppendixItem[];
  charCount: number;
  createdAt: string;
}

/** 내 논문 작성 활동 이력 — 자동 저장 시점마다(쓰로틀) 1건 적재 */
export interface WritingPaperHistory {
  id: string;
  userId: string;
  /** writing_papers.id (현재 1건이지만 다건 대비) */
  paperId: string;
  /** 저장 시각 (ISO) */
  savedAt: string;
  /** 저장 시점의 총 글자수 (모든 챕터 합) */
  charCount: number;
  /** 마지막으로 편집된 챕터 키 */
  lastChapter?: WritingPaperChapterKey;
  /** 저장 시점의 제목 스냅샷 */
  title?: string;
  createdAt: string;
}

// ── 연구 활동 타이머 세션 ──

export type StudySessionType = "reading" | "writing";

export interface StudySession {
  id: string;
  userId: string;
  type: StudySessionType;
  paperId?: string;
  writingPaperId?: string;
  targetTitle: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  source: "timer" | "manual";
  focusScore?: number;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}
