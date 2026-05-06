// types-domain-split: Phase 2 분해 후 잔존 도메인(seminar 등)이 board 의 타입을 사용 → cross-import
import type { SpeakerType, SeminarSpeaker } from "./board";


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

// PostCategory / CATEGORY_LABELS / ACTIVE_POST_CATEGORIES 는 types/board.ts 로 이동

// ── 세미나 ──
export interface SeminarSession {
  id: string;
  seminarId: string;
  category?: string;
  title: string;
  speaker: string;
  speakerBio?: string;
  time: string;
  endTime?: string;
  duration: number;
  order: number;
}

export interface Seminar {
  id: string;
  title: string;
  description: string;
  /** 세미나 학기 — 연도(yyyy). Activity와 동일 패턴. */
  year?: number;
  /** 세미나 학기 — 전기(first) / 후기(second). Activity와 동일 패턴. */
  semester?: "first" | "second";
  date: string;
  time: string;
  location: string;
  /** @deprecated speakers[0] 대신 speakers 배열 사용. 하위호환을 위해 유지. */
  speaker: string;
  /** @deprecated speakers[0].bio */
  speakerBio?: string;
  /** @deprecated speakers[0].type */
  speakerType?: SpeakerType;
  /** @deprecated speakers[0].affiliation */
  speakerAffiliation?: string;
  /** @deprecated speakers[0].position */
  speakerPosition?: string;
  /** @deprecated speakers[0].photoUrl */
  speakerPhotoUrl?: string;
  /** 다중 연사 (신규). 비어있으면 위 단일 연사 필드를 사용 (마이그레이션 호환) */
  speakers?: SeminarSpeaker[];
  posterUrl?: string;
  maxAttendees?: number;
  attendeeIds: string[];
  sessions?: SeminarSession[];
  isOnline?: boolean;
  onlineUrl?: string;
  registrationUrl?: string;
  timeline?: TimelinePhase[];
  registrationFields?: RegistrationFieldConfig[];
  autoConvertRegistration?: boolean;
  reviewQuestions?: {
    attendee?: string[];
    speaker?: string[];
    staff?: string[];
  };
  speakerReviewToken?: string;
  cancelReason?: string;
  /** Track 7: 연사로 지정된 회원 id (호스트 대시보드 접근 권한) */
  hostUserIds?: string[];
  /** 세미나 종료(completed 전환) 시 체크인 참석자 대상 수료증 자동 발급 (기본 true). false 시 cron이 발급 단계 스킵. */
  autoIssueCertificates?: boolean;
  status: "draft" | "upcoming" | "ongoing" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Track 7 F6: 호스트 회고 (Retrospective) ──
export type HostActivityType = "seminar" | "study" | "project" | "external";

export interface HostRetrospective {
  id: string;
  activityType: HostActivityType;
  activityId: string;
  hostUserId: string;
  hostUserName?: string;
  /** 좋았던 점 (Markdown) */
  liked: string;
  /** 아쉬웠던 점 */
  lacked: string;
  /** 보완·발전시킬 사항 */
  longedFor: string;
  rating?: number;
  followUpTags?: string[];
  attachments?: string[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

export const HOST_RETROSPECTIVE_TAG_SUGGESTIONS = [
  "재초청",
  "커리큘럼개편",
  "장소변경",
  "예산증액",
  "홍보강화",
  "운영매뉴얼보강",
] as const;

// ── 신청 폼 필드 설정 ──
export interface RegistrationFieldConfig {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  required: boolean;
  enabled: boolean;
  placeholder?: string;
  options?: string[];
}

export const DEFAULT_REGISTRATION_FIELDS: RegistrationFieldConfig[] = [
  { key: "name", label: "이름", type: "text", required: true, enabled: true, placeholder: "홍길동" },
  { key: "email", label: "이메일", type: "email", required: true, enabled: true, placeholder: "email@example.com" },
  { key: "affiliation", label: "소속", type: "text", required: false, enabled: true, placeholder: "연세대학교 교육학과" },
  { key: "phone", label: "연락처", type: "tel", required: false, enabled: true, placeholder: "010-1234-5678" },
  { key: "memo", label: "메모", type: "textarea", required: false, enabled: true, placeholder: "질문이나 요청 사항이 있으면 적어주세요." },
];

// ── 세미나 운영 타임라인 ──
export interface TimelinePhase {
  id: string;
  label: string;
  dDay: number; // D-30 → -30, D+1 → 1
  done: boolean;
  doneAt?: string;
  memo?: string;
  assignee?: string;
  description?: string; // 항목 설명
}

// ── 세미나 출석 ──
export interface SeminarAttendee { [key: string]: unknown;
  id: string;
  seminarId: string;
  userId: string;
  userName: string;
  userGeneration: number;
  qrToken: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  checkedInBy: string | null;
  createdAt: string;
  // 구글폼 호환 확장 필드
  studentId?: string;
  email?: string;
  phone?: string;
  semester?: string;
  interests?: string;
  questions?: string;
  isGuest?: boolean;
}

export type CheckinResult =
  | { success: true; attendee: SeminarAttendee }
  | { success: false; alreadyCheckedIn: true; attendee: SeminarAttendee }
  | { success: false; alreadyCheckedIn?: false; message: string };

// ── 세미나 자체 신청 (비회원 포함) ──
export type RegistrationStatus = "pending" | "confirmed" | "cancelled";

export const REG_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "대기",
  confirmed: "확정",
  cancelled: "취소",
};

export interface SeminarRegistration {
  id: string;
  seminarId: string;
  name: string;
  email: string;
  affiliation?: string;
  phone?: string;
  memo?: string;
  userId?: string;
  createdAt: string;
  convertedAt?: string;
  status?: RegistrationStatus;
  // 구글폼 호환 확장 필드
  studentId?: string;
  semester?: string;
  interests?: string;
}

// ── 수료증 / 감사장 / 임명장 / 참석확인서 ──
export type CertificateType =
  | "completion"      // 수료증 (세미나 출석, 스터디·프로젝트 이수)
  | "appreciation"    // 감사장 (연사 등)
  | "appointment"     // 임명장 (운영진)
  | "participation";  // 참석확인서 (대외 학술대회 등)
export interface Certificate { [key: string]: unknown;
  id: string;
  certificateNo?: string; // "YY-NNN" 형식 (예: "26-001")
  /** 세미나 발급 (legacy 필드, optional 처리) */
  seminarId?: string;
  seminarTitle?: string;
  /** 학술활동(스터디/프로젝트/대외) 발급 — seminarId 와 상호배타 */
  activityId?: string;
  activityType?: ActivityType;
  activityTitle?: string;
  /** 활동 기간 (예: "2026.03 - 2026.06") */
  activityPeriod?: string;
  /** 활동 내 역할 (예: "팀장", "발표자") */
  activityRole?: string;
  /** 대외활동 주관기관 (예: "한국교육공학회") */
  organizerName?: string;
  recipientName: string;
  recipientEmail?: string;
  recipientStudentId?: string;
  recipientUserId?: string | null;
  recipientAffiliation?: string;
  type: CertificateType;
  issuedAt: string;
  issuedBy: string;
  appointmentPosition?: string;
  appointmentTerm?: string;
  // 이메일 발송 상태
  emailSent?: string;        // ISO ts (성공)
  emailFailedAt?: string;    // ISO ts (마지막 실패 시각)
  emailError?: string;       // 실패 원인 메시지
}

// ── 실험실(Labs) ──
export type LabKind = "internal" | "external";
export type LabStatus = "draft" | "testing" | "feedback" | "approved" | "archived";
export const LAB_EMOJIS = ["👍", "💡", "🐛", "❤️"] as const;
export type LabEmoji = (typeof LAB_EMOJIS)[number];

export interface Lab { [key: string]: unknown;
  id: string;
  kind: LabKind;
  title: string;
  description: string;
  status: LabStatus;
  featureFlag?: string;
  previewRoute?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
  ownerId: string;
  ownerName: string;
  allowedUserIds?: string[];
  reactionSummary?: Record<string, number>;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LabReaction {
  id: string;
  labId: string;
  userId: string;
  emoji: LabEmoji;
  createdAt: string;
}

export interface LabComment {
  id: string;
  labId: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

// ── 홍보 콘텐츠 저장 ──
export interface PromotionContent {
  id: string;
  seminarId: string;
  seminarTitle: string;
  format: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

// ── 세미나 상태 라벨 ──
export type SeminarStatus = Seminar["status"];

export const SEMINAR_STATUS_LABELS: Record<SeminarStatus, string> = {
  draft: "임시저장",
  upcoming: "예정",
  ongoing: "진행 중",
  completed: "완료",
  cancelled: "취소",
};

// ── 세미나 자료 ──
export interface SeminarMaterial {
  id: string;
  seminarId: string;
  title: string;
  fileName: string;
  fileUrl: string; // Base64 data URL
  fileSize: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
}

// ── 세미나 후기 ──
export interface SeminarReview {
  id: string;
  seminarId: string;
  type: "attendee" | "speaker" | "staff";
  content: string;
  rating?: number; // 1-5 별점 (선택)
  authorId: string;
  authorName: string;
  authorGeneration?: number;
  authorRole?: string; // 운영진 후기 자동 분류용 (staff, president, admin)
  visibility: "public" | "internal";
  status: "published" | "hidden";
  questionAnswers?: Record<string, string>;
  recommendedTopics?: string; // 연사 추천 세미나 주제
  recommendedSpeakers?: string; // 연사 추천 연사
  createdAt: string;
  updatedAt?: string;
}

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
  applicationForm?: FormField[];
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
  keynote: "bg-purple-100 text-purple-800 border-purple-200",
  symposium: "bg-blue-100 text-blue-800 border-blue-200",
  panel: "bg-indigo-100 text-indigo-800 border-indigo-200",
  paper: "bg-emerald-100 text-emerald-800 border-emerald-200",
  poster: "bg-amber-100 text-amber-800 border-amber-200",
  media: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  workshop: "bg-rose-100 text-rose-800 border-rose-200",
  networking: "bg-pink-100 text-pink-800 border-pink-200",
  ceremony: "bg-slate-200 text-slate-800 border-slate-300",
  break: "bg-gray-100 text-gray-600 border-gray-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
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
  reflection?: string;
  rating?: number;            // 1-5
  /** 본인만 보는 세션 노트 (필기/메모) */
  personalNotes?: string;
  selectedAt: string;
  attendedAt?: string;
  reflectedAt?: string;
}

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
