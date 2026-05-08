/**
 * Conference 통계 카드 (option A — F2 컴포넌트 추출)
 *
 * 기존: ConferenceProgramStats.tsx 와 ConferenceRoundupView.tsx 에 거의 동일한
 * 함수가 별도 정의되어 있던 것을 단일 컴포넌트로 수렴.
 *
 * 분석 근거: docs/03-analysis/conference-program-as-is-to-be.md §F2
 */

import type { ReactNode } from "react";

interface StatProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  /** 약한 배경 (Roundup 변형 — bg-card/70) */
  variant?: "default" | "muted";
}

export default function Stat({
  label,
  value,
  icon,
  variant = "default",
}: StatProps) {
  const bg = variant === "muted" ? "bg-card/70" : "bg-background";
  return (
    <div className={`rounded-md border ${bg} p-3`}>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
