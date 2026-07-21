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

// ─────────────────────────────────────────────────────────────
// 카테고리 칩/뱃지 색상 팔레트 — raw 팔레트 집중화
//
// types/* 및 feature lib 파일에서 raw Tailwind 팔레트 클래스를 직접 기재하는
// 대신, 이 상수를 import 해 참조한다. 이렇게 하면 raw 팔레트를 쓰는 파일 수가
// eslint-rawcolor-baseline.mjs 에서 제거되어 래칫 상한을 낮출 수 있다.
//
// 형식별 구분:
//   CAT_CHIP        — border + bg-50 + text-800 + dark  (A형)
//   CAT_CHIP_BARE   — border 색상만(utility 없음), bg-50 text-700  (B형)
//   CAT_PLAIN_50    — border 완전 없음, bg-50 text-700  (C형)
//   CAT_CHIP_100    — border + bg-100 + text-800 + dark  (D형)
//   CAT_CHIP_100_BARE — border 색상만, bg-100 text-800 + dark  (E형)
//   CAT_BADGE       — bg-100 text-700 + dark, border 없음  (소형 뱃지)
//   CAT_BADGE_BG/TEXT — bg·text 분리형  (user-note.ts)
//   CAT_STATUS_100  — bg-100 text-800 + dark  (상태 뱃지)
//   CAT_NOTE_KIND   — border-X bg-X text-X (border utility 없음)
//   CAT_BADGE_BORDER — bg-100 text-700 border-X-300 (severity)
//   CAT_ACCENT      — 다중 속성 팔레트 (AI 포럼 페르소나 등)
//   ROADMAP_PRESET_COLORS — 로드맵 프리셋 textColor + bgColor
//   CAT_VAR_PALETTE — reactflow 연구모형 변인 팔레트
// ─────────────────────────────────────────────────────────────

/**
 * A형 칩 — `border border-X-200` 포함, bg-50 text-800 + dark.
 * types/* 도메인 색상 맵에서 가장 많이 쓰이는 "테두리 있는 칩" 형식.
 */
export const CAT_CHIP = {
  blue:    "bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
  amber:   "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  emerald: "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  rose:    "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800",
  violet:  "bg-violet-50 text-violet-800 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800",
  indigo:  "bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
  sky:     "bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
  teal:    "bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-800",
  cyan:    "bg-cyan-50 text-cyan-800 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800",
  purple:  "bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800",
  fuchsia: "bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800",
  pink:    "bg-pink-50 text-pink-800 border border-pink-200 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800",
  slate:   "bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  gray:    "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  zinc:    "bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700",
} as const;

/**
 * B형 칩 — border utility 없음, bg-50 text-700 + border color.
 * 컴포넌트(Badge variant 등)에서 border utility 를 추가하는 구조에서 사용.
 */
export const CAT_CHIP_BARE = {
  blue:    "bg-blue-50 text-blue-700 border-blue-200",
  amber:   "bg-amber-50 text-amber-700 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rose:    "bg-rose-50 text-rose-700 border-rose-200",
  violet:  "bg-violet-50 text-violet-700 border-violet-200",
  sky:     "bg-sky-50 text-sky-700 border-sky-200",
  slate:   "bg-slate-50 text-slate-700 border-slate-200",
} as const;

/**
 * C형 칩 — border 클래스 없음, bg-50 text-700만.
 * academic.ts SPEAKER_SUBMISSION_TYPE_COLORS 등 border 가 전혀 없는 경우.
 */
export const CAT_PLAIN_50 = {
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300",
  amber:  "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  rose:   "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
} as const;

/**
 * D형 칩 — `border border-X-200` 포함, bg-100 text-800 + dark.
 * academic.ts EXTERNAL_PARTICIPANT_TYPE_COLORS 등.
 */
export const CAT_CHIP_100 = {
  purple:  "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800",
  emerald: "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  slate:   "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
} as const;

