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
export type OccupationType =
  | "corporate"
  | "teacher"
  | "researcher"
  | "public"        // 공무원/공공기관/공기업 (PR6 신규)
  | "freelancer"
  | "other";

export const OCCUPATION_LABELS: Record<OccupationType, string> = {
  corporate: "기업 재직",
  teacher: "학교 교사",
  researcher: "연구소/기관",
  public: "공무원/공공기관/공기업",
  freelancer: "프리랜서",
  other: "기타",
};

/** 직업유형 화면 단축 라벨 (연락망 테이블 등 좁은 영역용) */
export const OCCUPATION_SHORT_LABELS: Record<OccupationType, string> = {
  corporate: "기업",
  teacher: "학교교사",
  researcher: "연구소",
  public: "공무원/공공기관/공기업",
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

// ── 프로필 페이지 섹션별 공개 범위 (PR5) ──
export type SectionKey =
  | "email"
  | "phone"
  | "socials"
  | "bio"
  | "researchInterests"
  | "academicActivities"
  | "researchActivities"
  | "graduateInfo";

export type SectionVisibility = "members" | "staff" | "shared" | "private";

export const SECTION_VISIBILITY_LABELS: Record<SectionVisibility, string> = {
  members: "회원만 공개",
  staff: "운영진만 공개",
  shared: "공유자까지 공개",
  private: "비공개",
};

export const SECTION_LABELS: Record<SectionKey, string> = {
  email: "이메일",
  phone: "전화번호",
  socials: "SNS / 외부 링크",
  bio: "학회원 소개",
  researchInterests: "관심 연구 키워드",
  academicActivities: "학술활동",
  researchActivities: "연구활동",
  graduateInfo: "대학원 정보",
};

export type SocialPlatform =
  | "instagram"
  | "linkedin"
  | "github"
  | "x"
  | "threads"
  | "youtube"
  | "website"
  | "other";

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  github: "GitHub",
  x: "X (Twitter)",
  threads: "Threads",
  youtube: "YouTube",
  website: "웹사이트",
  other: "기타",
};

export interface SocialLink {
  platform: SocialPlatform;
  /** platform === "other" 일 때 사용. 그 외에는 옵션. */
  label?: string;
  url: string;
}

import type { UserConsents } from "@/lib/legal";

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
  /** 실험실 접근 허용 플래그 */
  labsAccess?: boolean;
  /** 약관/개인정보 동의 이력 */
  consents?: UserConsents;
  /** 레거시: 개인정보 수집 동의 시점 */
  privacyAgreedAt?: string;
  /** 소속 정보 */
  occupation?: OccupationType;
  affiliation?: string;
  department?: string;
  position?: string;
  /** PR6 신규: 직업유형별 세부 정보 */
  /** 기업 담당업무 */
  corporateDuty?: string;
  /** 연구소 직책 (position과 별개) */
  researcherTitle?: string;
  /** 연구소 담당업무 */
  researcherDuty?: string;
  /** 공무원·공공기관·공기업 직책 */
  publicTitle?: string;
  /** 공무원·공공기관·공기업 담당업무 */
  publicDuty?: string;
  /** 프리랜서 비고 */
  freelancerNotes?: string;
  studentId?: string;
  phone?: string;
  contactEmail?: string;
  contactVisibility?: ContactVisibility;
  enrollmentYear?: number;
  enrollmentHalf?: number; // 1=전반기, 2=후반기
  enrollmentStatus?: EnrollmentStatus;
  /** 휴학 정보 */
  leaveStartYear?: number;
  leaveStartHalf?: number;   // 1|2
  returnYear?: number;
  returnHalf?: number;       // 1|2
  /** 졸업 정보 */
  thesisTitle?: string;
  graduationYear?: number;
  graduationMonth?: 2 | 8;
  /** 보안 질문 (비밀번호 찾기용) */
  securityQuestion?: string;
  securityAnswerHash?: string;
  /** 생년월일 */
  birthDate?: string;
  /** 관심 연구분야 */
  researchInterests?: string[];
  /** 최근 논문 */
  recentPapers?: RecentPaper[];
  // ── PR5: 프로필 전용 페이지 ──
  /** SNS / 외부 링크 (프리셋 7개 + other) */
  socials?: SocialLink[];
  /** 섹션별 공개 범위 — 미지정 시 "members" (회원만) 기본 */
  sectionVisibility?: Partial<Record<SectionKey, SectionVisibility>>;
  /** 대학 (기본 "연세대학교") */
  university?: string;
  /** 대학원 (기본 "교육대학원") */
  graduateSchool?: string;
  /** 전공 (기본 "교육공학전공") */
  graduateMajor?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 프로필 좋아요 (PR5) ──
