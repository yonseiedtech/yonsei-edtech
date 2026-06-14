// ── 교육공학 아카이브 — 논문 읽기 기록 (사이클 120, 연구 습관) ──
// "이 논문을 읽었다" 는 능동 행동 기록. 읽기 타이머 종료 또는 즉시 기록 2경로로 적재.
// 잔디(LearningStreak) · 주간 목표 · streak 의 집계 소스가 된다.
// firestore.rules 의 paper_reading_logs 와 양쪽 게이트(본인 rw, staff read).

export type PaperReadingSource = "alumni_thesis" | "review_board" | "external";

export const PAPER_READING_SOURCE_LABELS: Record<PaperReadingSource, string> = {
  alumni_thesis: "졸업생 학위논문",
  review_board: "논문 리뷰 게시판",
  external: "외부 논문",
};

export interface PaperReadingLog {
  id: string;
  userId: string;
  /** 읽기 소스 — 내부 자산 연결 또는 외부 자유 입력 */
  source: PaperReadingSource;
  /** AlumniThesis id 또는 게시글 id (external 은 비움) */
  refId?: string;
  title: string;
  authors?: string;
  year?: number;
  venue?: string;
  /** reading=읽는 중(타이머 가동), done=완료 기록 */
  status: "reading" | "done";
  /** 읽은(완료) 날짜 YYYY-MM-DD (KST) — 잔디·주간 집계 키 */
  readAt: string;
  /** 타이머 경과 시간(분). 즉시 기록은 비움 */
  durationMin?: number;
  /** 별점 1~5 */
  rating?: number;
  /** 빠른 한 줄 소감 */
  oneLine?: string;
  /** 정독 기록 — 핵심 주장 */
  keyClaim?: string;
  /** 정독 기록 — 연구 방법 */
  method?: string;
  /** 정독 기록 — 내 연구 시사점 (→ 추후 논문 작성 메모로 연결) */
  implication?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

/** 주간 읽기 목표 기본값 (편) */
export const DEFAULT_WEEKLY_READING_GOAL = 3;
