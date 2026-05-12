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

export type BannerKind = "info" | "success" | "warning" | "error";

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

const KIND_CONFIG: Record<
  BannerKind,
  { icon: typeof Info; gradient: string; iconClass: string; titleClass: string; buttonVariant: "default" | "outline" }
> = {
  info: {
    icon: Info,
    gradient:
      "border-blue-300/40 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/40 dark:to-sky-950/40",
    iconClass: "text-blue-600 dark:text-blue-300",
    titleClass: "text-blue-900 dark:text-blue-100",
    buttonVariant: "default",
  },
  success: {
    icon: CheckCircle2,
    gradient:
      "border-emerald-300/40 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40",
    iconClass: "text-emerald-600 dark:text-emerald-300",
    titleClass: "text-emerald-900 dark:text-emerald-100",
    buttonVariant: "default",
  },
  warning: {
    icon: AlertTriangle,
    gradient:
      "border-amber-300/40 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40",
    iconClass: "text-amber-600 dark:text-amber-300",
    titleClass: "text-amber-900 dark:text-amber-100",
    buttonVariant: "default",
  },
  error: {
    icon: AlertCircle,
    gradient:
      "border-rose-300/40 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/40",
    iconClass: "text-rose-600 dark:text-rose-300",
    titleClass: "text-rose-900 dark:text-rose-100",
    buttonVariant: "default",
  },
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
  const cfg = KIND_CONFIG[kind];
  const Icon = cfg.icon;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative rounded-2xl border-2 p-5 shadow-sm",
        cfg.gradient,
        className,
      )}
    >
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="배너 닫기"
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <X size={14} />
        </button>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card",
            cfg.iconClass,
          )}
        >
          <Icon size={22} />
        </div>
        <div className="flex-1">
          <h3 className={cn("text-base font-bold tracking-tight sm:text-lg", cfg.titleClass)}>
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
            <Button variant={cfg.buttonVariant} size="sm" className="gap-1">
              {action.label}
              <ArrowRight size={14} />
            </Button>
          </Link>
        ) : (
          <Button
            variant={cfg.buttonVariant}
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
