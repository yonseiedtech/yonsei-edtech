import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary";
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** 단일 액션 (legacy — `actions` 와 병행 사용 가능, 두 가지 모두 지정 시 actions가 우선) */
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** 다중 액션 (dashboard-quickwins) — 빈 학술활동에서 "스터디 둘러보기"+"프로젝트 둘러보기" 등 */
  actions?: EmptyStateAction[];
  className?: string;
  /** 컴팩트 모드 — 위젯 내부 작은 영역용 (paddings 줄임) */
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  actions,
  className,
  compact = false,
}: EmptyStateProps) {
  const computedActions: EmptyStateAction[] = actions && actions.length > 0
    ? actions
    : actionLabel
      ? [{ label: actionLabel, href: actionHref, onClick: onAction }]
      : [];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          compact ? "h-9 w-9" : "h-12 w-12",
        )}
      >
        <Icon size={compact ? 18 : 22} />
      </div>
      <h3
        className={cn(
          "font-semibold",
          compact ? "mt-2 text-sm" : "mt-4 text-base",
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "max-w-sm text-muted-foreground",
            compact ? "mt-0.5 text-xs" : "mt-1 text-sm",
          )}
        >
          {description}
        </p>
      )}
      {computedActions.length > 0 && (
        <div className={cn("flex flex-wrap items-center justify-center gap-2", compact ? "mt-2" : "mt-4")}>
          {computedActions.map((act) =>
            act.href ? (
              <Link key={act.label} href={act.href}>
                <Button size="sm" variant={act.variant ?? "default"}>{act.label}</Button>
              </Link>
            ) : (
              <Button
                key={act.label}
                size="sm"
                variant={act.variant ?? "default"}
                onClick={act.onClick}
              >
                {act.label}
              </Button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
