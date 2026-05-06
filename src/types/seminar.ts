// ── 세미나 도메인 (types-domain-split Phase 4) ──
// 일부 타입은 board(SeminarSpeaker)/academic(ActivityType) 의존 → cross-import.
// ActivityType 은 아직 index.ts 잔존 → 분리 후 import 경로 갱신 필요.
import type { SpeakerType, SeminarSpeaker } from "./board";
import type { ActivityType } from "./academic";

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
