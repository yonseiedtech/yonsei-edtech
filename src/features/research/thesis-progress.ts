/**
 * 논문 진행률 엔진 (연구 코크핏, 2026-06-11) — 순수 함수
 *
 * 흩어진 연구 데이터(에디터 본문·계획서·지도 노트·집필 시간)를 하나의
 * 진척 모델로 합산한다. 컬렉션을 추가하지 않고 기존 데이터를 재해석한다.
 *
 *  - 장별 레벨: 0 미작성(<50자) / 1 시작(<800자) / 2 진행(<3000자) / 3 본궤도(≥3000자)
 *  - activityStage: 실제 활동 기반의 논문 여정 단계 신호(1~5).
 *    학기 기반 추정(getEffectiveSemesterCount)과 별개의 "보조 신호"이며 강제하지 않는다.
 */

import type {
  WritingPaper,
  WritingPaperChapterKey,
  FeedbackChapter,
} from "@/types";

export const THESIS_CHAPTER_KEYS: WritingPaperChapterKey[] = [
  "intro",
  "background",
  "method",
  "results",
  "conclusion",
];

export const THESIS_CHAPTER_SHORT_LABELS: Record<WritingPaperChapterKey, string> = {
  intro: "서론",
  background: "이론",
  method: "방법",
  results: "결과",
  conclusion: "결론",
};

/** 0=미작성, 1=시작, 2=진행, 3=본궤도 */
export type ChapterLevel = 0 | 1 | 2 | 3;

export interface ChapterProgress {
  key: WritingPaperChapterKey;
  chars: number;
  level: ChapterLevel;
}

export interface ThesisProgressInput {
  paper?: Pick<WritingPaper, "chapters" | "sections"> | null;
  /** 연구계획서(proposal) 작성 여부 */
  hasProposal: boolean;
  /** 장별 미반영(pending) 지도 노트 수 */
  pendingFeedbackByChapter?: Partial<Record<FeedbackChapter, number>>;
  /** 누적 집필(타이머) 분 */
  writingMinutes?: number;
}

export interface ThesisProgress {
  totalChars: number;
  chapters: ChapterProgress[];
  /** 0~100 — 장별 레벨 합(최대 15) 비율 */
  percent: number;
  pendingFeedbackTotal: number;
  writingMinutes: number;
  /** 활동 기반 여정 단계 신호 (1~5) */
  activityStage: 1 | 2 | 3 | 4 | 5;
}

/** 장 1개의 글자수 — 구조화(sections) 우선, 없으면 평문(chapters) */
export function chapterCharCount(
  paper: Pick<WritingPaper, "chapters" | "sections"> | null | undefined,
  key: WritingPaperChapterKey,
): number {
  if (!paper) return 0;
  const sections = paper.sections?.[key];
  if (sections && sections.length > 0) {
    return sections.reduce(
      (sum, sec) => sum + (sec.paragraphs ?? []).reduce((a, p) => a + (p.text ?? "").length, 0),
      0,
    );
  }
  return (paper.chapters?.[key] ?? "").length;
}

export function levelOf(chars: number): ChapterLevel {
  if (chars < 50) return 0;
  if (chars < 800) return 1;
  if (chars < 3000) return 2;
  return 3;
}

export function computeThesisProgress(input: ThesisProgressInput): ThesisProgress {
  const chapters: ChapterProgress[] = THESIS_CHAPTER_KEYS.map((key) => {
    const chars = chapterCharCount(input.paper, key);
    return { key, chars, level: levelOf(chars) };
  });
  const totalChars = chapters.reduce((s, c) => s + c.chars, 0);
  const levelSum = chapters.reduce((s, c) => s + c.level, 0);
  const percent = Math.round((levelSum / (THESIS_CHAPTER_KEYS.length * 3)) * 100);

  const pending = input.pendingFeedbackByChapter ?? {};
  const pendingFeedbackTotal = Object.values(pending).reduce(
    (s, n) => s + (typeof n === "number" ? n : 0),
    0,
  );

  const by = (k: WritingPaperChapterKey) => chapters.find((c) => c.key === k)!;

  // 활동 기반 단계 신호 — 보수적으로 산정 (높은 조건부터)
  let activityStage: 1 | 2 | 3 | 4 | 5 = 1;
  if (by("conclusion").level >= 2) activityStage = 5;
  else if (by("method").level >= 2 && by("results").level >= 1) activityStage = 4;
  else if (input.hasProposal || by("method").level >= 1) activityStage = 3;
  else if (by("background").level >= 1 || totalChars >= 300) activityStage = 2;

  return {
    totalChars,
    chapters,
    percent,
    pendingFeedbackTotal,
    writingMinutes: input.writingMinutes ?? 0,
    activityStage,
  };
}

/** 분 → "N시간 M분" / "M분" 표기 */
export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}분`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

// ── 장별 분량 균형 (2026-06-12, 사이클 30-D) ──
// 권장 비중은 양적 학위논문의 일반 관행 범위 — 절대 규칙이 아닌 참고선.

export type BalanceStatus = "low" | "ok" | "high";

export interface ChapterBalance {
  key: WritingPaperChapterKey;
  pct: number;
  status: BalanceStatus;
  recommended: [number, number];
}

const RECOMMENDED_SHARE: Record<WritingPaperChapterKey, [number, number]> = {
  intro: [8, 15],
  background: [25, 40],
  method: [15, 25],
  results: [15, 30],
  conclusion: [10, 20],
};

/** 분량 균형 진단이 의미를 갖는 최소 총 글자수 — 미만이면 표시하지 않는다 */
export const BALANCE_MIN_CHARS = 3000;

export function chapterBalance(
  chapters: { key: WritingPaperChapterKey; chars: number }[],
  totalChars: number,
): ChapterBalance[] {
  if (totalChars <= 0) return [];
  return chapters.map((c) => {
    const pct = Math.round((c.chars / totalChars) * 100);
    const [lo, hi] = RECOMMENDED_SHARE[c.key];
    const status: BalanceStatus = pct < lo ? "low" : pct > hi ? "high" : "ok";
    return { key: c.key, pct, status, recommended: [lo, hi] };
  });
}