/**
 * E형 칩 — border utility 없음, bg-100 text-800 + dark.
 * academic.ts CONFERENCE_SESSION_CATEGORY_COLORS 등, 컴포넌트가 border 를 추가하는 구조.
 */
export const CAT_CHIP_100_BARE = {
  purple:   "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800",
  blue:     "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
  indigo:   "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
  emerald:  "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  amber:    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  fuchsia:  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800",
  rose:     "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800",
  pink:     "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800",
  slate200: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
  gray:     "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  grayMuted:"bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
} as const;

/**
 * 소형 뱃지 — bg-100 text-700 + dark, border 없음.
 * courses.ts, research-status.ts, article-status.ts REVIEW_STATUS 등.
 */
export const CAT_BADGE = {
  amber:   "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  blue:    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  purple:  "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  rose:    "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  slate:   "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  violet:  "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  cyan:    "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  sky:     "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  orange:  "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  red:     "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  zinc:    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  zincDim: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
} as const;

/**
 * 뱃지 배경 클래스 — user-note.ts USER_NOTE_CATEGORY_COLORS.bg 전용.
 */
export const CAT_BADGE_BG = {
  slate:   "bg-slate-100 dark:bg-slate-800",
  emerald: "bg-emerald-100 dark:bg-emerald-950/50",
  amber:   "bg-amber-100 dark:bg-amber-950/50",
  blue:    "bg-blue-100 dark:bg-blue-950/50",
  rose:    "bg-rose-100 dark:bg-rose-950/50",
  violet:  "bg-violet-100 dark:bg-violet-950/50",
} as const;

/**
 * 뱃지 텍스트 클래스 — user-note.ts USER_NOTE_CATEGORY_COLORS.text 전용.
 */
export const CAT_BADGE_TEXT = {
  slate:   "text-slate-700 dark:text-slate-200",
  emerald: "text-emerald-700 dark:text-emerald-200",
  amber:   "text-amber-700 dark:text-amber-200",
  blue:    "text-blue-700 dark:text-blue-200",
  rose:    "text-rose-700 dark:text-rose-200",
  violet:  "text-violet-700 dark:text-violet-200",
} as const;

/**
 * 상태 뱃지 — bg-100 text-800 + dark (workbook/operations 상태 색).
 */
export const CAT_STATUS_100 = {
  amber:   "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
} as const;

/**
 * 노트 종류 칩 — "border-X bg-X-50 text-X-800" 순서 고정, border utility 없음.
 * operations.ts STUDY_SESSION_NOTE_KIND_COLORS 전용.
 */
export const CAT_NOTE_KIND = {
  question:  "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  insight:   "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  highlight: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  quote:     "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200",
} as const;

/**
 * 심각도 뱃지 — bg-100 text-700 border-X-300 (border utility 없음, severity 레벨).
 * journal/lib/article-status.ts SEVERITY_COLORS 전용.
 */
export const CAT_BADGE_BORDER = {
  red:     "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  amber:   "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  blue:    "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
} as const;

/**
 * 다중 속성 엑센트 팔레트 — AI 포럼 페르소나 등 color/border/bg/ring 묶음.
 * AIPersona.color/accentBorder/accentBg/accentRing 필드에 스프레드(`...CAT_ACCENT.X`)로 적용.
 */
export const CAT_ACCENT: Record<
  string,
  { color: string; accentBorder: string; accentBg: string; accentRing: string }
