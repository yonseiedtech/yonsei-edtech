// ── 역할 ──
export type UserRole = "admin" | "president" | "staff" | "advisor" | "alumni" | "member" | "guest";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "관리자",
  president: "회장",
  staff: "운영진",
  advisor: "자문위원",
  alumni: "졸업생",
  member: "회원",
  guest: "게스트",
};

// ── 사용자 ──
export type OccupationType = "student" | "corporate" | "teacher" | "researcher" | "freelancer" | "other";

export const OCCUPATION_LABELS: Record<OccupationType, string> = {
  student: "재학생/대학원생",
  corporate: "기업 재직",
  teacher: "학교 교사",
  researcher: "연구소/기관",
  freelancer: "프리랜서",
  other: "기타",
};

export type EnrollmentStatus = "enrolled" | "on_leave" | "graduated";

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  enrolled: "재학",
  on_leave: "휴학",
  graduated: "졸업",
};

export type ContactVisibility = "public" | "members" | "staff" | "private";

export const VISIBILITY_LABELS: Record<ContactVisibility, string> = {
  public: "전체 공개",
  members: "회원만",
  staff: "운영진만",
  private: "비공개",
};

export interface User { [key: string]: unknown;
  id: string;
  username: string;
  email?: string;
  name: string;
  role: Exclude<UserRole, "guest">;
  generation: number;
  field: string;
  profileImage?: string;
  bio?: string;
  approved: boolean;
  rejected?: boolean;
  /** 소속 정보 */
  occupation?: OccupationType;
  affiliation?: string;
  department?: string;
  position?: string;
  studentId?: string;
  phone?: string;
  contactEmail?: string;
  contactVisibility?: ContactVisibility;
  enrollmentYear?: number;
  enrollmentHalf?: number; // 1=전반기, 2=후반기
  enrollmentStatus?: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
}

// ── 세미나 발표자 ──
export type SpeakerType = "member" | "guest";

export const SPEAKER_TYPE_LABELS: Record<SpeakerType, string> = {
  member: "내부 회원",
  guest: "외부 연사",
};

// ── 게시판 ──
// board-community-v2: "press"는 "promotion"으로 통합, "resources" 자료실 신규. 마이그레이션 기간 동안 "press" 읽기 호환 유지.
export const POST_CATEGORIES = ["notice", "seminar", "free", "promotion", "resources", "staff"] as const;

export interface PostPollOption {
  id: string;
  label: string;
  voteCount: number;
}

export interface PostPoll {
  question: string;
  options: PostPollOption[];
  multi: boolean;                      // 복수선택 허용
  anonymous: boolean;                  // 익명 투표 (UID 저장 안함, 해시로 중복 방지)
  deadline?: string;                   // ISO string
  totalVotes: number;
  hideResultsBeforeDeadline: boolean;
  hideResultsAfterDeadline: boolean;   // true이면 비공개 투표
  editableUntil?: string;              // 이 시점까지 수정 가능, 없으면 수정 불가
}

export interface PostAttachment {
  name: string;
  url: string;
  size: number;
  mimeType: string;
  downloadCount?: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  category: "notice" | "seminar" | "free" | "promotion" | "resources" | "staff" | "press"; // "press"는 legacy
  imageUrls?: string[];
  attachments?: PostAttachment[];
  poll?: PostPoll;
  authorId: string;
  authorName: string;
  viewCount: number;
  commentCount?: number;
  likeCount?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  /** 마이그레이션 백업 (구 category 값) */
  _legacyCategory?: "press";
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export type PostCategory = Post["category"];

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  notice: "공지사항",
  seminar: "세미나 자료",
  free: "자유게시판",
  promotion: "홍보·보도자료",
  resources: "자료실",
  staff: "운영진 게시판",
  press: "보도자료", // legacy, 마이그레이션 이후 제거 예정
};

/** 현재 활성 카테고리 (글쓰기·탭에 노출) - press 제외 */
export const ACTIVE_POST_CATEGORIES: Exclude<PostCategory, "press">[] = [
  "notice",
  "seminar",
  "free",
  "promotion",
  "resources",
  "staff",
];

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
  date: string;
  time: string;
  location: string;
  speaker: string;
  speakerBio?: string;
  speakerType?: SpeakerType;
  speakerAffiliation?: string;
  speakerPosition?: string;
  speakerPhotoUrl?: string;
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
  status: "draft" | "upcoming" | "ongoing" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

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

// ── 수료증 / 감사장 ──
export interface Certificate { [key: string]: unknown;
  id: string;
  certificateNo?: string; // "YY-NNN" 형식 (예: "26-001")
  seminarId: string;
  seminarTitle: string;
  recipientName: string;
  recipientAffiliation?: string;
  type: "completion" | "appreciation";
  issuedAt: string;
  issuedBy: string;
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

export type FormFieldType = "short_text" | "long_text" | "radio" | "checkbox" | "select" | "date" | "email" | "phone" | "file" | "image";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  description?: string;
  required?: boolean;
  options?: string[]; // radio/checkbox/select
  placeholder?: string;
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
  members?: string[];
  participants?: string[];
  applicants?: { userId?: string; guestKey?: string; isGuest?: boolean; email?: string; phone?: string; name: string; studentId?: string; answers?: Record<string, string | string[] | { url: string; name: string; size: number; type: string }[]>; appliedAt: string; status: "pending" | "approved" | "rejected" }[];
  applicationQuestions?: string[];
  applicationForm?: FormField[];
  location?: string;
  tags?: string[];
  imageUrl?: string;
  // 대외활동 전용
  organizerName?: string;
  conferenceUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
}

// ── 활동 진행 기록 ──
export interface ActivityProgress {
  id: string;
  activityId: string;
  week: number;
  date: string;
  title: string;
  description?: string;
  status: "planned" | "in_progress" | "completed";
  attachments?: string[];
  createdAt: string;
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
