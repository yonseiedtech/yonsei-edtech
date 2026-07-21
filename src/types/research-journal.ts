// ────────────────────────────────────────────────────────────
// types/research-journal.ts
//
// 연구지(Research Journal) — collaborative-research Phase 3.
// 학회보(card_news_series)와 완전히 분리된 학술 출판 트랙.
// 두 트랙: 워킹 페이퍼(자율 publish) + 정식 연구지(호수 발간·검수).
//
// 설계 문서: docs/01-plan/features/collaborative-research.plan.md 5.1.H/I
// ────────────────────────────────────────────────────────────

import type { CreditRole } from "./collaborative-research";

// ── 출판 형식·상태·가시성 ─────────────────────────────────

/** 출판 트랙: 정식 학술논문 / 워킹 페이퍼 / 리서치 노트 */
export type PublicationType = "journal" | "working_paper" | "note";

/** 본문 구조: IMRaD(정식) / 자유 형식(워킹·노트) */
export type ArticleContentStructure = "imrad" | "free";

export type ArticleReviewStatus =
  | "draft"               // 작성 중
  | "submitted"           // 검수 제출 (저자 100% 동의 완료 후)
  | "under_review"        // 운영진 검수 중
  | "revision_requested"  // 수정 요청 (저자 → submitted 로 다시)
  | "accepted"            // 승인 (편집장이 호수 배정 전)
  | "published"           // 발간 완료
  | "withdrawn";          // 철회

/** 가시성 3단계 (Phase 1 결정) */
export type ArticleVisibility = "private" | "society" | "public";

/** 호수 상태 */
export type JournalIssueStatus = "preparing" | "published" | "archived";

/** 호수 계절 */
export type JournalIssueSeason = "spring" | "summer" | "fall" | "winter";

/** 검수 코멘트 심각도 */
export type ReviewCommentSeverity = "blocking" | "major" | "minor" | "praise";

/** 인용 종류 */
export type CitationType = "journal" | "book" | "chapter" | "thesis" | "web" | "other";

// ── 서브 타입 ─────────────────────────────────────────────

/** 발간 시점 동결되는 저자 스냅샷 (졸업·이직 후에도 발간 당시 정보 유지) */
export interface ArticleAuthorSnapshot {
  /** 시스템 참조 (collaborative_research_members.userId) */
  userId: string;
  /** 발간 당시 표시 이름 */
  displayName: string;
  /** 발간 당시 소속 (예: "연세대학교 교육대학원 교육공학전공 석사과정") */
  affiliation: string;
  email?: string;
  /** ORCID iD */
  orcidId?: string;
  /** 저자 순서 (1=first, 2=second...) */
  authorOrder: number;
  /** 교신저자 여부 */
  isCorresponding: boolean;
  /** 제1저자 여부 (공동 제1저자 가능) */
  isFirstAuthor: boolean;
  /** CRediT 14역할 */
  creditRoles: CreditRole[];
}

/** APA7 자동 렌더 가능한 인용 구조 */
export interface ArticleCitation {
  id: string;
  type: CitationType;
  /** APA7 raw author 문자열 (예: "Mayer, R. E.") */
  authors: string;
  year: number;
  title: string;
  /** venue / publisher (학술지명·출판사·학교) */
  source?: string;
  doi?: string;
  url?: string;
  /** 사이트 내 자료 연계 */
  alumniThesisId?: string;
  researchPaperId?: string;
}

/** 검수자 코멘트 — Phase 1 은 issue/article level 만 (블록 anchor 는 Phase 4) */
export interface ReviewComment {
  id: string;
  reviewerId: string;
  body: string; // markdown
  severity: ReviewCommentSeverity;
  /** 본문 anchor (선택) */
  anchor?: string;
  resolvedAt?: string;
  createdAt: string;
}

// ── 호수 ─────────────────────────────────────────────────

