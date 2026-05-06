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
}

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

// ── 세미나 발표자 ──
export type SpeakerType = "member" | "guest";

export const SPEAKER_TYPE_LABELS: Record<SpeakerType, string> = {
  member: "내부 회원",
  guest: "외부 연사",
};

/**
 * 세미나 연사 (다중 연사 지원).
 * - type=member 이고 userId 가 있으면 회원 계정과 직접 연결.
 * - type=member 이지만 userId 가 없으면 학번(studentId) 기준으로 추후 가입 시 자동 연동
 *   (수료증과 동일한 늦은-매칭 방식).
 * - type=guest 는 외부 연사 — 회원 매칭하지 않음.
 */
export interface SeminarSpeaker {
  /** 회원/외부 구분 */
  type: SpeakerType;
  /** 회원 계정 ID (회원 검색 결과로 매칭된 경우만) */
  userId?: string;
  /** 회원 학번 — 가입 시 자동 연동의 키 */
  studentId?: string;
  /** 표시 이름 */
  name: string;
  /** 약력 */
  bio?: string;
  /** 소속 (예: 연세대학교 교육학과) */
  affiliation?: string;
  /** 직위·직책 (예: 교수, 박사과정) */
  position?: string;
  /** 사진 URL */
  photoUrl?: string;
}

// ── 게시판 ──
// board-community-v2: "press"는 "promotion"으로 통합, "resources" 자료실 신규. 마이그레이션 기간 동안 "press" 읽기 호환 유지.
// Sprint 41d: "paper_review" 교육공학 논문 리뷰 게시판 추가 — 내 논문 읽기와 양방향 연동
export const POST_CATEGORIES = ["notice", "seminar", "free", "promotion", "resources", "staff", "interview", "paper_review"] as const;

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

/**
 * Sprint 41d — 게시물에 첨부된 논문 메타데이터.
 * paper_review 카테고리 글에서 작성자가 본인의 ResearchPaper를 가져오거나, 직접 입력해 첨부할 수 있음.
 * 다른 사용자가 이 메타를 자신의 ResearchPaper(논문 읽기)에 임포트할 수 있도록 표준 필드 보존.
 */
export interface PostLinkedPaper {
  paperType: PaperType;
  thesisLevel?: ThesisLevel;
  title: string;
  authors?: string;
  year?: number;
  venue?: string;
  doi?: string;
  url?: string;
  /** 작성자가 가져올 때 원본 ResearchPaper id */
  sourceResearchPaperId?: string;
  /** 졸업생 학위논문 DB 에서 가져왔을 경우 원본 thesis id */
  sourceAlumniThesisId?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  category: "notice" | "seminar" | "free" | "promotion" | "resources" | "staff" | "press" | "interview" | "paper_review"; // "press"는 legacy
  imageUrls?: string[];
  attachments?: PostAttachment[];
  poll?: PostPoll;
  /** 특수 글타입. 지정되면 content 대신 전용 플레이어가 사용됨 */
  type?: "interview";
  interview?: InterviewMeta;
  /** Sprint 41d — paper_review 글에 연결된 논문 메타데이터 */
  linkedPaper?: PostLinkedPaper;
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

  /** 졸업생 학위논문 DB 에서 임포트한 경우 — 원본 thesis id 추적 (선택) */
  sourceAlumniThesisId?: string;

