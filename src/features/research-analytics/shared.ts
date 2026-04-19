import type { AlumniThesis } from "@/types";

export const STOPWORDS = new Set([
  "연구",
  "교육",
  "교육공학",
  "학습",
  "분석",
  "사례",
  "효과",
  "관계",
  "영향",
  "방안",
  "모형",
  "프로그램",
  "활용",
  "탐색",
  "고찰",
  "개발",
  "적용",
  "설계",
  "수행",
  "조사",
  "비교",
  "검증",
  "구조",
  "변인",
  "특성",
  "수업",
  "학생",
  "학교",
  "학",
  "을",
  "를",
  "의",
]);

export function normalizeKeyword(raw: string): string {
  return raw.replace(/[\s·,()<>「」『』\[\]'"]/g, "").trim();
}

export function yearFrom(t: AlumniThesis): number | null {
  const m = (t.awardedYearMonth ?? "").match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

export function thesesYearRange(
  theses: AlumniThesis[],
  fallback: { min: number; max: number } = { min: 2000, max: new Date().getFullYear() },
): { min: number; max: number } {
  const ys = theses
    .map(yearFrom)
    .filter((y): y is number => y != null)
    .sort((a, b) => a - b);
  if (ys.length === 0) return fallback;
  return { min: ys[0], max: ys[ys.length - 1] };
}
