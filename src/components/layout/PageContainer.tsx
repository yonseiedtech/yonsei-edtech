import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PageContainer — 페이지 레벨 wrapper 표준화 컴포넌트.
 *
 * 사용 목적
 * - 페이지마다 제각각이던 `<div className="mx-auto max-w-* px-* py-*">` 패턴을 통일.
 * - variant 4종 + py 3종으로 모든 페이지 wrapper 표현 가능.
 * - 모바일에서는 `px-4` 보존, 데스크톱에서 표준 패딩 적용.
 *
 * variant 매트릭스 (자세한 내용은 docs/proposals/page-container-audit.md):
 * - narrow  (max-w-3xl,  768px)   — 글·문서형 페이지 (상세, 인쇄형)
 * - default (max-w-5xl, 1024px)   — 일반 회원 페이지 (마이페이지, 프로필, 게시판 등)
 * - wide    (max-w-7xl, 1280px)   — 대시보드, 캘린더, 콘솔, 강의·활동 목록
 * - full    (w-full, 100%)        — 풀스크린/랜딩/이미지 도배형
 *
 * py:
 * - sm  → py-6 sm:py-8
 * - md  → py-8 sm:py-12 (기본)
 * - lg  → py-10 sm:py-14
 */

export type PageContainerVariant = "narrow" | "default" | "wide" | "full";
export type PageContainerPy = "sm" | "md" | "lg";

export interface PageContainerProps {
  children: ReactNode;
  variant?: PageContainerVariant;
  py?: PageContainerPy;
  className?: string;
  /** 추가 ARIA 속성. 로딩 상태에서 aria-busy 등 사용. */
  "aria-busy"?: boolean;
  "aria-label"?: string;
}

const VARIANT_CLASSES: Record<PageContainerVariant, string> = {
  narrow: "mx-auto max-w-3xl px-4 sm:px-6",
  default: "mx-auto max-w-5xl px-4 sm:px-6",
  wide: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
  full: "w-full px-4 sm:px-6",
};

const PY_CLASSES: Record<PageContainerPy, string> = {
  sm: "py-6 sm:py-8",
  md: "py-8 sm:py-12",
  lg: "py-10 sm:py-14",
};

export default function PageContainer({
  children,
  variant = "default",
  py = "md",
  className,
  "aria-busy": ariaBusy,
  "aria-label": ariaLabel,
}: PageContainerProps) {
  return (
    <div className={cn(PY_CLASSES[py])} aria-busy={ariaBusy} aria-label={ariaLabel}>
      <div className={cn(VARIANT_CLASSES[variant], className)}>{children}</div>
    </div>
  );
}
