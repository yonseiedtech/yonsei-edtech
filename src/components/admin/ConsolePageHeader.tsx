import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** 우측 액션 영역 (버튼 등) */
  actions?: React.ReactNode;
}

export default function ConsolePageHeader({ icon: Icon, title, description, actions }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <Icon size={20} className="shrink-0 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
