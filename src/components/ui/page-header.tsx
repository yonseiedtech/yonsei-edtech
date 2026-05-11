import { isValidElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type PageHeaderVariant = "public" | "console";

interface PageHeaderProps {
  /** Lucide 컴포넌트 참조(권장) 또는 사전 렌더된 JSX */
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  variant?: PageHeaderVariant;
}

function renderIcon(icon: LucideIcon | ReactNode, isConsole: boolean): ReactNode {
  // 이미 JSX 엘리먼트라면 그대로 사용 (legacy)
  if (isValidElement(icon)) {
    return isConsole ? (
      <span className="shrink-0 text-primary">{icon}</span>
    ) : (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
    );
  }
  // LucideIcon 컴포넌트 참조 (function/forwardRef)
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
    const Icon = icon as LucideIcon;
    return isConsole ? (
      <Icon size={20} className="shrink-0 text-primary" />
    ) : (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon size={24} />
      </div>
    );
  }
  return null;
}

export default function PageHeader({
  icon,
  title,
  description,
  actions,
  variant = "public",
}: PageHeaderProps) {
  const isConsole = variant === "console";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon && renderIcon(icon, isConsole)}
        <div className="min-w-0">
          {/* Sprint 67-AP Phase 1: 헤드라인 폰트 크기 ↑ (토스 패턴 — 큰 임팩트) */}
          <h1
            className={
              isConsole
                ? "text-xl font-bold sm:text-2xl"
                : "text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
            }
          >
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground sm:mt-1.5 sm:text-base">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
      )}
    </div>
  );
}
