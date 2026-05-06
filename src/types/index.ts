
// ── 온라인 인터뷰 ──
export type InterviewAnswerType =
  | "text"
  | "photo"
  | "text_and_photo"
  | "single_choice"
  | "multi_choice"
  | "ox"
  | "multi_text"
  | "fill_blank";

export interface InterviewChoice {
  id: string;
  label: string;
}

export const CUSTOM_OPTION_ID = "__custom__" as const;

export interface InterviewQuestion {
  id: string;
  order: number;
  prompt: string;
  /** 작성자가 추가한 보조 설명 (질문 아래에 표시) */
  description?: string;
  answerType: InterviewAnswerType;
  required: boolean;
  /** undefined면 글자수 제한 없음 */
  maxChars?: number;
  /** multi_text/multi_choice 전용 최소 항목/선택 수 (기본 1) */
  minCount?: number;
  /** multi_text/multi_choice 전용 최대 항목/선택 수 (기본 10) */
  maxCount?: number;
  /** single_choice/multi_choice일 때 사용. ox는 자동으로 O/X 두 옵션 처리 */
  options?: InterviewChoice[];
  /** single_choice/multi_choice에서 응답자가 직접 선지를 추가할 수 있는지 */
  allowCustomOption?: boolean;
}

export interface InterviewMeta {
  intro: string;
  deadline?: string;
  responseVisibility?: "public" | "staff_only";
  questions: InterviewQuestion[];
}

export interface InterviewAnswer {
  questionId: string;
  /** text / text_and_photo / fill_blank 답변 */
  text?: string;
  imageUrls?: string[];
  /** single_choice/ox 응답: 선택한 옵션 id (ox는 "O" 또는 "X", 직접 입력은 CUSTOM_OPTION_ID) */
  selectedOptionId?: string;
  /** multi_choice 응답: 선택한 옵션 id 목록 (직접 입력 포함 시 CUSTOM_OPTION_ID 포함) */
  selectedOptionIds?: string[];
  /** allowCustomOption=true이고 직접 입력 선택 시 사용자가 입력한 텍스트 */
  customOptionText?: string;
  /** multi_text 응답: 복수 텍스트 항목 */
  texts?: string[];
  /** 이 질문에 머문 누적 시간 (밀리초) */
  elapsedMs?: number;
}

export interface InterviewResponse {
  id: string;
  postId: string;
  respondentId: string;
  respondentName: string;
  respondentRole?: string;
  status: "draft" | "submitted";
  answers: InterviewAnswer[];
  createdAt: string;
  updatedAt?: string;
  submittedAt?: string;
  /** 응답자가 인터뷰에 머문 총 시간 (밀리초) */
  totalElapsedMs?: number;
}

export type InterviewReactionType = "like" | "cool" | "empathize" | "cheer";

export const INTERVIEW_REACTION_TYPES: InterviewReactionType[] = ["like", "cool", "empathize", "cheer"];

export const INTERVIEW_REACTION_LABELS: Record<InterviewReactionType, string> = {
  like: "좋아요",
  cool: "멋져요",
  empathize: "공감돼요",
  cheer: "응원해요",
};

export const INTERVIEW_REACTION_EMOJIS: Record<InterviewReactionType, string> = {
  like: "👍",
  cool: "✨",
  empathize: "💗",
  cheer: "📣",
};

export interface InterviewResponseReaction {
  id: string;
  responseId: string;
  postId: string;
  /** 특정 질문 답변에 대한 반응이면 설정. 없으면 응답 전체에 대한 반응. */
  questionId?: string;
  userId: string;
  type: InterviewReactionType;
  createdAt: string;
}

