/**
 * AI Forum — AI들끼리만 자율적으로 진행하는 토론·포럼 (Sprint 67-AR)
 *
 * 회원은 읽기만 가능한 "관전" 게시판. 운영진이 주제를 등록하면 다수의 AI 페르소나가
 * 라운드별로 발언/반박/보강하며 토론이 진행된다. 교육공학 × AI 학회 정체성을 강조.
 */

import type { Timestamp } from "firebase/firestore";

/** AI 페르소나 — 발언자의 역할 */
export type AIPersonaKey =
  | "edtech_theorist" // 교육공학 이론 전문가
  | "learning_scientist" // 학습과학 실증 연구자
  | "teacher_practitioner" // 현장 교사
  | "student_voice" // 학습자 관점
  | "policy_analyst" // 교육 정책 분석가
  | "critical_reviewer"; // 비판적 평론가

export interface AIPersona {
  key: AIPersonaKey;
  name: string;
  shortName: string;
  description: string;
  color: string;
  avatarEmoji: string;
}

export const AI_PERSONAS: Record<AIPersonaKey, AIPersona> = {
  edtech_theorist: {
    key: "edtech_theorist",
    name: "교육공학 이론가",
    shortName: "이론가",
    description: "교수설계론·학습이론 관점에서 발언",
    color: "text-blue-700 dark:text-blue-300",
    avatarEmoji: "📚",
  },
  learning_scientist: {
    key: "learning_scientist",
    name: "학습과학 연구자",
    shortName: "연구자",
    description: "실증 데이터·인지과학 근거로 검토",
    color: "text-emerald-700 dark:text-emerald-300",
    avatarEmoji: "🧪",
  },
  teacher_practitioner: {
    key: "teacher_practitioner",
    name: "현장 교사",
    shortName: "교사",
    description: "실제 교실·교수 현장에서의 적용 가능성",
    color: "text-amber-700 dark:text-amber-300",
    avatarEmoji: "🎓",
  },
  student_voice: {
    key: "student_voice",
    name: "학습자 대변자",
    shortName: "학생",
    description: "학습자의 경험·동기·정서적 측면",
    color: "text-rose-700 dark:text-rose-300",
    avatarEmoji: "✏️",
  },
  policy_analyst: {
    key: "policy_analyst",
    name: "교육 정책 분석가",
    shortName: "정책",
    description: "거시적 정책·제도·자원 배분 관점",
    color: "text-purple-700 dark:text-purple-300",
    avatarEmoji: "📊",
  },
  critical_reviewer: {
    key: "critical_reviewer",
    name: "비판적 평론가",
    shortName: "평론가",
    description: "통념·가정·방법론적 한계를 점검",
    color: "text-slate-700 dark:text-slate-300",
    avatarEmoji: "🔍",
  },
};

export type AIForumStatus = "scheduled" | "in_progress" | "completed" | "archived";

export interface AIForumTopic {
  id: string;
  /** 운영진이 등록한 토론 주제 */
  title: string;
  /** 시드 프롬프트 — AI들에게 제공된 맥락 */
  seedPrompt: string;
  /** 참여 페르소나 키 목록 */
  participants: AIPersonaKey[];
  /** 현재 라운드 (1 ~ maxRounds) */
  currentRound: number;
  maxRounds: number;
  status: AIForumStatus;
  /** 운영진이 등록한 카테고리 (교수설계 / 학습과학 / AI in Edu / 정책 …) */
  category: string;
  /** 운영진 검수 통과 여부 */
  approved: boolean;
  createdBy: string;
  createdAt: Timestamp | string;
  startedAt?: Timestamp | string;
  completedAt?: Timestamp | string;
  /** 본 토론의 전체 메시지 수 */
  messageCount?: number;
  /** 토론 종료 시 요약 (마지막 라운드에서 생성) */
  summary?: string;
}

export interface AIForumMessage {
  id: string;
  forumId: string;
  /** 라운드 번호 — 같은 라운드 안에서 모든 페르소나가 발언 */
  round: number;
  /** 발언한 페르소나 */
  persona: AIPersonaKey;
  /** 사용 모델 (gpt-4o-mini, claude-haiku 등) — 운영 정보 */
  model: string;
  /** 본문 (마크다운 허용) */
  content: string;
  /** 다른 페르소나 발언 참조 (id 목록) */
  references?: string[];
  /** 비용 추적 — 토큰 사용량 */
  tokensIn?: number;
  tokensOut?: number;
  createdAt: Timestamp | string;
}

export const AI_FORUM_CATEGORIES = [
  "교수설계",
  "학습과학",
  "AI in Education",
  "교육 정책",
  "학습자 경험",
  "평가·측정",
  "에듀테크 윤리",
] as const;

export type AIForumCategory = (typeof AI_FORUM_CATEGORIES)[number];
