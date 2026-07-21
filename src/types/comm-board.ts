// 소통 보드(Q&A) 타입 — 스터디 회차·세미나·수업 발표(class)·졸업생 멘토링(mentoring)·해커톤(hackathon) 공용
export type CommContextType = "study" | "project" | "external" | "seminar" | "class" | "mentoring" | "hackathon";
export type CommBoardStatus = "open" | "closed";
export type CommSortMode = "recent" | "popular";
export type CommLikeTarget = "question" | "answer";

export interface CommBoard {
  id: string;
  contextType: CommContextType;
  contextId: string;
  /** 회차 기반 활동의 특정 회차 progress id (세미나는 없음) */
  activityProgressId?: string;
  week?: number;
  title: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  /** 비로그인 질문/답변 허용 */
  allowGuest: boolean;
  /** 익명 옵션 노출 */
  allowAnonymous: boolean;
  /** 발표자 목록 (수업 발표 보드) — 질문을 발표자별로 그룹핑/태깅 (2026-06-11) */
  presenters?: string[];
  status: CommBoardStatus;
  defaultSort: CommSortMode;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommQuestion {
  id: string;
  boardId: string;
  contextId: string;
  authorId?: string;
  authorName?: string;
  guestName?: string;
  anonymous: boolean;
  body: string;
  /** 어느 발표자에 대한 질문인지 (board.presenters 중 하나, 없으면 공통) */
  presenter?: string;
  resolved: boolean;
  /** 채택된 답변 id (UI 에서 답변의 채택 여부를 이 값으로 판단) */
  resolvedAnswerId?: string;
  likeCount: number;
  answerCount: number;
  /** 운영진이 고정한 공지 여부 — true 이면 보드 상단에 핀 공지로 표시 */
  pinned?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommAnswer {
  id: string;
  questionId: string;
  boardId: string;
  authorId?: string;
  authorName?: string;
  guestName?: string;
  anonymous: boolean;
  body: string;
  likeCount: number;
  createdAt?: string;
}

export interface CommLike {
  id: string;
  userId: string;
  targetType: CommLikeTarget;
  targetId: string;
  createdAt?: string;
}

export const COMM_SORT_LABELS: Record<CommSortMode, string> = {
  recent: "최신순",
  popular: "인기순",
};