export interface ResearchJournalIssue {
  id: string;
  /** 권 (예: 3) */
  volume: number;
  /** 호 (예: 1) */
  number: number;
  /** 발간 년도 */
  year: number;
  season?: JournalIssueSeason;
  /** 표지 제목 (예: "연세 교육공학 연구 Vol.3 No.1") — 미입력 시 자동 생성 */
  title?: string;
  /** ISO datetime */
  publishedAt?: string;
  /** 편집위원 (운영진 user.id 배열) */
  editorIds: string[];
  coverImageUrl?: string;
  /** 편집장의 글 (markdown) */
  introMarkdown?: string;
  /** 발간 논문 ID 순서 배열 */
  articleIds: string[];
  status: JournalIssueStatus;
  createdAt: string;
  updatedAt: string;
}

// ── 논문 (워킹 + 정식 통합) ────────────────────────────────

export interface ResearchJournalArticle {
  id: string;
  /** 출처 collaborative_research id */
  researchId: string;
  publicationType: PublicationType;

  // ─── 정식 연구지 메타 (publicationType==='journal' 일 때 사용) ───
  /** research_journal_issues 참조 (accepted 후 편집장이 배정) */
  issueId?: string;
  pageStart?: number;
  pageEnd?: number;
  /** 수동 입력 DOI (10.xxxxx/yyyy 형식). Phase 4에서 DataCite API 자동화. */
  doi?: string;

  // ─── 공통 메타 ───
  titleKo: string;
  titleEn?: string;
  abstractKo: string;
  abstractEn?: string;
  keywordsKo: string[];
  keywordsEn?: string[];

  // ─── 저자 (스냅샷) ───
  authors: ArticleAuthorSnapshot[];

  // ─── 본문 ───
  /** markdown (IMRaD 또는 자유 구조) */
  content: string;
  contentStructure: ArticleContentStructure;

  /** APA7 자동 렌더 가능한 인용 목록 */
  citations: ArticleCitation[];

  // ─── 첨부 ───
  pdfUrl?: string;
  /** 외부 데이터 저장소 링크 (OSF·Zenodo·GitHub 등) */
  dataLinks?: string[];
  appendixUrls?: string[];

  // ─── 출판 상태 ───
  reviewStatus: ArticleReviewStatus;
  reviewComments?: ReviewComment[];
  /** 운영진 검수자 user.id 배열 */
  reviewerIds: string[];
  visibility: ArticleVisibility;
  publishedAt?: string;
  /** 철회 시 사유·일시 */
  withdrawnAt?: string;
  withdrawnReason?: string;

  // ─── 저자 동의 게이트 (정식 트랙 필수) ───
  /** 동의 요청 발송 시각. 발송 전이면 undefined. */
  consentRequestedAt?: string;
  /** 각 author.userId 별 동의 상태 */
  authorConsents?: Record<string, AuthorConsent>;

  // ─── 인용·열람 카운트 (denorm, increment 적용) ───
  viewCount: number;
  downloadCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface AuthorConsent {
  userId: string;
  status: "pending" | "agreed" | "rejected";
  agreedAt?: string;
  /** 거부 사유 */
  rejectionNote?: string;
}

// ── 입력용 DTO ────────────────────────────────────────────

export type UpdateArticleMetaInput = Partial<
  Pick<
    ResearchJournalArticle,
    | "titleKo"
    | "titleEn"
    | "abstractKo"
    | "abstractEn"
    | "keywordsKo"
    | "keywordsEn"
    | "content"
    | "contentStructure"
    | "citations"
    | "dataLinks"
    | "appendixUrls"
    | "visibility"
    | "pdfUrl"
  >
>;

export type CreateJournalIssueInput = Omit<
  ResearchJournalIssue,
  "id" | "createdAt" | "updatedAt" | "publishedAt"
>;

export type UpdateJournalIssueInput = Partial<
  Pick<
    ResearchJournalIssue,
    | "title"
    | "season"
    | "coverImageUrl"
    | "introMarkdown"
    | "articleIds"
    | "editorIds"
    | "status"
  >
>;
