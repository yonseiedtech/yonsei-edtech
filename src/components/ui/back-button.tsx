"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type BackButtonVariant = "subtle" | "default" | "prominent";

export interface BackButtonProps {
  /** 명시적 이동 경로. 지정 시 <Link> 로 렌더. */
  href?: string;
  /** 라벨 텍스트. 기본값 "뒤로". */
  label?: string;
  /** 외형. 기본값 "default" (둥근 배지). */
  variant?: BackButtonVariant;
  /** href 없이 router.back() 사용할 때 history 비어 있으면 이동할 fallback 경로. */
  fallbackHref?: string;
  /** 추가 클래스. */
  className?: string;
  /** aria-label. 기본값 "이전 페이지로 돌아가기". */
  ariaLabel?: string;
}

const VARIANT_CLASSES: Record<BackButtonVariant, string> = {
  subtle:
    "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors",
  default:
    "inline-flex items-center gap-1.5 rounded-full border border-input bg-card px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors",
  prominent:
    "inline-flex items-center gap-1.5 rounded-full border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors",
};

const ICON_SIZE: Record<BackButtonVariant, number> = {
  subtle: 14,
  default: 14,
  prominent: 16,
};

/**
 * 이전 페이지로 돌아가는 표준 버튼.
 *
 * - `href` 명시 → `<Link>` 렌더 (해당 경로로 이동)
 * - `href` 없음 → `<button>` 렌더 + `router.back()`
 *   - `fallbackHref` 지정 시 `window.history.length <= 1` 일 때 그쪽으로 이동
 */
export function BackButton({
  href,
  label = "뒤로",
  variant = "default",
  fallbackHref,
  className,
  ariaLabel = "이전 페이지로 돌아가기",
}: BackButtonProps) {
  const router = useRouter();
  const classes = cn(VARIANT_CLASSES[variant], className);
  const iconSize = ICON_SIZE[variant];

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel}>
        <ArrowLeft size={iconSize} aria-hidden />
        {label}
      </Link>
    );
  }

  const handleClick = () => {
    if (typeof window !== "undefined") {
      if (fallbackHref && window.history.length <= 1) {
        router.push(fallbackHref);
        return;
      }
    }
    router.back();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={classes}
      aria-label={ariaLabel}
    >
      <ArrowLeft size={iconSize} aria-hidden />
      {label}
    </button>
  );
}

export default BackButton;
