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

/**
 * 상태 칩(배지) 표준 변형.
 * 전역 상태 색(승인=success·위험=danger·대기=warning·정보=info·중립=neutral)을
 * 단일 토큰으로 수렴하기 위한 키. `StatusBadge` 및 향후 feature 상태색 마이그레이션의 참조점.
 */
export type StatusVariant = "success" | "danger" | "warning" | "info" | "neutral";

/**
 * 알림 컴포넌트(InlineNotification·ActionableBanner)에서 쓰는 kind 명칭.
 * `error` 는 SEMANTIC 의 `danger` 톤에 대응한다 (KIND_TO_TONE 참조).
 */
export type SemanticKind = "info" | "success" | "warning" | "error";

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
  /**
   * 상태 칩(배지) 1-class 토큰 — bg + text + border 라이트·다크 한 묶음.
   * StatusBadge variant 및 feature 상태색(`bg-emerald-50 ... border-emerald-200 dark:...`) 마이그레이션 단일 소스.
   * chipBg/chipText(`-100`/`-700`, 강조 칩)보다 옅은 `-50` 배경 + 테두리 = 상태 배지 표준 농도.
   */
  chip: string;
  /**
   * 알림 컴포넌트용 솔리드 배경 + 테두리 (InlineNotification).
   * bg(`/60` 반투명) 보다 진한 단색 배경 — 폼·섹션 내부 지속 알림용.
   */
  notifSurface: string;
  /**
   * 알림 컴포넌트용 그라데이션 배경 + 테두리 (ActionableBanner).
   * prominent 배너 고유 비주얼.
   */
  bannerSurface: string;
  /** 알림 아이콘 강조 색상 (-600/-300) — accent 보다 진함 */
  iconStrong: string;
  /** 알림 제목 강조 색상 (-900/-100) */
  titleStrong: string;
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
    chip: "bg-muted text-foreground border-border",
    notifSurface: "border-border bg-card",
    bannerSurface: "border-border bg-card",
    iconStrong: "text-foreground",
    titleStrong: "text-foreground",
  },
  info: {
    bg: "bg-blue-50/60 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-900 dark:text-blue-100",
    textMuted: "text-blue-800/80 dark:text-blue-200/80",
    accent: "text-blue-700 dark:text-blue-300",
    chipBg: "bg-blue-100 dark:bg-blue-900/50",
    chipText: "text-blue-700 dark:text-blue-200",
    chip: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900",
    notifSurface: "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40",
    bannerSurface:
      "border-blue-300/40 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/40 dark:to-sky-950/40",
    iconStrong: "text-blue-600 dark:text-blue-300",
    titleStrong: "text-blue-900 dark:text-blue-100",
  },
  warning: {
    bg: "bg-amber-50/60 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-900 dark:text-amber-100",
    textMuted: "text-amber-800/80 dark:text-amber-200/80",
    accent: "text-amber-700 dark:text-amber-300",
    chipBg: "bg-amber-100 dark:bg-amber-900/50",
    chipText: "text-amber-700 dark:text-amber-200",
    chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
    notifSurface: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
    bannerSurface:
      "border-amber-300/40 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40",
    iconStrong: "text-amber-600 dark:text-amber-300",
    titleStrong: "text-amber-900 dark:text-amber-100",
  },
  danger: {
    bg: "bg-rose-50/60 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-900 dark:text-rose-100",
    textMuted: "text-rose-800/80 dark:text-rose-200/80",
    accent: "text-rose-700 dark:text-rose-300",
    chipBg: "bg-rose-100 dark:bg-rose-900/50",
    chipText: "text-rose-700 dark:text-rose-200",
    chip: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900",
    notifSurface: "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40",
    bannerSurface:
      "border-rose-300/40 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/40",
    iconStrong: "text-rose-600 dark:text-rose-300",
    titleStrong: "text-rose-900 dark:text-rose-100",
  },
  success: {
    bg: "bg-emerald-50/60 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-900 dark:text-emerald-100",
    textMuted: "text-emerald-800/80 dark:text-emerald-200/80",
    accent: "text-emerald-700 dark:text-emerald-300",
    chipBg: "bg-emerald-100 dark:bg-emerald-900/50",
    chipText: "text-emerald-700 dark:text-emerald-200",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
    notifSurface:
      "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
    bannerSurface:
      "border-emerald-300/40 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40",
    iconStrong: "text-emerald-600 dark:text-emerald-300",
    titleStrong: "text-emerald-900 dark:text-emerald-100",
  },
};

/**
 * 알림 컴포넌트의 kind → SEMANTIC 톤 매핑.
 * `error` 는 `danger` 톤으로 수렴 (시맨틱 단일 소스).
 */
export const KIND_TO_TONE: Record<SemanticKind, SemanticTone> = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "danger",
};

/**
 * 상태 칩(배지) variant → SEMANTIC tone 매핑.
 * `neutral` 은 default(중립 회색) 톤에 대응. StatusBadge 및 상태색 마이그레이션의 톤 해석 단일 소스.
 */
export const STATUS_VARIANT_TO_TONE: Record<StatusVariant, SemanticTone> = {
  success: "success",
  danger: "danger",
  warning: "warning",
  info: "info",
  neutral: "default",
};

/**
 * 상태 칩(배지) variant → 1-class chip 토큰 (bg+text+border, 라이트·다크).
 * `<Badge variant="outline" className={STATUS_CHIP[v]}>` 형태로 직접 소비.
 */
export const STATUS_CHIP: Record<StatusVariant, string> = {
  success: SEMANTIC.success.chip,
  danger: SEMANTIC.danger.chip,
  warning: SEMANTIC.warning.chip,
  info: SEMANTIC.info.chip,
  neutral: SEMANTIC.default.chip,
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
