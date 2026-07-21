import type { LucideIcon } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

export function MiniProgress({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="flex items-center justify-between gap-1.5 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Icon size={11} />
          {label}
        </span>
        <span className="font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="mt-1.5">
        <ProgressBar value={pct} />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}
