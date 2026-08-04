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
/**
 * 저장 시점의 주제 탐색 근거(seed). 문장·라벨만으로는 유실되던 대상·소재·키워드를 보존해
 * 심화 질의응답·연구보고서 자동 연동(topic-deepdive-report-sync)의 입력으로 재사용한다.
 * 모두 옵셔널 — 구버전(seed 없는) 저장분과 호환.
 */
export interface TopicSeed {
  /** 연구 대상 표현 (TEResult.target, 예: "중학생") */
  target?: string;
  /** 관심 소재 표현 (TEResult.topic, 예: "생성형 AI") */
  topic?: string;
  /** 연구대상 라벨 후보 (TEResult.subjectTerms) */
  subjectTerms?: string[];
  /** 관심분야 키워드 (TEResult.interestTerms) */
  interestTerms?: string[];
  /** 접근 라벨 (frame.approach: 양적/질적/혼합/개발·설계) */
  approach?: string;
}

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
  /** 저장 시점 탐색 근거 — 심화·보고서 연동 입력 (P0-1, 2026-08-05) */
  seed?: TopicSeed;
}
