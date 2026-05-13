// ── 학술활동 / 컨퍼런스 / 투표·설문 / 포토갤러리 (types-domain-split Phase 5) ──

// ── 학술활동 ──
export type ActivityType = "project" | "study" | "external";

/** 대외학술대회 참석 유형 */
export type ExternalParticipantType = "speaker" | "volunteer" | "attendee";
export const EXTERNAL_PARTICIPANT_TYPE_LABELS: Record<ExternalParticipantType, string> = {
  speaker: "발표자",
  volunteer: "자원봉사자",
  attendee: "참석",
};
export const EXTERNAL_PARTICIPANT_TYPE_COLORS: Record<ExternalParticipantType, string> = {
  speaker: "bg-purple-100 text-purple-800 border border-purple-200",
  volunteer: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  attendee: "bg-slate-100 text-slate-700 border border-slate-200",
};

/** 발표자 신청 시 발표 유형 (학술대회 발표 트랙 분류) */
export type SpeakerSubmissionType = "paper" | "poster" | "media";
export const SPEAKER_SUBMISSION_TYPE_LABELS: Record<SpeakerSubmissionType, string> = {
  paper: "논문",
  poster: "포스터",
  media: "미디어전",
};
export const SPEAKER_SUBMISSION_TYPE_COLORS: Record<SpeakerSubmissionType, string> = {
  paper: "bg-violet-50 text-violet-700",
  poster: "bg-amber-50 text-amber-700",
  media: "bg-rose-50 text-rose-700",
};

export type FormFieldType =
  | "short_text" | "long_text" | "radio" | "checkbox" | "select"
  | "date" | "time" | "datetime" | "email" | "phone" | "url" | "number"
  | "linear_scale" | "file" | "image" | "section_break"
  | "schedule"; // PR8: 시간표 드래그 선택 (학술대회 신청 등)

/** PR8: 가능한 시간대 슬롯 */
export interface ScheduleSlot {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24시간) */
  start: string;
  /** HH:MM (24시간) */
  end: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  description?: string;
  required?: boolean;
  options?: string[]; // radio/checkbox/select
  placeholder?: string;
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  // PR8: schedule 전용 설정
  /** 행사 시작 날짜 YYYY-MM-DD */
  scheduleStartDate?: string;
  /** 행사 종료 날짜 YYYY-MM-DD (단일 날짜면 start와 동일) */
  scheduleEndDate?: string;
  /** 하루 중 시작 시간 HH:MM */
  scheduleStartTime?: string;
  /** 하루 중 종료 시간 HH:MM */
  scheduleEndTime?: string;
  /** 슬롯 단위 분 (기본 30) */
  scheduleSlotMinutes?: number;
}

export type RecruitmentStatus = "recruiting" | "closed" | "in_progress" | "completed";