> = {
  blue: {
    color: "text-blue-700 dark:text-blue-300",
    accentBorder: "border-l-blue-500 dark:border-l-blue-400",
    accentBg: "bg-blue-100 dark:bg-blue-950/50",
    accentRing: "ring-blue-200 dark:ring-blue-800",
  },
  emerald: {
    color: "text-emerald-700 dark:text-emerald-300",
    accentBorder: "border-l-emerald-500 dark:border-l-emerald-400",
    accentBg: "bg-emerald-100 dark:bg-emerald-950/50",
    accentRing: "ring-emerald-200 dark:ring-emerald-800",
  },
  amber: {
    color: "text-amber-700 dark:text-amber-300",
    accentBorder: "border-l-amber-500 dark:border-l-amber-400",
    accentBg: "bg-amber-100 dark:bg-amber-950/50",
    accentRing: "ring-amber-200 dark:ring-amber-800",
  },
  rose: {
    color: "text-rose-700 dark:text-rose-300",
    accentBorder: "border-l-rose-500 dark:border-l-rose-400",
    accentBg: "bg-rose-100 dark:bg-rose-950/50",
    accentRing: "ring-rose-200 dark:ring-rose-800",
  },
  purple: {
    color: "text-purple-700 dark:text-purple-300",
    accentBorder: "border-l-purple-500 dark:border-l-purple-400",
    accentBg: "bg-purple-100 dark:bg-purple-950/50",
    accentRing: "ring-purple-200 dark:ring-purple-800",
  },
  slate: {
    color: "text-slate-700 dark:text-slate-300",
    accentBorder: "border-l-slate-500 dark:border-l-slate-400",
    accentBg: "bg-slate-200 dark:bg-slate-800/50",
    accentRing: "ring-slate-200 dark:ring-slate-700",
  },
  zinc: {
    color: "text-zinc-600 dark:text-zinc-300",
    accentBorder: "border-l-zinc-400 dark:border-l-zinc-500",
    accentBg: "bg-zinc-100 dark:bg-zinc-800/60",
    accentRing: "ring-zinc-200 dark:ring-zinc-700",
  },
};

/**
 * 로드맵 프리셋 색상 — textColor(라벨·아이콘 색) + bgColor(카드 배경·테두리).
 * steppingstone.ts ROADMAP_COLOR_PRESETS 에서 label 을 제외한 색상 부분.
 */
export const ROADMAP_PRESET_COLORS: Record<
  string,
  { textColor: string; bgColor: string }
> = {
  blue: {
    textColor: "text-blue-700 dark:text-blue-300",
    bgColor: "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
  },
  emerald: {
    textColor: "text-emerald-700 dark:text-emerald-300",
    bgColor: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
  },
  amber: {
    textColor: "text-amber-700 dark:text-amber-300",
    bgColor: "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
  },
  rose: {
    textColor: "text-rose-700 dark:text-rose-300",
    bgColor: "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20",
  },
  purple: {
    textColor: "text-purple-700 dark:text-purple-300",
    bgColor: "border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20",
  },
  slate: {
    textColor: "text-slate-700 dark:text-slate-300",
    bgColor: "border-slate-200 bg-slate-50/50 dark:border-slate-900 dark:bg-slate-950/20",
  },
};

/**
 * 연구 모형 변인 팔레트 — reactflow 노드 bg/border/text/badge/hex 묶음.
 * research-model.ts VARIABLE_PALETTE 에서 raw 팔레트를 분리한 단일 소스.
 */
export const CAT_VAR_PALETTE: Record<
  string,
  { bg: string; border: string; text: string; badge: string; hex: string }
> = {
  sky: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-300 dark:border-sky-700",
    text: "text-sky-900 dark:text-sky-100",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200",
    hex: "#0ea5e9",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-300 dark:border-violet-700",
    text: "text-violet-900 dark:text-violet-100",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200",
    hex: "#8b5cf6",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-900 dark:text-amber-100",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",
    hex: "#f59e0b",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-700",
    text: "text-emerald-900 dark:text-emerald-100",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200",
    hex: "#10b981",
  },
  slate: {
    bg: "bg-slate-50 dark:bg-slate-900/60",
    border: "border-slate-300 dark:border-slate-600",
    text: "text-slate-800 dark:text-slate-100",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    hex: "#64748b",
  },
};
