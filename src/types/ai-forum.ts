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
  /** 텍스트 컬러 (Tailwind) */
  color: string;
  /** 카드 좌측 strip (border-l-4) — 발언자 식별 시각 강화 */
  accentBorder: string;
  /** 아바타 배경 + subtle gradient 카드 */
  accentBg: string;
  /** 아바타 ring */
  accentRing: string;
  avatarEmoji: string;
}

export const AI_PERSONAS: Record<AIPersonaKey, AIPersona> = {
  edtech_theorist: {
    key: "edtech_theorist",
    name: "교육공학 이론가",
    shortName: "이론가",
    description: "교수설계론·학습이론 관점에서 발언",
    color: "text-blue-700 dark:text-blue-300",
    accentBorder: "border-l-blue-500 dark:border-l-blue-400",
    accentBg: "bg-blue-100 dark:bg-blue-950/50",
    accentRing: "ring-blue-200 dark:ring-blue-800",
    avatarEmoji: "📚",
  },
  learning_scientist: {
    key: "learning_scientist",
    name: "학습과학 연구자",
    shortName: "연구자",
    description: "실증 데이터·인지과학 근거로 검토",
    color: "text-emerald-700 dark:text-emerald-300",
    accentBorder: "border-l-emerald-500 dark:border-l-emerald-400",
    accentBg: "bg-emerald-100 dark:bg-emerald-950/50",
    accentRing: "ring-emerald-200 dark:ring-emerald-800",
    avatarEmoji: "🧪",
  },
  teacher_practitioner: {
    key: "teacher_practitioner",
    name: "현장 교사",
    shortName: "교사",
    description: "실제 교실·교수 현장에서의 적용 가능성",
    color: "text-amber-700 dark:text-amber-300",
    accentBorder: "border-l-amber-500 dark:border-l-amber-400",
    accentBg: "bg-amber-100 dark:bg-amber-950/50",
    accentRing: "ring-amber-200 dark:ring-amber-800",
    avatarEmoji: "🎓",
  },
  student_voice: {
    key: "student_voice",
    name: "학습자 대변자",
    shortName: "학생",
    description: "학습자의 경험·동기·정서적 측면",
    color: "text-rose-700 dark:text-rose-300",
    accentBorder: "border-l-rose-500 dark:border-l-rose-400",
    accentBg: "bg-rose-100 dark:bg-rose-950/50",
    accentRing: "ring-rose-200 dark:ring-rose-800",
    avatarEmoji: "✏️",
  },
  policy_analyst: {
    key: "policy_analyst",
    name: "교육 정책 분석가",
    shortName: "정책",
    description: "거시적 정책·제도·자원 배분 관점",
    color: "text-purple-700 dark:text-purple-300",
    accentBorder: "border-l-purple-500 dark:border-l-purple-400",
    accentBg: "bg-purple-100 dark:bg-purple-950/50",
    accentRing: "ring-purple-200 dark:ring-purple-800",
    avatarEmoji: "📊",
  },
  critical_reviewer: {
    key: "critical_reviewer",
    name: "비판적 평론가",
    shortName: "평론가",
    description: "통념·가정·방법론적 한계를 점검",
    color: "text-slate-700 dark:text-slate-300",
    accentBorder: "border-l-slate-500 dark:border-l-slate-400",
    accentBg: "bg-slate-200 dark:bg-slate-800/50",
    accentRing: "ring-slate-200 dark:ring-slate-700",
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

/**
 * APA 7 형식 학술 참고문헌 (Sprint 67-AR — Human-in-the-loop 검증)
 *
 * AI가 발언에 인용한 학술 자료의 구조화된 표현. 사용자가 1차 자료를 직접
 * 검증할 수 있도록 출처·DOI·URL을 명시. APA 7 표기를 자동 렌더링.
 */
export interface APACitation {
  /** 메시지 내 in-text 인용 키 (Yan-2024, Bjork-1994 등) */
  id: string;
  /** 저자 목록 — "Last, F. M." 형식 또는 한국어 풀네임 ("김철수") */
  authors: string[];
  /** 발행 연도 */
  year: number;
  /** 작품 제목 */
  title: string;
  /** 자료 종류 */
  type: "journal" | "book" | "chapter" | "conference" | "report" | "web";
  /** 학술지명 (type=journal) — 이탤릭으로 렌더링 */
  journal?: string;
  /** 권 (volume) */
  volume?: number;
  /** 호 (issue) */
  issue?: number;
  /** 페이지 범위 — "123-145" 또는 "123" */
  pages?: string;
  /** 출판사 (type=book/chapter/report) */
  publisher?: string;
  /** 학술대회명 (type=conference) */
  conference?: string;
  /** DOI — "10.1234/example" 형식. URL 없으면 https://doi.org/로 변환 */
  doi?: string;
  /** 웹 URL (DOI가 없는 경우만) */
  url?: string;
  /** 언어 — 한국어 자료는 "ko", 영문은 "en" */
  language: "ko" | "en";
  /** 검색일 (웹 자료에만 사용) */
  retrievedDate?: string;
  /**
   * 인용 검증 상태 (Sprint 67-AR — hallucination 안전장치)
   * - true: 운영진 또는 자동 검증으로 DOI/URL 실재 확인됨
   * - false 또는 undefined: AI 자동 생성, 1차 자료 미검증
   */
  verified?: boolean;
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
  /** APA 7 학술 인용 (Human-in-the-loop 검증용) */
  citations?: APACitation[];
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