export interface Activity { [key: string]: unknown;
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  detailContent?: string;
  date: string;
  endDate?: string;
  status: "upcoming" | "ongoing" | "completed";
  recruitmentStatus?: RecruitmentStatus;
  maxParticipants?: number;
  leader?: string;
  /** PR7: 모임장(스터디) 회원 ID — leader 문자열과 별도로 보관 (자동완성 선택값) */
  leaderId?: string;
  members?: string[];
  participants?: string[];
  applicants?: { userId?: string; guestKey?: string; isGuest?: boolean; email?: string; phone?: string; name: string; studentId?: string; answers?: Record<string, string | string[] | { url: string; name: string; size: number; type: string }[]>; appliedAt: string; status: "pending" | "approved" | "rejected"; participantType?: ExternalParticipantType; speakerSubmissionType?: SpeakerSubmissionType; speakerPaperTitle?: string }[];
  applicationQuestions?: string[];
  /**
   * 공통 신청폼 — 모든 참석유형에 표시. (Sprint 70 이전부터 존재)
   * 대외활동에서 참석유형별 폼을 사용하면 공통 폼은 모든 신청자에게 먼저 표시되고
   * 이후 선택한 유형의 applicationFormByType 폼이 이어 표시된다.
   */
  applicationForm?: FormField[];
  /**
   * Sprint 70: 참석유형별 신청폼 (대외활동 전용).
   * 신청자가 참석유형(발표자/자원봉사자/참석자)을 선택하면 해당 유형의 폼이 공통 폼 다음에 표시됨.
   * 키가 없는 유형은 공통 폼만 사용.
   */
  applicationFormByType?: Partial<Record<ExternalParticipantType, FormField[]>>;
  registrationMethod?: "open" | "manual";
  participantRoles?: Record<string, string>;
  /** 운영자가 참여자별로 남기는 메모 (key: userId/guestKey/applicantKey) */
  participantNotes?: Record<string, string>;
  /**
   * 비회원(시스템에 가입되지 않은 인물) 참여자 목록.
   * 운영자가 회원 검색으로 못 찾는 인물을 이름만으로 추가할 때 사용.
   * id는 `guest_${ts}_${rand}` 형태로 발급되며 participants 배열에도 함께 포함된다.
   */
  guestParticipants?: { id: string; name: string; addedAt: string; addedBy: string }[];
  location?: string;
  tags?: string[];
  imageUrl?: string;
  // 대외활동 전용
  organizerName?: string;
  conferenceUrl?: string;
  /**
   * 신청 시 선택 가능한 참석 유형 목록 (대외활동 전용).
   * 미설정/빈 배열 시 전체 유형(speaker/volunteer/attendee) 선택 가능.
   * 운영자가 일부만 선택해 두면 신청자가 해당 유형만 선택할 수 있다.
   */
  enabledParticipantTypes?: ExternalParticipantType[];
  /** 활동 학기 — 연도(yyyy) */
  year?: number;
  /** 활동 학기 — 전기(first) / 후기(second) */
  semester?: "first" | "second";
  /**
   * 종료 시 자동 수료증/참석확인서 발급 여부 (기본 true).
   * - study/project: completion(수료증)
   * - external: participation(참석확인서)
   * 운영자가 false 로 설정하면 자동 발급되지 않고 수동 발급 필요.
   */
  autoIssueCertificates?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── 대외학술대회 시간표 (v3) ──
/** 학술대회 세션 카테고리 */
export type ConferenceSessionCategory =
  | "keynote" | "symposium" | "panel" | "paper" | "poster" | "media"
  | "workshop" | "networking" | "ceremony" | "break" | "other";

export const CONFERENCE_SESSION_CATEGORY_LABELS: Record<ConferenceSessionCategory, string> = {
  keynote: "기조강연",
  symposium: "심포지엄",
  panel: "패널 토의",
  paper: "논문 발표",
  poster: "포스터",
  media: "미디어전",
  workshop: "워크숍",
  networking: "네트워킹",
  ceremony: "개·폐회식",
  break: "휴식·식사",
  other: "기타",
};

export const CONFERENCE_SESSION_CATEGORY_COLORS: Record<ConferenceSessionCategory, string> = {
  keynote: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800",
  symposium: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
  panel: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
  paper: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  poster: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  media: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800",
  workshop: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800",
  networking: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800",
  ceremony: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
  break: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  other: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

export interface ConferenceSession {
  id: string;
  startTime: string;          // HH:MM
  endTime: string;            // HH:MM
  track?: string;             // ex: "Track A", "Room 201"
  category: ConferenceSessionCategory;
  title: string;
  speakers?: string[];
  affiliation?: string;
  abstract?: string;
  location?: string;
  /** 사전 학습 자료 (PDF/슬라이드/논문 등) */
  materialUrls?: string[];
}

export interface ConferenceDay {
  date: string;               // YYYY-MM-DD
  dayLabel?: string;          // ex: "1일차"
  sessions: ConferenceSession[];
}

export interface ConferenceProgram {
  id: string;                 // doc id
  activityId: string;         // 부모 Activity (type=external)
  title: string;
  uploadedSourceUrl?: string;
  uploadedSourceType?: "image" | "pdf";
  uploadedSourceName?: string;
  /** 추가 안내 메모 (장소 약도, 식사 안내 등) */
  notes?: string;
  days: ConferenceDay[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** 회원이 학술대회 세션을 선택·참석·후기 기록 */
export type SessionPlanStatus = "planned" | "attended" | "skipped";

export interface UserSessionPlan {
  id: string;                 // {userId}_{programId}_{sessionId} 권장
  userId: string;
  userName?: string;
  programId: string;
  activityId: string;
  sessionId: string;
  /** 비정규화: 목록 조회 시 join 부담 줄이기 */
  sessionTitle?: string;
  sessionDate?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  sessionTrack?: string;
  status: SessionPlanStatus;
  reasonForSelection?: string;
  /** Sprint 67-D: 선택 이유 다중 선택 (예: ["연구주제 관련", "발표자 관심"]) */
  reasons?: string[];
  reflection?: string;
  rating?: number;            // 1-5
  /** 본인만 보는 세션 노트 (필기/메모) — 짧은 메모 (deprecated, 호환 유지) */
  personalNotes?: string;
  /** Sprint 67-D: 연구 분석 노트 (긴 분석문, 마크다운) */
  analysisNote?: string;
  /** Sprint 67-D: 핵심 인사이트 (bullet) */
  keyInsights?: string[];
  /** Sprint 67-D: 발표자/세션에 대한 질문 목록 */
  questions?: string[];
  /** Sprint 67-D: 참고 자료 링크/인용 */
  references?: string[];
  selectedAt: string;
  attendedAt?: string;
  reflectedAt?: string;
  /** Sprint 67-D: 노트 마지막 수정 시각 */
  notedAt?: string;
}

/** Sprint 67-D: 세션 선택 이유 — 사전 정의 옵션 (다중 선택) */
export const SESSION_SELECTION_REASONS = [
  "연구주제 관련",
  "발표자 관심",
  "방법론 학습",
  "협력 기회 모색",
  "지도교수 추천",
  "동료 추천",
  "트렌드 파악",
  "수업 자료",
  "학위논문 참고",
  "동향 모니터링",
  "기타",
] as const;
export type SessionSelectionReason = (typeof SESSION_SELECTION_REASONS)[number];

// ── 투표/설문 ──
export type PollType = "vote" | "survey";
export type PollStatus = "draft" | "active" | "closed";

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollQuestion {
  id: string;
  text: string;
  type: "single" | "multiple" | "text" | "rating";
  options?: PollOption[];
  required: boolean;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  type: PollType;
  status: PollStatus;
  questions: PollQuestion[];
  allowAnonymous: boolean;
  showResults: boolean; // 투표 후 결과 공개 여부
  endsAt?: string;
  createdBy: string;
  createdByName: string;
  voterIds: string[]; // 중복 투표 방지
  createdAt: string;
  updatedAt: string;
}

export interface PollResponse {
  id: string;
  pollId: string;
  userId?: string;
  userName?: string;
  answers: Record<string, string | string[] | number>; // questionId → answer
  createdAt: string;
}

// ── 포토갤러리 ──
export interface PhotoAlbum {
  id: string;
  title: string;
  description?: string;
  seminarId?: string;
  activityId?: string;
  coverUrl?: string;
  photoCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  albumId: string;
  url: string; // base64 data URL or external URL
  caption?: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
}
