// 도메인 분해 (Phase 3·6) 후 직접 경로 import — 더 이상 index 우회 불요.
import type { PaperType, ThesisLevel } from "./research-paper";
import type { InterviewMeta } from "./interview";

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
