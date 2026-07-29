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

// ── 저장한 추천 주제 방향 (2026-07-30 사용자 요청) ──
// 주제 탐색 인터뷰의 추천 프레임을 저장·핵심 지정하는 소량 데이터.
// 프로필 필드(users.savedTopicDirections)로 보존 — 신규 컬렉션·rules 불필요.
export interface SavedTopicDirection {
  /** 안정 id — 저장 시점 생성 */
  id: string;
  /** 주제 문장 (frame.sentence) */
  label: string;
  /** 연구 접근(양적/질적/혼합/개발·설계) — 배지 표시용 */
  approach?: string;
  /** 사용자 메모 (선택) */
  note?: string;
  /** 저장 시각 (ISO) */
  createdAt: string;
  /** 핵심 주제 여부 — 전체 목록에서 단 하나만 true */
  isCore?: boolean;
}
