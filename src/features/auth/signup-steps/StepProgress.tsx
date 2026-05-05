"use client";

import { cn } from "@/lib/utils";

const STEP_LABELS = [
  "계정 정보",
  "학적 정보",
  "계정 보안",
  "선택 정보",
  "약관 동의",
] as const;

interface StepProgressProps {
  current: 1 | 2 | 3 | 4 | 5;
  total?: number;
}

export default function StepProgress({ current, total = 5 }: StepProgressProps) {
  const percent = ((current - 1) / (total - 1)) * 100;

  return (
    <div
      className="sticky top-0 z-20 -mx-4 mb-6 border-b bg-background/90 px-4 py-3 backdrop-blur"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`${current} / ${total} 단계 — ${STEP_LABELS[current - 1] ?? ""}`}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-primary">
          {current} / {total} 단계
        </span>
        <span className="text-muted-foreground">
          {STEP_LABELS[current - 1] ?? ""}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        {Array.from({ length: total }).map((_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < current;
          const isCurrent = stepNum === current;
          return (
            <span
              key={stepNum}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                isCompleted
                  ? "bg-primary"
                  : isCurrent
                    ? "bg-primary"
                    : "bg-muted",
              )}
              aria-hidden
            />
          );
        })}
      </div>
    </div>
  );
}
