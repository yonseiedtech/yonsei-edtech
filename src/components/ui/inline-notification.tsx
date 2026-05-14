/**
 * InlineNotification — Carbon Design System 영감.
 *
 * Toast (transient sonner) 와 Banner (page-level) 사이 — 폼·섹션 내부 지속 알림.
 * 사용처: 폼 검증 오류·부분 실패·운영 상태 안내.
 */

import { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type InlineNotificationKind = "info" | "success" | "warning" | "error";

interface InlineNotificationProps {
  kind?: InlineNotificationKind;
  title: string;
  description?: ReactNode;
  /** 닫기 가능 여부 */
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  /** 추가 우측 액션 (예: 작은 텍스트 링크) */
  action?: ReactNode;
}

const KIND_CONFIG: Record<
  InlineNotificationKind,
  { icon: typeof Info; bgClass: string; iconClass: string; titleClass: string }
> = {
  info: {
    icon: Info,
    bgClass: "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40",
    iconClass: "text-blue-600 dark:text-blue-300",
    titleClass: "text-blue-900 dark:text-blue-100",
  },
  success: {
    icon: CheckCircle2,
    bgClass:
      "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
    iconClass: "text-emerald-600 dark:text-emerald-300",
    titleClass: "text-emerald-900 dark:text-emerald-100",
  },
  warning: {
    icon: AlertTriangle,
    bgClass:
      "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
    iconClass: "text-amber-600 dark:text-amber-300",
    titleClass: "text-amber-900 dark:text-amber-100",
  },
  error: {
    icon: AlertCircle,
    bgClass: "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40",
    iconClass: "text-rose-600 dark:text-rose-300",
    titleClass: "text-rose-900 dark:text-rose-100",
  },
};

export default function InlineNotification({
  kind = "info",
  title,
  description,
  dismissible = false,
  onDismiss,
  className,
  action,
}: InlineNotificationProps) {
  const cfg = KIND_CONFIG[kind];
  const Icon = cfg.icon;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3",
        cfg.bgClass,
        className,
      )}
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", cfg.iconClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-bold", cfg.titleClass)}>{title}</p>
        {description && (
          <div className="mt-0.5 text-xs leading-relaxed text-foreground/80 sm:text-sm">
            {description}
          </div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="알림 닫기"
          className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