export interface InterviewResponseComment {
  id: string;
  responseId: string;
  postId: string;
  /** 특정 질문 답변에 대한 댓글이면 설정. 없으면 응답 전체에 대한 댓글. */
  questionId?: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

// ── 학술 포트폴리오 시스템 (Track 2) ──

/** 활동 참여 시 회원의 역할 */
export type ActivityRole =
  | "leader"
  | "co_leader"
  | "presenter"
  | "facilitator"
  | "participant"
  | "mentor"
  | "mentee"
  | "designer"
  | "researcher"
  | "writer"
  | "operator"
  | "other";

export const ACTIVITY_ROLE_LABELS: Record<ActivityRole, string> = {
  leader: "리더",
  co_leader: "공동리더",
  presenter: "발표자",
  facilitator: "진행자",
  participant: "참여자",
  mentor: "멘토",
  mentee: "멘티",
  designer: "디자이너",
  researcher: "연구자",
  writer: "집필",
  operator: "운영",
  other: "기타",
};

export type ActivityOutputType =
  | "presentation"
  | "paper"
  | "code"
  | "video"
  | "design"
  | "report"
  | "dataset"
  | "other";

export const ACTIVITY_OUTPUT_TYPE_LABELS: Record<ActivityOutputType, string> = {
  presentation: "발표자료",
  paper: "논문/리포트",
  code: "코드/노트북",
  video: "영상",
  design: "디자인",
  report: "보고서",
  dataset: "데이터셋",
  other: "기타",
};

export interface ActivityOutput {
  id: string;
  type: ActivityOutputType;
  title: string;
  url?: string;
  /** Firestore base64 또는 GCS path */
  attachmentPath?: string;
  description?: string;
  createdAt: string;
}

/** 회원이 활동/세미나에 참여한 단위 — 역할·산출물·회고를 누적 */
export interface ActivityParticipation {
  id: string;
  /** Activity.id 또는 Seminar.id 중 하나 */
  activityId?: string;
  seminarId?: string;
  userId: string;
  role: ActivityRole;
  /** 자유 입력 추가 역할 */
  roleDetail?: string;
  outputs: ActivityOutput[];
  growthNotes?: string;
  startedAt: string;
  endedAt?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AwardScope = "internal" | "external";

export const AWARD_SCOPE_LABELS: Record<AwardScope, string> = {
  internal: "교내/학회",
  external: "교외",
};

/** 수상 — 활동 연계(linkedActivityId) 또는 단독 */
export interface Award {
  id: string;
  userId: string;
  title: string;
  organization: string;
  scope: AwardScope;
  linkedActivityId?: string;
  date: string;
  description?: string;
  certificatePath?: string;
  evidenceUrls?: string[];
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExternalActivityType =
  | "lecture"
  | "publication"
  | "conference"
  | "panel"
  | "community"
  | "media"
  | "consulting"
  | "other";

export const EXTERNAL_ACTIVITY_TYPE_LABELS: Record<ExternalActivityType, string> = {
  lecture: "강연",
  publication: "기고/출판",
  conference: "학술대회 발표",
  panel: "패널/세션",
  community: "커뮤니티 운영",
  media: "미디어 출연",
  consulting: "자문",
  other: "기타",
};

/** 대외활동 — "연세대학교 교육대학원 교육공학 석사과정생" 신분으로 수행한 활동 */
export interface ExternalActivity {
  id: string;
  userId: string;
  title: string;
  type: ExternalActivityType;
  /** 신분 표기 (고정값) */
  affiliation: "연세대학교 교육대학원 교육공학 석사과정생";
  organization?: string;
  role?: string;
  date: string;
  endDate?: string;
  location?: string;
  url?: string;
  description?: string;
  evidenceUrls?: string[];
  evidenceAttachments?: string[];
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_EXTERNAL_AFFILIATION =
  "연세대학교 교육대학원 교육공학 석사과정생" as const;

export type ContentCreationType =
  | "interview_interviewer"
  | "interview_interviewee"
  | "paper_curation"
  | "newsletter_article"
  | "blog"
  | "video"
  | "podcast"
  | "other";

export const CONTENT_CREATION_TYPE_LABELS: Record<ContentCreationType, string> = {
  interview_interviewer: "인터뷰 진행",
  interview_interviewee: "인터뷰 응답",
  paper_curation: "논문 큐레이션",
  newsletter_article: "뉴스레터 기고",
  blog: "블로그",
  video: "영상",
  podcast: "팟캐스트",
  other: "기타",
};

/** 콘텐츠 제작 이력 (인터뷰/큐레이션/기고/영상 등) */
export interface ContentCreation {
  id: string;
  userId: string;
  type: ContentCreationType;
  title: string;
  url?: string;
  internalRefType?: "interview" | "newsletter_section" | "post";
  internalRefId?: string;
  publishedAt: string;
  description?: string;
  /** 사이트 활동 결과로 자동 적재된 항목 여부 */
  autoCollected: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── 졸업생 학위논문 DB (Track 4) ──

export type GraduationType = "thesis" | "research_report";

export const GRADUATION_TYPE_LABELS: Record<GraduationType, string> = {
  thesis: "논문",
  research_report: "연구보고서",
};

export type ThesisAuthorMappingStatus =
  | "unmapped"   // 회원 매핑 시도 안 함
  | "candidate"  // 자동 추천 후보 있음 (운영진 검토 대기)
  | "verified"   // 운영진/본인 클레임 검증 완료
  | "ambiguous"; // 동명이인 등으로 매핑 불가

export type ThesisSeedSource =
  | "csv_seed_2026_04"
  | "manual"
  | "self_claim";

/** 졸업생 학위논문(또는 연구보고서) 메타데이터 — 회원 미매핑 상태로도 적재 가능 */
export interface AlumniThesis {
  id: string;
  graduationType: GraduationType;
  /** 학위수여년월 YYYY-MM (원본 "2000. 8" → "2000-08") */
  awardedYearMonth: string;
  authorName: string;
  /** 회원 매핑 결과 — 동명이인 위험으로 자동 매핑은 후보까지만 */
  authorUserId?: string;
  authorMappingStatus: ThesisAuthorMappingStatus;
  authorMappingCandidates?: string[];
  title: string;
  titleEn?: string;
  advisorName?: string;
  advisorUserId?: string;
  keywords: string[];
  /** 원본 자유 텍스트 키워드 (정규화 전) */
  keywordsRaw?: string;
  /** 교육공학 아카이브 개념 ID (archive_concepts) */
  conceptIds?: string[];
  /** 교육공학 아카이브 변인 ID (archive_variables) */
  variableIds?: string[];
  /** 교육공학 아카이브 측정도구 ID (archive_measurements) */
  measurementIds?: string[];
  abstract?: string;
  toc?: string;
  dcollectionUrl?: string;
  pdfUrl?: string;
  source: ThesisSeedSource;
  /** 참고문헌 추출 완료 여부 (V1.5+) */
  hasReferenceList: boolean;
  referenceCount?: number;
  /** 초록 임베딩 생성 완료 여부 (V2+) */
  hasEmbedding: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ThesisReferenceSource = "manual" | "grobid" | "crossref" | "openalex";

/** 학위논문 참고문헌 1건 (V1.5+) */
export interface ThesisReference {
  id: string;
  thesisId: string;
  rawCitation: string;
  doi?: string;
  normalizedTitle?: string;
  normalizedAuthors?: string[];
  year?: number;
  source: ThesisReferenceSource;
  createdAt: string;
}

/** 본인 학위논문 클레임 (졸업생 회원이 "이게 내 논문" 클레임) */
export interface ThesisClaim {
  id: string;
  thesisId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  evidence?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

// ── Track 5: 수강과목 관리 ──

export type SemesterTerm = "spring" | "summer" | "fall" | "winter";

export const SEMESTER_TERM_LABELS: Record<SemesterTerm, string> = {
  spring: "전기",
  summer: "여름학기",
  fall: "후기",
  winter: "겨울학기",
};

export type CourseCategory =
  | "major_required"
  | "major_elective"
  | "teaching_general"
  | "other_major"
  | "general"
  | "research"
  | "other";

export const COURSE_CATEGORY_LABELS: Record<CourseCategory, string> = {
  major_required: "전공필수",
  major_elective: "전공선택",
  teaching_general: "교직일반",
  other_major: "타전공",
  general: "교양",
  research: "연구",
  other: "기타",
};

/** 학기별 개설 과목 (운영진/조교가 관리하는 마스터) */
export interface CourseOffering {
  id: string;
  year: number;            // 2026
  term: SemesterTerm;
  courseCode?: string;     // EDU5001
  courseName: string;
  professor?: string;
  credits?: number;
  category: CourseCategory;
  schedule?: string;       // "월 18:30-21:00"
  classroom?: string;
  syllabusUrl?: string;
  notes?: string;
  /** false = 폐강 (카탈로그에서 숨김) */
  active: boolean;
  enrollmentCap?: number;
  /** 학기 개강일(주차 1의 시작일) YYYY-MM-DD — 미지정 시 학기+수업요일에서 자동 추론 */
  semesterStartDate?: string;
  /** 총 주차 수 (기본 15) */
  totalWeeks?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 수강생 명단 (운영진이 관리)
 * — 한 과목(courseOfferingId)에 다수의 수강생을 등록.
 * — userId 가 있으면 회원 계정 연동, 없으면 외부 학생 (학번/이름만 보유 가능).
 */
export interface CourseEnrollment {
  id: string;
  courseOfferingId: string;
  /** 빠른 조회용 비정규화 (학기 단위 통계) */
  year: number;
  term: SemesterTerm;
  /** 회원 계정 연동 (선택) */
  userId?: string;
  /** 학번 (회원 비연동인 외부 수강생용) */
  studentId?: string;
  studentName: string;
  email?: string;
  /** 역할: 일반 수강생/조교(TA)/청강 */
  role?: "student" | "ta" | "auditor";
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const ENROLLMENT_ROLE_LABELS: Record<NonNullable<CourseEnrollment["role"]>, string> = {
  student: "수강생",
  ta: "조교(TA)",
  auditor: "청강",
};

/**
 * 종합시험 응시 기록
 * — 회원이 직접 입력하는 소요조사 + 신청·결과
 * — 운영진(president 이상)이 학기별로 모아서 관리
 */
export type ComprehensiveExamStatus = "planning" | "applied" | "passed" | "failed";

export const COMPREHENSIVE_EXAM_STATUS_LABELS: Record<ComprehensiveExamStatus, string> = {
  planning: "응시 예정",
  applied: "신청 완료",
  passed: "합격",
  failed: "불합격",
};

export interface ComprehensiveExamRecord {
  id: string;
  userId: string;
  studentName: string;
  studentId?: string;
  /** 응시 예정/응시한 학기 (소요조사 시점) */
  plannedYear: number;
  plannedTerm: SemesterTerm;
  status: ComprehensiveExamStatus;
  /** 응시 희망 과목 2개 (본인 수강 과목 중 선택) — courseOfferings.id 배열 */
  selectedCourseIds?: string[];
  /** 선택 과목명 스냅샷 (원본 CourseOffering 이 사라져도 표시 유지) */
  selectedCourseNames?: string[];
  /** 자유 메모 (응시 영역, 결과 상세 등) */
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/* ────────────────────────────────────────────────────────────
 * 강의 후기 (Course Review)
 * ──────────────────────────────────────────────────────────── */
export type ExamType = "exam" | "assignment" | "none";
export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  exam: "시험",
  assignment: "과제 대체",
  none: "없음",
};

export type AssignmentFrequency = "none" | "rare" | "biweekly" | "weekly" | "frequent";
export const ASSIGNMENT_FREQUENCY_LABELS: Record<AssignmentFrequency, string> = {
  none: "없음",
  rare: "드물게(학기 1~2회)",
  biweekly: "격주",
  weekly: "매주",
  frequent: "주 2회 이상",
};

export interface CourseReview {
  id: string;
  /** 후기 대상 강의 (CourseOffering.id) */
  courseOfferingId: string;
  /** denorm: 빠른 표시·필터용 */
  courseName: string;
  /** denorm */
  professor?: string;
  /** denorm: 카테고리별 필터링용 */
  category?: CourseCategory;
  authorId: string;
  /** 익명일 경우 빈 문자열 또는 "익명" */
  authorName: string;
  anonymous: boolean;
  /** 1~5 (전반 평점) */
  rating: number;
  /** 평점 평가 이유 */
  ratingReason?: string;
  /** 1~5 (과제량 — 적음 1, 많음 5) */
  workload?: number;
  /** 1~5 (난이도 — 쉬움 1, 어려움 5) */
  difficulty?: number;
  /** 후기 총평 (기존 comment 필드를 재사용) */
  comment: string;
  /** 추천 여부 */
  recommend: boolean;
  /** 수강 연도 */
  year: number;
  /** 수강 학기 */
  term: SemesterTerm;

