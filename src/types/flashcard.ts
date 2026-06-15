// ── 암기카드 (Flashcard) — 진단 오답 복습 ──
//
// 진단평가 오답을 1탭으로 암기카드로 저장하고, /flashcards 에서 뒤집기 + 맞음/틀림
// 채점 + SM-2 간소화 간격반복으로 반복 학습하는 "진단 → 오답 암기 → 재진단" 루프.
//
// 신규 컬렉션 1개(flashcards). 복습 메타까지 동일 문서에 포함(MVP 단순화).
// 멱등 저장: deterministic doc id + get-선확인 (복습 진척 리셋 방지).
//  - diagnostic_wrong : `${userId}__dx__${sourceQuestionId}`
//  - concept          : `${userId}__concept__${conceptId}`
// firestore.rules 의 flashcards 블록(본인 rw + staff read)과 양쪽 게이트.

import type { CognitiveLevel, DiagnosticArea } from "./diagnostic";

export type FlashcardSource = "diagnostic_wrong" | "concept";

export interface Flashcard {
  /** deterministic doc id — 같은 문항/개념 재저장 시 upsert(merge) 로 중복 차단. */
  id: string;
  userId: string;
  source: FlashcardSource;

  // ── 카드 내용 (denormalized — 원본 문항/개념이 바뀌어도 카드 학습은 독립) ──
  /** 앞면: 질문 또는 개념명 */
  front: string;
  /** 뒷면: 정답 + 해설 (개념 카드는 개념 정의) */
  back: string;
  /** 부가 맥락(선택, 앞면 하단 보조 — 예: passage 지문) */
  frontHint?: string;

  // ── 출처 메타 (역링크·재진단 연결용) ──
  /** DiagnosticQuestion.id (seed:* 또는 firestore id) */
  sourceQuestionId?: string;
  /** archive_concepts 문서 id → /archive/concept/[id] 링크 */
  conceptId?: string;
  area?: DiagnosticArea;
  cognitiveLevel?: CognitiveLevel;

  // ── 복습 메타 (SM-2 간소화 / Leitner 변형) ──
  /** 다음 복습 예정일 YYYY-MM-DD (KST) — 대기열 정렬·"오늘 복습" 필터 키 */
  dueAt: string;
  /** 연속 정답 횟수(=상자 단계). 0 시작. 틀리면 0 리셋. */
  streak: number;
  /** 현재 복습 간격(일). 다음 dueAt = today + intervalDays */
  intervalDays: number;
  /** 누적 복습 횟수 */
  reviewCount: number;
  /** 누적 정답 횟수 */
  correctCount: number;
  /** 마지막 복습 ISO (null=미학습) */
  lastReviewedAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

/**
 * 진단 오답 → 암기카드 소재. 채점 루프(diagnosis/page.tsx::handleComplete)에서 수집해
 * DiagnosisReport 로 전달한다. flashcardsApi.saveFromWrong 의 입력.
 */
export interface WrongCardSeed {
  /** DiagnosticQuestion.id */
  questionId: string;
  /** 앞면 본문 (mcq=question, term=prompt, ox=statement) */
  front: string;
  /** 뒷면: 정답 + 해설 */
  back: string;
  /** 부가 맥락(선택 — passage 지문 등) */
  frontHint?: string;
  area: DiagnosticArea;
  cognitiveLevel?: CognitiveLevel;
  /** 약점 개념 id (resolveConcept().id 가 있으면) */
  conceptId?: string;
  conceptName?: string;
}
