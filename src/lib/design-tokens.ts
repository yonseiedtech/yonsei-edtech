/**
 * 대시보드 디자인 토큰 — dashboard-quickwins (Sprint 67)
 *
 * 목적:
 *  - 위젯별로 흩어져 있던 컬러 클래스 (`bg-amber-50`, `bg-blue-50` 등) 를 시맨틱 토큰으로 수렴.
 *  - 다크 모드 누락 일괄 해결 (info/warning/danger/success 4종 다크 변형 포함).
 *  - 향후 P1+ 작업에서 추가 시맨틱 (예: neutral, accent) 확장 시 단일 진입점.
 *
 * 사용 예:
 *   import { SEMANTIC } from "@/lib/design-tokens";
 *   <div className={cn(SEMANTIC.warning.bg, SEMANTIC.warning.border)}>
 *
 * 분석 근거: docs/03-analysis/dashboard-uiux-synthesis.md §1 C1
 */

export type SemanticTone = "info" | "warning" | "danger" | "success" | "default";

interface SemanticPalette {
  /** 카드/배너 배경 (라이트 + 다크 모드) */
  bg: string;
  /** 테두리 */
  border: string;
  /** 본문 텍스트 (제목·강조용) */
  text: string;
  /** 보조 텍스트 (설명·레이블) — text 보다 약하게 */
  textMuted: string;
  /** 아이콘 + 강조 색상 (D-day 숫자 등) */
  accent: string;
  /** 배지·작은 칩 배경 (text 와 함께 사용) */
  chipBg: string;
  /** 배지·작은 칩 텍스트 */
  chipText: string;
}

export const SEMANTIC: Record<SemanticTone, SemanticPalette> = {
  default: {
    bg: "bg-card",
    border: "border-border",
    text: "text-foreground",
    textMuted: "text-muted-foreground",
    accent: "text-primary",
    chipBg: "bg-muted",
    chipText: "text-foreground",
  },
  info: {
    bg: "bg-blue-50/60 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-900 dark:text-blue-100",
    textMuted: "text-blue-800/80 dark:text-blue-200/80",
    accent: "text-blue-700 dark:text-blue-300",
    chipBg: "bg-blue-100 dark:bg-blue-900/50",
    chipText: "text-blue-700 dark:text-blue-200",
  },
  warning: {
    bg: "bg-amber-50/60 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-900 dark:text-amber-100",
    textMuted: "text-amber-800/80 dark:text-amber-200/80",
    accent: "text-amber-700 dark:text-amber-300",
    chipBg: "bg-amber-100 dark:bg-amber-900/50",
    chipText: "text-amber-700 dark:text-amber-200",
  },
  danger: {
    bg: "bg-rose-50/60 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-900 dark:text-rose-100",
    textMuted: "text-rose-800/80 dark:text-rose-200/80",
    accent: "text-rose-700 dark:text-rose-300",
    chipBg: "bg-rose-100 dark:bg-rose-900/50",
    chipText: "text-rose-700 dark:text-rose-200",
  },
  success: {
    bg: "bg-emerald-50/60 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-900 dark:text-emerald-100",
    textMuted: "text-emerald-800/80 dark:text-emerald-200/80",
    accent: "text-emerald-700 dark:text-emerald-300",
    chipBg: "bg-emerald-100 dark:bg-emerald-900/50",
    chipText: "text-emerald-700 dark:text-emerald-200",
  },
};

/** 위젯 표준 패딩 */
export const WIDGET_PADDING = "p-5 sm:p-6";

/** 위젯 간 표준 간격 */
export const WIDGET_GAP = "mt-5";

/** 섹션 헤더 아이콘 사이즈 */
export const SECTION_ICON_SIZE = 18;

/** 인라인 텍스트 아이콘 사이즈 */
export const INLINE_ICON_SIZE = 14;

/** StatCard·강조 아이콘 사이즈 */
export const STAT_ICON_SIZE = 20;
