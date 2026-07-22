import { CAT_CHIP_100, CAT_PLAIN_50, CAT_CHIP_100_BARE } from "@/lib/design-tokens";

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
  speaker:   CAT_CHIP_100.purple,
  volunteer: CAT_CHIP_100.emerald,
  attendee:  CAT_CHIP_100.slate,
};

/** 발표자 신청 시 발표 유형 (학술대회 발표 트랙 분류) */
export type SpeakerSubmissionType = "paper" | "poster" | "media";
export const SPEAKER_SUBMISSION_TYPE_LABELS: Record<SpeakerSubmissionType, string> = {
  paper: "논문",
  poster: "포스터",
  media: "미디어전",
};
export const SPEAKER_SUBMISSION_TYPE_COLORS: Record<SpeakerSubmissionType, string> = {
  paper:  CAT_PLAIN_50.violet,
  poster: CAT_PLAIN_50.amber,
  media:  CAT_PLAIN_50.rose,
};

export type FormFieldType =
  | "short_text" | "long_text" | "radio" | "checkbox" | "select"
  | "date" | "time" | "datetime" | "email" | "phone" | "url" | "number"
  | "linear_scale" | "file" | "image" | "section_break"
  | "schedule" // PR8: 시간표 드래그 선택 (학술대회 신청 등)
  | "datetime_slots"; // 신청자가 가능한 날짜+시간 범위를 목록으로 직접 추가

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

/**
 * 활동 신청자 항목 — 개인정보(PII)를 포함하므로 data-split 리팩토링 후
 * activities 문서가 아닌 비공개 컬렉션 `activity_applicants/{activityId}` 에 저장된다.
 */
export interface ApplicantEntry {
  userId?: string;
  guestKey?: string;
  isGuest?: boolean;
  email?: string;
  phone?: string;
  name: string;
  studentId?: string;
  answers?: Record<string, string | string[] | { url: string; name: string; size: number; type: string }[]>;
  appliedAt: string;
  status: "pending" | "approved" | "rejected";
  participantType?: ExternalParticipantType;
  speakerSubmissionType?: SpeakerSubmissionType;
  speakerPaperTitle?: string;
}

/**
 * activities 문서에 저장되는 비-PII 공개 발표자 투영.
 * 학번·이메일·전화·답변·상태 등 민감정보는 절대 포함하지 않는다.
 */
export interface PublicSpeaker {
  name: string;
  submissionType?: SpeakerSubmissionType;
  paperTitle?: string;
}

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
  /**
   * 모집 시작 일시 (ISO 8601, 로컬 KST 기준 datetime-local 값 그대로 저장).
   * 설정 시 현재 시각이 이 시각 이후일 때만 "recruiting" 으로 계산된다.
   * 미설정 시 시작일(date) 이전까지 모집 가능으로 간주.
   * recruitmentStatusOverride === true 면 무시되고 recruitmentStatus 가 수동 우선한다.
   */
  recruitmentStartAt?: string;
  /**
   * 모집 종료 일시 (ISO 8601, 로컬 KST 기준 datetime-local 값 그대로 저장).
   * 설정 시 현재 시각이 이 시각을 넘으면 "closed" 로 자동 전환된다.
   * recruitmentStatusOverride === true 면 무시된다.
   */
  recruitmentEndAt?: string;
  /**
   * true 면 운영자가 recruitmentStatus 를 수동으로 고정한 상태.
   * false/undefined 면 recruitmentStartAt/recruitmentEndAt 기반으로 자동 계산된다.
   * cron 자동 전환 + UI 자동 계산은 이 플래그를 존중한다.
   */
  recruitmentStatusOverride?: boolean;
  maxParticipants?: number;
  leader?: string;
  /** PR7: 모임장(스터디) 회원 ID — leader 문자열과 별도로 보관 (자동완성 선택값) */
  leaderId?: string;
  members?: string[];
  participants?: string[];
  /**
   * @deprecated data-split 리팩토링 후 신청자 PII 는 비공개 컬렉션
   * `activity_applicants/{activityId}` 로 분리되었다. activities 문서에는 더 이상 쓰지 않으며
   * 마이그레이션 후 제거된다. 하위호환(dual-read fallback)을 위해 타입만 유지.
   */
  applicants?: ApplicantEntry[];
  /**
   * 비-PII 공개 발표자 투영 — 발표자(participantType==="speaker") 의 이름·발표유형·제목만.
   * 누구나(비회원 포함) 안전하게 조회 가능. activity_applicants 갱신 시 자동 재계산된다.
   */
  publicSpeakers?: PublicSpeaker[];
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
  /** 한줄소개 — 스터디 목적·특징 한 문장 요약 (스터디 전용) */
  tagline?: string;
  /** 모임 일정 문구 — 예: "매주 목요일 19:00~21:00" (스터디 전용) */
  scheduleLabel?: string;
  /** 참여요건 — 신청 전 확인해야 할 조건 (자유 텍스트) */
  requirements?: string;
  /** 운영방식 — 스터디 진행 방법 설명 (자유 텍스트) */
  operation?: string;
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
  keynote:    CAT_CHIP_100_BARE.purple,
  symposium:  CAT_CHIP_100_BARE.blue,
  panel:      CAT_CHIP_100_BARE.indigo,
  paper:      CAT_CHIP_100_BARE.emerald,
  poster:     CAT_CHIP_100_BARE.amber,
  media:      CAT_CHIP_100_BARE.fuchsia,
  workshop:   CAT_CHIP_100_BARE.rose,
  networking: CAT_CHIP_100_BARE.pink,
  ceremony:   CAT_CHIP_100_BARE.slate200,
  break:      CAT_CHIP_100_BARE.grayMuted,
  other:      CAT_CHIP_100_BARE.gray,
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
  /** 세미나 라이브 설문 연결 (라이브 콘솔) — 없으면 일반 설문/투표 */
  seminarId?: string;
  /** 발표자가 라이브로 띄운 시각 — set 되면 참가자 화면에 활성 노출 */
  livePushedAt?: string;
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
  /** 모임·행사 연결 (Phase 2-D) — /gatherings 카드에서 "행사 사진 보기" 역링크 */
  networkingEventId?: string;
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
