/**
 * SkeletonWidget — 대시보드 위젯 표준 로딩 상태 (dashboard-quickwins Sprint 67)
 *
 * 위젯별로 흩어진 로딩 표시(`불러오는 중…` 텍스트, `h-32 animate-pulse` 등)를 통일.
 *
 * 사용 예:
 *   if (isLoading) return <SkeletonWidget rows={3} />;
 *   if (isLoading) return <SkeletonWidget rows={2} hasHeader />;
 *
 * 분석 근거: docs/03-analysis/dashboard-uiux-synthesis.md §1 C3
 */

import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";
import { WIDGET_PADDING } from "@/lib/design-tokens";

interface SkeletonWidgetProps {
  /** 본문 라인 개수 (기본 3) */
  rows?: number;
  /** 헤더(아이콘+타이틀) placeholder 표시 여부 (기본 true) */
  hasHeader?: boolean;
  /** 외곽 카드 형태 유지 (기본 true) — false 시 padding/border 없이 row만 표시 */
  bordered?: boolean;
  className?: string;
}

export default function SkeletonWidget({
  rows = 3,
  hasHeader = true,
  bordered = true,
  className,
}: SkeletonWidgetProps) {
  return (
    <div
      className={cn(
        bordered && cn("rounded-2xl border bg-card", WIDGET_PADDING),
        className,
      )}
      aria-busy="true"
      aria-label="불러오는 중"
    >
      {hasHeader && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-28 rounded" />
        </div>
      )}
      <div className={cn("space-y-2", hasHeader && "mt-4")}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-10 rounded-lg", i === rows - 1 ? "w-3/4" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}
