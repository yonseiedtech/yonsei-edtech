/**
 * InlineNotification — Carbon Design System 영감.
 *
 * Toast (transient sonner) 와 Banner (page-level) 사이 — 폼·섹션 내부 지속 알림.
 * 사용처: 폼 검증 오류·부분 실패·운영 상태 안내.
 */

import { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEMANTIC, KIND_TO_TONE, type SemanticKind } from "@/lib/design-tokens";

export type InlineNotificationKind = SemanticKind;

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

/** kind → 아이콘 (컴포넌트 고유). 색·배경은 SEMANTIC 단일 소스 참조. */
const KIND_ICON: Record<InlineNotificationKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
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
  const tone = SEMANTIC[KIND_TO_TONE[kind]];
  const Icon = KIND_ICON[kind];
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3",
        tone.notifSurface,
        className,
      )}
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", tone.iconStrong)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-bold", tone.titleStrong)}>{title}</p>
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
          className="-m-2 ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground sm:m-0 sm:h-7 sm:w-7"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