  /** 초록 (AlumniThesis 임포트 또는 사용자 직접 입력) */
  abstract?: string;

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

// ── 연구 활동 타이머 세션 ──

export type StudySessionType = "reading" | "writing";

export interface StudySession {
  id: string;
  userId: string;
  type: StudySessionType;
  paperId?: string;
  writingPaperId?: string;
  targetTitle: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  source: "timer" | "manual";
  focusScore?: number;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 연구 보고서 ──

export interface ResearchGroup {
  id: string;
  name: string;
  paperIds: string[];
  integration: string;
  insight: string;
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

export type EducationFormat = "" | "offline" | "online" | "blended";
export type EvidenceType = "" | "observation" | "assessment" | "survey" | "prior_research" | "other";
export type CauseType = "" | "learner" | "instructional_design" | "environment" | "other";

/**
 * Sprint 58/60: 연구 접근 패러다임
 *  - analytical : 분석·처방형 (ADDIE / 체제적 ID)
 *  - generative : 생성·구성형 (구성주의 · DBR · PAR)
 *  - action_research : 액션리서치 (Sprint 60: 자기 실천 사이클)
 *  - mixed_methods   : 혼합방법론 (Sprint 60: 양적+질적 통합)
 *  - free       : 1.5 챕터 skip
 */
export type ResearchApproach =
  | ""
  | "analytical"
  | "generative"
  | "action_research"
  | "mixed_methods"
  | "free";

export const RESEARCH_APPROACH_LABELS: Record<Exclude<ResearchApproach, "">, string> = {
  analytical: "분석·처방형",
  generative: "생성·구성형",
  action_research: "액션리서치",
  mixed_methods: "혼합방법론",
  free: "자유 진행",
};

export const RESEARCH_APPROACH_HINTS: Record<Exclude<ResearchApproach, "">, string> = {
  analytical:
    "ADDIE / 체제적 교수설계 / 행동주의·인지주의 ID. ‘현상 → 원인 진단 → 이론적 처방’ 흐름. (1.5 진단 5슬라이드)",
  generative:
    "구성주의 학습설계 / DBR / 참여실행연구. ‘맥락 이해 → 함께 만들기 → 반복 진화’ 흐름. (1.5 탐구 3슬라이드)",
  action_research:
    "현장 교사·연구자가 자기 실천을 스스로 개선하는 Plan-Act-Observe-Reflect 사이클. (1.5 액션 3슬라이드)",
  mixed_methods:
    "양적 + 질적 데이터를 통합/대조해 한 연구 문제에 답하는 디자인. 수렴/설명/탐색/내포형. (1.5 혼합 4슬라이드)",
  free:
    "패러다임 분기를 건너뛰고 1 → 2 → 3 으로 곧장 진행. (1.5 슬라이드 모두 skip)",
};

/** Sprint 57: 인터뷰 모드 라벨 (진단 단계 5슬라이드 신설용) */
export const EVIDENCE_TYPE_LABELS: Record<Exclude<EvidenceType, "">, string> = {
  observation: "수업 관찰",
  assessment: "평가/시험 결과",
  survey: "설문/인터뷰",
  prior_research: "선행연구",
  other: "기타",
};

export const CAUSE_TYPE_LABELS: Record<Exclude<CauseType, "">, string> = {
  learner: "학습자 요인",
  instructional_design: "수업·매체 설계",
  environment: "환경·자원",
  other: "기타",
};

export interface ProblemEvidenceItem {
  id: string;
  type: EvidenceType;
  content: string;
}

export interface ProblemCauseItem {
  id: string;
  type: CauseType;
  content: string;
}

export interface ProblemMeasurementItem {
  id: string;
  factor: string;
  indicator: string;
}

// ── v2: 2. 교육공학 이론 — 구조화 입력 ──
export interface TheoryConcept {
  id: string;
  /** 핵심 개념 이름 (예: "최근접발달영역(ZPD)") */
  name: string;
  /** 정의 / 의미 (1~2문장) */
  definition: string;
}

/** 이론 카드: 사용자가 선택한 이론 1개에 대한 상세 입력. */
export interface TheoryCard {
  id: string;
  /** 이론 이름 (예: "Vygotsky 사회문화이론") */
  name: string;
  /** 주요 학자 (선택) */
  scholar?: string;
  /** 발표 연도 (선택) */
  year?: string;
  /** 이 이론을 선택한 이유 (3~5줄) */
  selectionReason?: string;
  /** 핵심 개념 — 반복 입력 (3~5개 권장) */
  concepts?: TheoryConcept[];
  /** 이 이론이 1번 문제와 어떻게 연결되는지 */
  problemLink?: string;
}

export interface ResearchReport {
  id: string;
  userId: string;
  fieldDescription: string;
  fieldProblem: string;
  problemPhenomenon: string;
  problemEvidence: string;
  problemCause: string;
  problemDefinition: string;
  theoryType: string;
  theoryDefinition: string;
  theoryConnection: string;
  priorResearchAnalysis: string;
  priorResearchPaperIds: string[];
  priorResearchGroups: ResearchGroup[];
  // ── v2: 1. 교육현장의 문제 정의 — 구조화 입력 (모두 옵셔널: 구버전 데이터 호환) ──
  /** 1-1. 대상 학습자 (예: 중학교 2학년) */
  fieldAudience?: string;
  /** 1-1. 교육 형태 */
  fieldFormat?: EducationFormat;
  /** 1-1. 교과 또는 학습 주제 */
  fieldSubject?: string;
  /** 1-2. 현상 — 반복 입력 (구버전 problemPhenomenon이 있으면 첫 항목으로 마이그레이션) */
  problemPhenomena?: string[];
  /** 1-2. 근거 — 유형 + 내용 */
  problemEvidences?: ProblemEvidenceItem[];
  /** 1-2. 원인 — 유형 + 내용 */
  problemCauses?: ProblemCauseItem[];
  /** 1-3. 이 문제의 영향 */
  problemImpact?: string;
  /** 1-3. 왜 해결이 필요한가 */
  problemImportance?: string;
  /** 1-4. 주요 대상 */
  scopeAudience?: string;
  /** 1-4. 초점이 되는 상황/맥락 */
  scopeContext?: string;
  /** 1-4. 제외하거나 한정할 범위 */
  scopeExclusion?: string;
  /** 1-5. 측정 가능성 — 문제 요소 + 관찰 가능한 지표 */
  problemMeasurements?: ProblemMeasurementItem[];
  // ── v3: 1.5 문제 진단/탐구 — Sprint 57+58 (이론 챕터 진입 전 단계, 패러다임 분기) ──
  /** Sprint 58: 연구 접근 패러다임 — 인터뷰 1.5 챕터 슬라이드 분기에 사용 */
  researchApproach?: ResearchApproach;
  /** 1.5-3 (분석형). 이미 시도해본 해결책과 그 결과 */
  diagnosisAttempts?: string;
  /** 1.5-4 (분석형). 현재 상태 vs 도달하려는 상태의 격차 (Performance Gap) */
  diagnosisGap?: string;
  /** 1.5-5 (분석형). 본 연구가 집중할 핵심 원인 — 이론 선택의 근거가 됨 */
  diagnosisPrimaryCause?: string;
  // ── v4: 학습자와 학습 목표 — Sprint 66 (Sprint 67·68 에서 챕터 분리) ──
  /** 3-1. 학습자 프로필 (학년·인원·배경) */
  learnerProfile?: string;
  /** 3-2. 학습자 인지·지식 수준 (사전지식·습관) */
  learnerCognitive?: string;
  /** 3-3. 학습자 정서·동기 상태 (관심·자신감·불안) */
  learnerAffective?: string;
  /** 4-2. 배워야 할 지식·이해 (Bloom 인지) */
  outcomeCognitive?: string;
  /** 4-3. 배워야 할 기능·태도 (Krathwohl 정의적 + Simpson 심동적) */
  outcomeSkillAttitude?: string;
  // ── v5: Sprint 68 — 환경 분석 + 학습 과제·목표 분리·보강 (정통 ID 흐름) ──
  /** 2-1. Learning Context — 학습 환경 (시설·매체·시간·자원) */
  envLearning?: string;
  /** 2-2. Transfer Context — 적용 환경 (학습 후 어디서 발휘) */
  envTransfer?: string;
  /** 2-3. Orienting Context — 제약·정책·문화 맥락 */
  envConstraint?: string;
  /** 4-1. Task Analysis — 학습 과제 위계 분해 (Gagné/Jonassen) — legacy 단일 textarea */
  taskDecompose?: string;
  /** Sprint 75 F5: Task Analysis 단계 분리 입력 — 우선시. 비어있으면 taskDecompose 줄단위로 자동 변환 */
  taskSteps?: string[];
  /** 4-4. Mager ABCD — Audience·Behavior·Condition·Degree 형식 학습 목표 (legacy 단일 필드) */
  outcomeMagerABCD?: string;
  /** Sprint 72 F4: Mager ABCD 분리 입력 — 4 영역별 독립 필드 */
  outcomeMagerA?: string;
  outcomeMagerB?: string;
  outcomeMagerC?: string;
  outcomeMagerD?: string;
  /** 4-2. Sprint 68: 처치를 통해 변화시키려는 학습 영역 (Bloom 3대 영역) — 처치 적합성·차시 수 가이드 트리거 */
  outcomePriorityDomain?: "" | "cognitive" | "affective" | "psychomotor" | "integrated";
  // ── v3 트랙 필드 (Sprint 66 에서 인터뷰 미노출, schema 만 보존 — 추후 고급 모드에서 활용 가능) ──
  /** 1.5-i1 (생성형). 학습자·교사가 현상에 부여하는 의미 */
  inquiryMeaning?: string;
  /** 1.5-i2 (생성형). 설계 맥락·도구·상호작용 */
  inquiryContext?: string;
  /** 1.5-i3 (생성형). 반복 설계 사이클 — 어떻게 함께 진화시킬지 */
  inquiryCycle?: string;
  /** 1.5-a1 (액션리서치). 본인의 현장 위치·역할 */
  actionRole?: string;
  /** 1.5-a2 (액션리서치). Plan-Act-Observe-Reflect 사이클 설계 */
  actionCycle?: string;
  /** 1.5-a3 (액션리서치). 함께 성찰할 동료/공동연구자 */
  actionCommunity?: string;
  /** 1.5-a4 (액션리서치, Sprint 62). 시작 기준선 — 변화 측정 대상 */
  actionBaseline?: string;
  /** 1.5-a5 (액션리서치, Sprint 62). 사이클 동안 수집할 데이터 (저널/현장노트/인터뷰 등) */
  actionDataCollection?: string;
  /** 1.5-a6 (액션리서치, Sprint 62). 자기 정당화 방어 (member check / peer debrief / triangulation) */
  actionValidity?: string;
  /** 1.5-m1 (혼합방법론). 채택한 혼합 디자인 (convergent/explanatory/exploratory/embedded) */
  mixedDesign?: string;
  /** 1.5-m2 (혼합방법론). 양적 데이터 — 무엇을 어떻게 */
  mixedQuant?: string;
  /** 1.5-m3 (혼합방법론). 질적 데이터 — 무엇을 어떻게 */
  mixedQual?: string;
  /** 1.5-m4 (혼합방법론). 두 데이터의 통합 / 대조 방식 */
  mixedIntegration?: string;
  /** 1.5-m5 (혼합방법론, Sprint 62). 양·질 우선순위 (양주도/질주도/동등) */
  mixedPriority?: string;
  /** 1.5-m6 (혼합방법론, Sprint 62). 표집 전략 (연결된/대조된/내포된) */
  mixedSampling?: string;
  /** 1.5-m7 (혼합방법론, Sprint 62). 메타-추론 타당성 — 두 데이터 통합 신뢰성 확보 */
  mixedValidity?: string;
  // ── v2: 2. 교육공학 이론 — 구조화 입력 (옵셔널, 구버전 호환) ──
  /** 2. 적용 이론 카드 — 1~다수 */
  theoryCards?: TheoryCard[];
  /** 2-2. 이론들이 1번 문제와 어떻게 연결되는지 (이론 간 종합) */
  theoryRelationProblem?: string;
  /** 2-2. 각 이론의 역할 분담 (이론 A는 ~를, 이론 B는 ~를 설명) */
  theoryRelationRoles?: string;
  /** 2-2. 통합적 관점 — 이론들이 함께 만들어내는 의미 */
  theoryRelationIntegration?: string;
  lastSavedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 연구 계획서 ──
export interface ResearchProposal {
  id: string;
  userId: string;
  /** 논문 제목 (국문) */
  titleKo: string;
  /** 논문 제목 (영문) */
  titleEn: string;
  /** 연구 목적 */
  purpose: string;
  /** 연구 범위 */
  scope: string;
  /** 연구 방법 */
  method: string;
  /** 연구 내용 */
  content: string;
  /** 참고문헌 (ResearchPaper.id 참조, APA7 형식은 렌더링 시 생성) */
  referencePaperIds: string[];
  lastSavedAt?: string;
  createdAt: string;
  updatedAt: string;
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
  paper_review: "교육공학 논문 리뷰",
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
  "paper_review",
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
