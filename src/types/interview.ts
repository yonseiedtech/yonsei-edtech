// ── 온라인 인터뷰 (types-domain-split Phase 6) ──

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

/**
 * Sprint 67-AE: 인터뷰 대상자 필터.
 * 빈 객체이거나 모든 필드 비어있으면 — 모든 인증 회원이 응답 가능 (기본).
 * 여러 카테고리 동시 사용 시 OR 조건 (한 카테고리라도 매칭되면 응답 가능).
 */
export interface InterviewTargetCriteria {
  /** 특정 회원 userId 목록 */
  userIds?: string[];
  /** 입학연도 (YYYY) — 복수 선택 */
  entryYears?: number[];
  /** 누적 학기차 — 복수 선택 (1~7+) */
  semesterCounts?: number[];
  /** 계층/역할 — 복수 선택 */
  roles?: InterviewTargetRole[];
}

export type InterviewTargetRole =
  | "masters"
  | "doctoral"
  | "alumni"
  | "professor"
  | "staff"
  | "guest";

export const INTERVIEW_TARGET_ROLE_LABELS: Record<InterviewTargetRole, string> = {
  masters: "석사 과정",
  doctoral: "박사 과정",
  alumni: "졸업생",
  professor: "교수",
  staff: "운영진",
  guest: "외부 / 게스트",
};

export interface InterviewMeta {
  intro: string;
  deadline?: string;
  responseVisibility?: "public" | "staff_only";
  /** Sprint 67-AE: 인터뷰 대상자 필터 (없으면 모든 회원 응답 가능) */
  targetCriteria?: InterviewTargetCriteria;
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
