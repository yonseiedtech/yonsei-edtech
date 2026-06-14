// 명함 디자인 테마 색상 매핑 (사이클 112, 사용자 요청)
// CardThemeKey → Tailwind 클래스. BusinessCard·CardSection 에서 공유.
// 명함은 인쇄·캡처 목적이라 라이트 모드 색상 고정 (다크 시맨틱 색상 미사용).

import type { CardThemeKey } from "@/types";

export interface CardThemeStyle {
  /** 상단 accent — bg-gradient-to-br 와 함께 사용 */
  accent: string;
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
    accent: "from-primary to-primary/70",
    chipBg: "bg-primary/10",
    chipText: "text-primary",
    fieldText: "text-slate-500",
    swatch: "bg-primary",
  },
  navy: {
    accent: "from-indigo-700 to-blue-500",
    chipBg: "bg-indigo-100",
    chipText: "text-indigo-700",
    fieldText: "text-indigo-500",
    swatch: "bg-indigo-700",
  },
  emerald: {
    accent: "from-emerald-600 to-teal-400",
    chipBg: "bg-emerald-100",
    chipText: "text-emerald-700",
    fieldText: "text-emerald-600",
    swatch: "bg-emerald-600",
  },
  rose: {
    accent: "from-rose-500 to-pink-400",
    chipBg: "bg-rose-100",
    chipText: "text-rose-700",
    fieldText: "text-rose-500",
    swatch: "bg-rose-500",
  },
  slate: {
    accent: "from-slate-700 to-slate-500",
    chipBg: "bg-slate-200",
    chipText: "text-slate-700",
    fieldText: "text-slate-500",
    swatch: "bg-slate-700",
  },
  amber: {
    accent: "from-amber-500 to-orange-400",
    chipBg: "bg-amber-100",
    chipText: "text-amber-700",
    fieldText: "text-amber-600",
    swatch: "bg-amber-500",
  },
};

/** 안전 resolve — 미지정/미지 키는 default. */
export function resolveCardTheme(key: string | undefined | null): CardThemeStyle {
  if (key && key in CARD_THEMES) return CARD_THEMES[key as CardThemeKey];
  return CARD_THEMES.default;
}
