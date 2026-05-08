/**
 * 세션 카드 시각 위계 (option A — C1 카드 variant)
 *
 * 카테고리별 카드 외형을 3단계 위계로 차별화:
 *  - primary: keynote / ceremony — 좌측 4px 컬러 바 + 약한 배경 틴트 + 큰 제목
 *  - standard: paper / poster / symposium / panel / workshop / media / networking — 기본
 *  - compact: break / other — 압축 padding (정보 밀도↓)
 *
 * 분석 근거: docs/03-analysis/conference-program-as-is-to-be.md §C1
 */

import type { ConferenceSessionCategory } from "@/types";

export type SessionCardVariant = "primary" | "standard" | "compact";

const PRIMARY_CATEGORIES: ConferenceSessionCategory[] = ["keynote", "ceremony"];
const COMPACT_CATEGORIES: ConferenceSessionCategory[] = ["break"];

export function getSessionCardVariant(
  category: ConferenceSessionCategory,
): SessionCardVariant {
  if (PRIMARY_CATEGORIES.includes(category)) return "primary";
  if (COMPACT_CATEGORIES.includes(category)) return "compact";
  return "standard";
}

/** 카테고리별 좌측 컬러 바 색상 (primary variant 전용) */
export const CATEGORY_ACCENT_BAR: Record<ConferenceSessionCategory, string> = {
  keynote: "bg-purple-500 dark:bg-purple-400",
  symposium: "bg-blue-500 dark:bg-blue-400",
  panel: "bg-indigo-500 dark:bg-indigo-400",
  paper: "bg-emerald-500 dark:bg-emerald-400",
  poster: "bg-amber-500 dark:bg-amber-400",
  media: "bg-fuchsia-500 dark:bg-fuchsia-400",
  workshop: "bg-rose-500 dark:bg-rose-400",
  networking: "bg-pink-500 dark:bg-pink-400",
  ceremony: "bg-slate-600 dark:bg-slate-300",
  break: "bg-gray-400 dark:bg-gray-500",
  other: "bg-gray-400 dark:bg-gray-500",
};

/** variant 별 카드 전체 클래스 (Card 컴포넌트 className 으로 적용) */
export function cardClassesForVariant(
  variant: SessionCardVariant,
  isPlanned: boolean,
): string {
  const base = isPlanned
    ? "border-blue-300 bg-blue-50/40 dark:border-blue-700 dark:bg-blue-950/30"
    : "";

  if (variant === "primary") {
    return `${base} relative overflow-hidden shadow-sm`;
  }
  if (variant === "compact") {
    return `${base} bg-muted/20`;
  }
  return base;
}

/** variant 별 CardContent padding */
export function contentPaddingForVariant(variant: SessionCardVariant): string {
  if (variant === "primary") return "p-5";
  if (variant === "compact") return "px-4 py-2";
  return "p-4";
}

/** variant 별 제목 크기 */
export function titleClassForVariant(variant: SessionCardVariant): string {
  if (variant === "primary") return "text-lg font-bold leading-snug";
  if (variant === "compact") return "text-sm font-medium leading-snug";
  return "text-base font-semibold leading-snug";
}
