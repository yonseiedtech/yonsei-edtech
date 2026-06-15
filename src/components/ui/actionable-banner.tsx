/**
 * ActionableBanner — Carbon Design System 영감.
 *
 * 페이지 상단·섹션 헤더 영역에 표시되는 prominent 알림 + CTA.
 * 사용처: 미답변 문의 N건·승인 대기 회원 안내·신규 회원 환영 같은 행동 유도성 안내.
 */

import { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SEMANTIC, KIND_TO_TONE, type SemanticKind } from "@/lib/design-tokens";

export type BannerKind = SemanticKind;

interface ActionableBannerProps {
  kind?: BannerKind;
  title: string;
  description?: ReactNode;
  action: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

/** kind → 아이콘 (컴포넌트 고유). 색·그라데이션은 SEMANTIC 단일 소스 참조. */
const KIND_ICON: Record<BannerKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export default function ActionableBanner({
  kind = "info",
  title,
  description,
  action,
  dismissible = false,
  onDismiss,
  className,
}: ActionableBannerProps) {
  const tone = SEMANTIC[KIND_TO_TONE[kind]];
  const Icon = KIND_ICON[kind];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative rounded-2xl border-2 p-5 shadow-sm",
        tone.bannerSurface,
        className,
      )}
    >
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="배너 닫기"
          className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground sm:right-3 sm:top-3 sm:h-7 sm:w-7"
        >
          <X size={14} />
        </button>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card",
            tone.iconStrong,
          )}
        >
          <Icon size={22} />
        </div>
        <div className="flex-1">
          <h3 className={cn("text-base font-bold tracking-tight sm:text-lg", tone.titleStrong)}>
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-foreground/80 sm:text-sm">
              {description}
            </p>
          )}
        </div>
        {action.href ? (
          <Link href={action.href} className="shrink-0">
            <Button variant="default" size="sm" className="gap-1">
              {action.label}
              <ArrowRight size={14} />
            </Button>
          </Link>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={action.onClick}
            className="shrink-0 gap-1"
          >
            {action.label}
            <ArrowRight size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}
