// ── Track 5: 수강과목 관리 — types-domain-split Phase 6 ──

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