  /** 중간고사 운영 형태 */
  midtermType?: ExamType;
  /** 기말고사 운영 형태 */
  finalType?: ExamType;
  /** 시험에 대한 추가 의견 */
  examNotes?: string;

  /** 과제 유형 (개인 보고서/팀 프로젝트/발표/실습 등 자유 입력) */
  assignmentType?: string;
  /** 과제 빈도 */
  assignmentFrequency?: AssignmentFrequency;
  /** 과제에 대한 추가 의견 */
  assignmentNotes?: string;

  /** 추천 대상 (예: "1학기 신입생", "통계 배경 있는 학생") */
  recommendedFor?: string;

  /** 도움됨 누적 */
  helpfulCount: number;
  /** "도움됨" 표시한 사용자 ID 목록 (중복 방지) */
  helpfulBy?: string[];
  createdAt: string;
  updatedAt: string;
}

/** 수업 진행 모드 */
export type ClassSessionMode =
  | "in_person"   // 대면 수업 (기본)
  | "zoom"        // 줌 등 비대면
  | "assignment"  // 과제 대체
  | "cancelled"   // 휴강
  | "field"       // 외부 일정/현장학습
  | "exam";       // 시험

export const CLASS_SESSION_MODE_LABELS: Record<ClassSessionMode, string> = {
  in_person: "대면",
  zoom: "비대면(줌)",
  assignment: "과제 대체",
  cancelled: "휴강",
  field: "현장학습",
  exam: "시험",
};

/**
 * 수업 진행 스케쥴 — 특정 일자에 기본 운영방식과 다른 사항이 있을 때 기록.
 * 같은 과목/일자가 중복될 수 있으므로 화면 단에서 최신값을 우선 표시한다.
 */
export interface ClassSession {
  id: string;
  courseOfferingId: string;
  /** YYYY-MM-DD */
  date: string;
  mode: ClassSessionMode;
  /** 줌 링크/외부 링크 */
  link?: string;
  notes?: string;
  /** 출석한 수강생 userId (CourseEnrollment.userId 보유분) */
  attendedUserIds?: string[];
  /** userId 미연동 외부 수강생용 — CourseEnrollment.id */
  attendedStudentIds?: string[];
  /** 결석 사유 메모 — key 형식: "user:<uid>" 또는 "enrollment:<id>" */
  absenceNotes?: Record<string, string>;
  /** 마지막 출석 저장 시각 ISO */
  attendanceUpdatedAt?: string;
  /** 마지막 출석 저장자 userId */
  attendanceUpdatedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── 수업 메모 (수강생 개인, 수업일별) ──

/** 수강생이 개별 수업(courseOffering×date)에 대해 남기는 개인 메모 */
export interface CourseSessionNote {
  id: string;
  courseOfferingId: string;
  /** YYYY-MM-DD (수업 일자) */
  date: string;
  /** 작성자(수강생) userId */
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

// ── 수업 TO-DO (수강생 개인) ──

export type CourseTodoType =
  | "assignment"          // 과제
  | "paper_reading"       // 논문 읽기
  | "paper_writing"       // 논문 작성
  | "presentation_prep"   // 발표 준비
  | "lecture_review"      // 수업 후기 (cron 자동 생성, 한 줄 후기 → course_reviews 적재)
  | "other";              // 기타

export const COURSE_TODO_TYPE_LABELS: Record<CourseTodoType, string> = {
  assignment: "과제",
  paper_reading: "논문 읽기",
  paper_writing: "논문 작성",
  presentation_prep: "발표 준비",
  lecture_review: "수업 후기",
  other: "기타",
};

export const COURSE_TODO_TYPE_COLORS: Record<CourseTodoType, string> = {
  assignment: "bg-amber-100 text-amber-700",
  paper_reading: "bg-blue-100 text-blue-700",
  paper_writing: "bg-purple-100 text-purple-700",
  presentation_prep: "bg-emerald-100 text-emerald-700",
  lecture_review: "bg-rose-100 text-rose-700",
  other: "bg-slate-100 text-slate-700",
};

/** 수강생이 특정 수업에서 생성한 해야 할 일 */
export interface CourseTodo {
  id: string;
  courseOfferingId: string;
  /** 작성자 userId */
  userId: string;
  type: CourseTodoType;
  content: string;
  /** YYYY-MM-DD, 선택 */
  dueDate?: string;
  /** 연결된 수업 일자(수업에서 생성한 경우) — YYYY-MM-DD */
  sessionDate?: string;
  completed?: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}


// ── 도메인별 분해 (types-domain-split Phase 1) — 신규 sub 파일에서 re-export ──
// 사용처(@/types) 영향 없음. 단순 분리.
export * from "./steppingstone";
export * from "./popup";
export * from "./defense";
export * from "./grad-life";
export * from "./edutech-archive";
export * from "./user";
export * from "./board";
export * from "./research-paper";
export * from "./research-report";
export * from "./seminar";
export * from "./academic";
export * from "./operations";
