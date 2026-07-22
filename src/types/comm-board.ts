// 소통 보드(Q&A) 타입 — 스터디 회차·세미나·수업 발표(class)·졸업생 멘토링(mentoring)·해커톤(hackathon)·수요조사(demand) 공용
export type CommContextType = "study" | "project" | "external" | "seminar" | "class" | "mentoring" | "hackathon" | "demand";
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
  /** 비회원 신청 시 이메일 — 가입 후 자동 연결(linkGuestHackathonApps)에 사용 */
  guestEmail?: string;
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
  /** 해커톤 참가 신청 시 팀 빌딩 사전 설문 (선택 입력) */
  hackathonSurvey?: {
    /** AI 리터러시 자기평가 1(낮음)~5(높음) */
    aiLiteracy?: 1 | 2 | 3 | 4 | 5;
    /** 바이브코딩 경험 */
    vibeCoding?: "none" | "tried" | "often";
    /** 주로 쓰는 AI 도구 목록 (ChatGPT·Claude·Cursor·기타 자유 입력) */
    tools?: string[];
    /** 강점 영역 (기획·연구 / 디자인 / 개발 / 발표) */
    strengths?: string[];
  };
  /**
   * proposal 모드 행사(연구 계획 발표회 등) 참가 신청 데이터.
   * body 에는 proposal.title 을 저장하여 기존 검색·목록 호환을 유지한다.
   */
  proposal?: {
    /** 연구 제목 (≤100자, 필수) */
    title: string;
    /** 연구 주제·배경 요약 (≤300자) */
    topic: string;
    /** 연구 설계·방법 개요 (≤500자) */
    design: string;
  };
  /**
   * 수요 조사 보드 선호 설정 (demand contextType 전용).
   * presenter 슬롯에 "스터디 희망" | "세미나 희망" 유형을 저장하고,
   * 추가 선호 정보는 이 필드에 담는다.
   */
  demandPref?: {
    format?: "온라인" | "오프라인" | "무관";
    /** 희망 주기·수준 등 메모 (≤100자) */
    note?: string;
  };
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
