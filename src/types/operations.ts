// ── 운영(Operations) 도메인 (types-domain-split Phase 5) ──
// HandoverDocument, BusinessCardExchange, WaitlistEntry, AppNotification,
// AuditLog, AdminTodo, ActivityProgress, ProgressMeeting, ActivityMaterial,
// EmailLog, Inquiry — 운영진/시스템 운영 관련 횡단 타입 모음.

// ── 운영진 업무수행철 (인수인계철) ──
export interface HandoverDocument {
  id: string;
  role: string;          // 직책명 (회장, 부회장, 총무 등)
  authorId: string;
  authorName: string;
  term: string;          // 임기 (예: "2026-1")
  title: string;
  content: string;       // 업무 내용 (마크다운)
  category: "routine" | "project" | "reference" | "caution";
  priority: "high" | "medium" | "low";
  createdAt: string;
  updatedAt: string;
}

export const HANDOVER_CATEGORY_LABELS: Record<HandoverDocument["category"], string> = {
  routine: "정기 업무",
  project: "진행 프로젝트",
  reference: "참고 자료",
  caution: "주의 사항",
};

// ── 명함 교환 로그 ──
export interface BusinessCardExchange {
  id: string;
  /** 명함 주인 (내 명함을 상대가 스캔) */
  ownerId: string;
  ownerName: string;
  /** 받은 사람 (스캔한 사람) */
  receiverId: string;
  receiverName: string;
  /** 'qr' = QR 스캔, 'link' = 공유 링크 클릭 */
  channel: "qr" | "link";
  note?: string;
  createdAt: string;
}

// ── 세미나 대기열 ──
export interface WaitlistEntry {
  id: string;
  seminarId: string;
  userId: string;
  userName: string;
  position: number; // 대기 순번
  status: "waiting" | "promoted" | "cancelled";
  promotedAt?: string;
  createdAt: string;
}

// ── 알림 ──
export type NotificationType =
  | "member_approved"    // 회원 가입 승인
  | "member_rejected"    // 회원 가입 거절
  | "comment"            // 내 글에 댓글
  | "notice"             // 새 공지사항
  | "certificate"        // 수료증/감사장 발급
  | "seminar_new"        // 새 세미나 등록
  | "seminar_reminder"   // 세미나 리마인더
  | "waitlist_promoted"  // 대기열 → 참가 승격
  | "newsletter";        // 뉴스레터 발행

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;          // 클릭 시 이동할 경로
  read: boolean;
  createdAt: string;
}

