// ── 학술 포트폴리오 시스템 (Track 2) — types-domain-split Phase 6 ──

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
