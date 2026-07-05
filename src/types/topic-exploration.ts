// ── 주제 탐색 결과 저장 (2026-07-05 사용자 요청: 일시별 저장·비교) ──

export interface TopicExplorationFrame {
  sentence: string;
  approach: string;
  rationale: string;
}

/** 주제 탐색 인터뷰 1회의 결과 스냅샷 — 본인만 read/write (firestore.rules) */
export interface TopicExploration {
  id: string;
  userId: string;
  /** 추천 일시 (ISO) — 표시용 정본. createdAt(serverTimestamp)과 별개로 명시 저장 */
  exploredAt: string;
  /** 인터뷰 답변 (질문 id → 선택 value) */
  answers: Record<string, string>;
  /** 답변 요약 라벨 ("초등학교 · 생성형 AI…") */
  answersSummary: string;
  /** 추천 주제 문장 프레임 */
  frames: TopicExplorationFrame[];
  caution?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
