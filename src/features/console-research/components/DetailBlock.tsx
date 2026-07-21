import type { ReactNode } from "react";

export function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
