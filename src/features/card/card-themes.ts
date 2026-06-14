// 명함 디자인 테마 색상 매핑 (사이클 112c, 사용자 요청)
// Tailwind v4 동적 클래스 purge 문제를 피하기 위해 hex/CSS 값으로 정의 → BusinessCard 는
// 인라인 style 로 적용(스캐너 무관, 항상 표시). swatch 도 style 로 렌더.
// 명함은 인쇄·캡처 목적이라 라이트 모드 색상 고정.

import type { CardThemeKey } from "@/types";

export interface CardThemeStyle {
  /** 상단 accent 그라데이션 시작 */
  accentFrom: string;
  /** 상단 accent 그라데이션 끝 */
  accentTo: string;
  /** 키워드 칩 배경 */
  chipBg: string;
  /** 키워드 칩 텍스트 */
  chipText: string;
  /** 관심분야(#field) 텍스트 색 */
  fieldText: string;
  /** 선택 UI 스와치 색 */
  swatch: string;
}

export const CARD_THEMES: Record<CardThemeKey, CardThemeStyle> = {
  default: {
    accentFrom: "hsl(var(--primary))",
    accentTo: "hsl(var(--primary) / 0.7)",
    chipBg: "hsl(var(--primary) / 0.1)",
    chipText: "hsl(var(--primary))",
    fieldText: "#64748b", // slate-500
    swatch: "hsl(var(--primary))",
  },
  navy: {
    accentFrom: "#4338ca", // indigo-700
    accentTo: "#3b82f6", // blue-500
    chipBg: "#e0e7ff", // indigo-100
    chipText: "#4338ca",
    fieldText: "#6366f1", // indigo-500
    swatch: "#4338ca",
  },
  emerald: {
    accentFrom: "#059669", // emerald-600
    accentTo: "#2dd4bf", // teal-400
    chipBg: "#d1fae5", // emerald-100
    chipText: "#047857", // emerald-700
    fieldText: "#059669", // emerald-600
    swatch: "#059669",
  },
  rose: {
    accentFrom: "#f43f5e", // rose-500
    accentTo: "#f472b6", // pink-400
    chipBg: "#ffe4e6", // rose-100
    chipText: "#be123c", // rose-700
    fieldText: "#f43f5e", // rose-500
    swatch: "#f43f5e",
  },
  slate: {
    accentFrom: "#334155", // slate-700
    accentTo: "#64748b", // slate-500
    chipBg: "#e2e8f0", // slate-200
    chipText: "#334155", // slate-700
    fieldText: "#64748b", // slate-500
    swatch: "#334155",
  },
  amber: {
    accentFrom: "#f59e0b", // amber-500
    accentTo: "#fb923c", // orange-400
    chipBg: "#fef3c7", // amber-100
    chipText: "#b45309", // amber-700
    fieldText: "#d97706", // amber-600
    swatch: "#f59e0b",
  },
};

/** 안전 resolve — 미지정/미지 키는 default. */
export function resolveCardTheme(key: string | undefined | null): CardThemeStyle {
  if (key && key in CARD_THEMES) return CARD_THEMES[key as CardThemeKey];
  return CARD_THEMES.default;
}