export interface ProfileLike {
  /** `${profileId}_${likerId}` — 1인 1회 보장 */
  id: string;
  profileId: string;
  likerId: string;
  /** 좋아요 누른 사람의 표시 이름 (모달용) */
  likerName?: string;
  createdAt: string;
}

// ── 프로필 페이지 뷰 (PR5, 통계용) ──
export type ProfileViewChannel = "qr" | "link" | "members" | "direct";

export interface ProfileView {
  id: string;
  profileId: string;
  /** 비로그인 시 undefined */
  viewerId?: string;
  channel: ProfileViewChannel;
  createdAt: string;
}

export interface RecentPaper {
  title: string;
  authors?: string;
  year?: number;
  url?: string;
}

// ── 세미나 발표자 ──
export type SpeakerType = "member" | "guest";

export const SPEAKER_TYPE_LABELS: Record<SpeakerType, string> = {
  member: "내부 회원",
  guest: "외부 연사",
};

// ── 게시판 ──
// board-community-v2: "press"는 "promotion"으로 통합, "resources" 자료실 신규. 마이그레이션 기간 동안 "press" 읽기 호환 유지.
export const POST_CATEGORIES = ["notice", "seminar", "free", "promotion", "resources", "staff", "interview"] as const;

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
  category: "notice" | "seminar" | "free" | "promotion" | "resources" | "staff" | "press" | "interview"; // "press"는 legacy
  imageUrls?: string[];
  attachments?: PostAttachment[];
  poll?: PostPoll;
  /** 특수 글타입. 지정되면 content 대신 전용 플레이어가 사용됨 */
  type?: "interview";
  interview?: InterviewMeta;
  authorId: string;
  authorName: string;
  viewCount: number;
  commentCount?: number;
  /** 인터뷰 카테고리 전용 — 제출(submitted)된 응답 수. interview-store가 increment/decrement로 관리. */
  responseCount?: number;
  likeCount?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  /** 마이그레이션 백업 (구 category 값) */
  _legacyCategory?: "press";
}

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

export interface WritingPaper {
  id: string;
  userId: string;
  title?: string;
  /** 5장 본문 */
  chapters?: Partial<Record<WritingPaperChapterKey, string>>;
  /** UI 표시용 마지막 자동 저장 시각 (ISO) */
  lastSavedAt?: string;
  createdAt: string;
  updatedAt: string;
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

export type InterviewReactionType = "like" | "cool";

export const INTERVIEW_REACTION_LABELS: Record<InterviewReactionType, string> = {
  like: "좋아요",
  cool: "멋져요",
};

export const INTERVIEW_REACTION_EMOJIS: Record<InterviewReactionType, string> = {
  like: "👍",
  cool: "✨",
};

export interface InterviewResponseReaction {
  id: string;
  responseId: string;
  postId: string;
  userId: string;
  type: InterviewReactionType;
  createdAt: string;
}

export interface InterviewResponseComment {
  id: string;
  responseId: string;
  postId: string;
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

export type PostCategory = Post["category"];

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  notice: "공지사항",
  seminar: "세미나 자료",
  free: "자유게시판",
  promotion: "홍보·보도자료",
  resources: "자료실",
  staff: "운영진 게시판",
  press: "보도자료", // legacy, 마이그레이션 이후 제거 예정
  interview: "인터뷰 게시판",
};

/** 현재 활성 카테고리 (글쓰기·탭에 노출) - press 제외 */
export const ACTIVE_POST_CATEGORIES: Exclude<PostCategory, "press">[] = [
  "notice",
  "seminar",
  "free",
  "promotion",
  "resources",
  "staff",
  "interview",
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
  recipientEmail?: string;
  recipientStudentId?: string;
  recipientUserId?: string | null;
  recipientAffiliation?: string;
  type: "completion" | "appreciation";
  issuedAt: string;
  issuedBy: string;
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

export type FormFieldType =
  | "short_text" | "long_text" | "radio" | "checkbox" | "select"
  | "date" | "time" | "datetime" | "email" | "phone" | "url" | "number"
  | "linear_scale" | "file" | "image" | "section_break";

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
  /** 활동 학기 — 연도(yyyy) */
  year?: number;
  /** 활동 학기 — 전기(first) / 후기(second) */
  semester?: "first" | "second";
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
