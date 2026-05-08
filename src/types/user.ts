// ── 역할 ──
export type UserRole = "sysadmin" | "admin" | "president" | "staff" | "advisor" | "alumni" | "member" | "guest";

export const ROLE_LABELS: Record<UserRole, string> = {
  sysadmin: "시스템 관리자",
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
  | "graduateInfo"
  | "courses"
  | "gradLife";

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
  courses: "수강 내역",
  gradLife: "대학원 생활 (전공대표·조교·학회 운영진)",
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

/** Sprint 54·55: 알림 수신 + 피드 노출 설정 (default: 모두 true 로 처리) */
export interface NotificationPrefs {
  /** 매주 월요일 09:00 KST 다이제스트 메일 — false 로 명시될 때만 옵트아웃 (Sprint 54) */
  weeklyDigest?: boolean;
  /** 동료의 활동 피드(대시보드)에 내 활동 노출 여부 — false 로 명시될 때만 옵트아웃 (Sprint 55) */
  feedOptIn?: boolean;
  /** 전공 네트워킹 Map 그래프에 내 노드 노출 여부 — false 로 명시될 때만 옵트아웃 (Sprint 67 / major-network-map Phase 2) */
  networkOptIn?: boolean;
}

/**
 * 학교급 — major-network-map Phase 2.
 * 학교 교사 등 학교 단위가 의미 있는 직업에서 활용.
 * 4단계: 유아교육 / 초등학교 / 중학교 / 고등학교
 */
export type SchoolLevel =
  | "kindergarten"  // 유아교육
  | "elementary"    // 초등학교
  | "middle"        // 중학교
  | "high";         // 고등학교

export const SCHOOL_LEVEL_LABELS: Record<SchoolLevel, string> = {
  kindergarten: "유아교육",
  elementary: "초등학교",
  middle: "중학교",
  high: "고등학교",
};

export interface User { [key: string]: unknown;
  id: string;
  username: string;
  email?: string;
  name: string;
  role: Exclude<UserRole, "guest">;
  generation: number;
  /** Sprint 54: 알림 수신 설정 */
  notificationPrefs?: NotificationPrefs;
  /** 학적 기준 누적 학기 (가입 시점 기준, generation/기수와는 별개) */
  accumulatedSemesters?: number;
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
  /**
   * 소속 (학교 교사: 학교명 / 기업: 회사명 / 연구자: 기관명 등).
   * 학교 교사의 교육청은 별도 `affiliationOffice` 필드로 분리.
   */
  affiliation?: string;
  /**
   * 학교 교사의 소속 교육청 (예: "서울특별시교육청").
   * 학교 교사 외 직업유형에서는 사용하지 않음.
   */
  affiliationOffice?: string;
  department?: string;
  position?: string;
  /**
   * 학교급 — major-network-map Phase 2.
   * 교사·연구자 등 학교 단위가 의미 있는 직업 유형에서 활용.
   * 미입력 시 학교급 기반 매칭에서 제외.
   */
  schoolLevel?: SchoolLevel;
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
  /** 졸업생 학위논문 읽기 리스트 (alumniThesis id 배열) */
  thesisReadingList?: string[];
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
  // ── 학부 정보 (학술 활동 기획·운영 참고용) ──
  /** 학부 — 대학교명 */
  undergraduateUniversity?: string;
  /** 학부 — 단과대 */
  undergraduateCollege?: string;
  /** 학부 — 전공1 */
  undergraduateMajor1?: string;
  /** 학부 — 전공1 교육학 계열 여부 */
  undergraduateMajor1IsEducation?: boolean;
  /** 학부 — 전공2 (복수전공/부전공) */
  undergraduateMajor2?: string;
  /** 학부 — 전공2 교육학 계열 여부 */
  undergraduateMajor2IsEducation?: boolean;
  /** 마지막 로그인 시각 (ISO) */
  lastLoginAt?: string;
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

/** Sprint 63: 회원 페이지 접속 이력 (관리자 전용) */
export interface UserActivityLog {
  id: string;
  userId: string;
  /** denorm: 빠른 표시용 */
  userName?: string;
  /** 전체 경로 */
  path: string;
  /** 첫 세그먼트 그룹 (visit-tracker 와 동일 규칙) */
  pathGroup: string;
  /** 한국어 라벨 */
  pathLabel: string;
  /** ISO datetime */
  createdAt: string;
}
