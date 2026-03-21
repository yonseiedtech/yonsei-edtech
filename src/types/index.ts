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

export type ContactVisibility = "public" | "members" | "staff" | "private";

export const VISIBILITY_LABELS: Record<ContactVisibility, string> = {
  public: "전체 공개",
  members: "회원만",
  staff: "운영진만",
  private: "비공개",
};

export interface User {
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
  /** 소속 정보 */
  occupation?: OccupationType;
  affiliation?: string;
  department?: string;
  position?: string;
  studentId?: string;
  contactEmail?: string;
  contactVisibility?: ContactVisibility;
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
export interface Post {
  id: string;
  title: string;
  content: string;
  category: "notice" | "seminar" | "free" | "promotion";
  authorId: string;
  authorName: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
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
  promotion: "홍보게시판",
};

// ── 세미나 ──
export interface SeminarSession {
  id: string;
  seminarId: string;
  title: string;
  speaker: string;
  speakerBio?: string;
  time: string;
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
  registrationUrl?: string;
  timeline?: TimelinePhase[];
  status: "upcoming" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── 세미나 운영 타임라인 ──
export interface TimelinePhase {
  id: string;
  label: string;
  dDay: number; // D-30 → -30, D+1 → 1
  done: boolean;
  doneAt?: string;
  memo?: string;
}

// ── 세미나 출석 ──
export interface SeminarAttendee {
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
}

export type CheckinResult =
  | { success: true; attendee: SeminarAttendee }
  | { success: false; alreadyCheckedIn: true; attendee: SeminarAttendee }
  | { success: false; alreadyCheckedIn?: false; message: string };

// ── 세미나 자체 신청 (비회원 포함) ──
export interface SeminarRegistration {
  id: string;
  seminarId: string;
  name: string;
  email: string;
  affiliation?: string;
  phone?: string;
  memo?: string;
  userId?: string; // 회원이면 uid 연결
  createdAt: string;
}

// ── 수료증 / 감사장 ──
export interface Certificate {
  id: string;
  seminarId: string;
  seminarTitle: string;
  recipientName: string;
  recipientAffiliation?: string;
  type: "completion" | "appreciation";
  issuedAt: string;
  issuedBy: string;
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
