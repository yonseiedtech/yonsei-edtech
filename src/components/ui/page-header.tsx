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
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && renderIcon(icon, isConsole)}
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