// ── 감사 로그 ──
export interface AuditLog {
  id: string;
  action: string;
  category: "member" | "seminar" | "post" | "settings" | "role" | "system";
  detail: string;
  targetId?: string;
  targetName?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

// ── 운영 To-Do ──
export interface AdminTodo {
  id: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
  /** 학술활동(study/project/external) 연동 — MyTodosWidget +추가 다이얼로그에서 활동 컨텍스트 첨부 시 채워짐 */
  relatedActivityId?: string;
  /** denorm: 활동 제목 (조회 시 fetch 절감) */
  relatedActivityTitle?: string;
  /** denorm: 활동 타입 (활동 페이지 라우팅에 사용) */
  relatedActivityType?: "study" | "project" | "external";
  /** 세미나 연동 — 세미나 운영 워크플로우(D-day 타임라인)에 비정형 업무를 묶기 위해 사용 */
  relatedSeminarId?: string;
  /** denorm: 세미나 제목 */
  relatedSeminarTitle?: string;
  /** denorm: 세미나 개최일자(YYYY-MM-DD) — 위젯에서 D-day 배지 계산에 활용 */
  relatedSeminarDate?: string;
}

// ── 활동 진행 기록 ──
export type ActivityProgressMode = "in_person" | "zoom";

export const ACTIVITY_PROGRESS_MODE_LABELS: Record<ActivityProgressMode, string> = {
  in_person: "대면",
  zoom: "ZOOM",
};

export interface ActivityProgress {
  id: string;
  activityId: string;
  week: number;
  date: string;
  startTime?: string; // "HH:mm"
  endTime?: string;   // "HH:mm"
  mode?: ActivityProgressMode;
  title: string;
  description?: string;
  status: "planned" | "in_progress" | "completed";
  attachments?: string[];
  /** 주차별 출석한 회원 id (Sprint K) */
  attendedUserIds?: string[];
  /** 주차별 자료 (Sprint K) */
  materials?: { url: string; name: string; size?: number; type?: string }[];
  createdAt: string;
}

// ── 진행 미팅 타이머 (스터디·프로젝트 회의 실시간 진행) ──
export type ProgressMeetingStatus = "planning" | "running" | "paused" | "completed";

/** 미팅 한 섹션(아젠다 항목) */
export interface ProgressMeetingSection {
  id: string;
  title: string;
  /** 예상 진행 시간(분) */
  estimatedMinutes: number;
  /** 누적 실제 진행 시간(초). 진행 중일 때 startedAt 기준으로 클라이언트에서 합산하여 표시. */
  actualSeconds: number;
  /** 현재 섹션이 시작된 시각(ISO). 일시정지/완료 시 undefined. */
  startedAt?: string;
  /** 섹션을 완료한 시각(ISO). */
  endedAt?: string;
}

export interface ProgressMeeting {
  id: string;
  activityId: string;
  /** 연결된 ActivityProgress(주차) ID — 1:1 대응 */
  activityProgressId: string;
  status: ProgressMeetingStatus;
  /** 진행 중인 섹션 인덱스. 시작 전이면 0, 모두 끝나면 sections.length */
  currentSectionIndex: number;
  sections: ProgressMeetingSection[];
  startedAt?: string;
  endedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  /** 발표 슬라이드(PDF) URL — 미팅 진행 중 화면 공유 대용 */
  slidesUrl?: string;
  slidesName?: string;
}

// ── 활동 산출물 ──
export interface ActivityMaterial {
  id: string;
  activityId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
}

// ── 이메일 발송 이력 ──
export interface EmailLog {
  id: string;
  type: "reminder" | "review_request" | "certificate" | "welcome";
  targetId: string;
  recipientCount: number;
  sentAt: string;
  sentBy: string;
}

// ── 문의 ──
export interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "pending" | "replied";
  reply?: string;
  repliedAt?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// 스터디 회고 (Sprint 1 — Study Enhancement)
// 회차(activityProgress) 단위로 회원이 작성하는 개인 회고.
// 모임 단위 회고는 기존 HostRetrospective (activityType="study") 를 그대로 사용.
// ─────────────────────────────────────────────────────────────

export interface StudySessionReflection {
  id: string;
  activityId: string;
  activityProgressId: string;
  /** 회차 표시용 비정규화 (목록 조회 부담 절감) */
  week?: number;
  userId: string;
  userName?: string;
  /** 좋았던 점 / 이번 회차에서 잘 작동한 것 */
  liked: string;
  /** 아쉬웠던 점 / 부족했던 점 */
  lacked: string;
  /** 다음 회차에 보완·시도할 것 */
  longedFor: string;
  /** 1~5 별점 (선택) */
  rating?: number;
  /** 핵심 takeaway 불릿 (선택) */
  takeaways?: string[];
  /** 다음 회차 본인이 시도할 액션 (선택) */
  nextActions?: string[];
  /** 본인만 볼 수 있는 비공개 메모. 기본 false(=리더/staff 열람 가능). */
  isPrivate?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────
// 스터디 과제 (Sprint 2 — Study Enhancement)
// 운영진/리더가 회차에 과제를 부여, 회원이 제출, 운영진 피드백.
// 학술대회 워크북(ConferenceWorkbookTask) 패턴을 스터디용으로 복제.
// ─────────────────────────────────────────────────────────────

export type StudyAssignmentType =
  | "checkbox"   // 단순 체크 (예: "교재 1장 읽기")
  | "text"       // 짧은 한 줄 답변
  | "long_text"  // 장문 (요약/회고)
  | "rating"     // 1~5 자기 평가
  | "file";      // 파일 제출 (PDF/PPT 등)

export const STUDY_ASSIGNMENT_TYPE_LABELS: Record<StudyAssignmentType, string> = {
  checkbox: "체크리스트",
  text: "단답형",
  long_text: "장문형",
  rating: "별점 자기평가",
  file: "파일 제출",
};

export interface StudyAssignment {
  id: string;
  activityId: string;
  /** 특정 회차에 묶인 과제. 없으면 활동 전체 공통 과제. */
  activityProgressId?: string;
  /** 회차 번호 비정규화 */
  week?: number;
  title: string;
  description?: string;
  type: StudyAssignmentType;
  required: boolean;
  /** 마감 일시 (ISO) — 회차 시작 시간으로 자동 채울 수 있음 */
  dueAt?: string;
  /** 표시 순서 */
  order: number;
  /** 운영자가 임시 비활성화 가능 */
  active: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export type StudyAssignmentSubmissionStatus = "pending" | "in_progress" | "completed";

export const STUDY_ASSIGNMENT_STATUS_LABELS: Record<StudyAssignmentSubmissionStatus, string> = {
  pending: "미제출",
  in_progress: "작성중",
  completed: "제출완료",
};

export const STUDY_ASSIGNMENT_STATUS_COLORS: Record<StudyAssignmentSubmissionStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
};

export interface StudyAssignmentSubmission {
  /** {userId}_{assignmentId} 권장 */
  id: string;
  userId: string;
  userName?: string;
  assignmentId: string;
  activityId: string;
  /** activityProgressId 비정규화 (과제가 회차에 묶인 경우) */
  activityProgressId?: string;
  status: StudyAssignmentSubmissionStatus;
  checked?: boolean;
  text?: string;
  rating?: number;
  /** type=file 일 때 — 단일 파일 업로드 */
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  /** 운영진 피드백 */
  feedback?: string;
  feedbackBy?: string;
  feedbackByName?: string;
  feedbackAt?: string;
  submittedAt?: string;
  updatedAt: string;
}
