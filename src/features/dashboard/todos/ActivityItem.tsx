"use client";

/**
 * ActivityItem — 학술활동(스터디/프로젝트/대외) 행 렌더.
 * `MyTodosWidget` 에서 분할 (Phase B 단순 추출 — 기능 변경 X).
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDday } from "@/lib/dday";
import { cn } from "@/lib/utils";
import { STATUS_CHIP } from "@/lib/design-tokens";
import { ACTIVITY_LABELS, TYPE_ROUTE, type ActivityFlat } from "./types";

export function ActivityItem({ a }: { a: ActivityFlat }) {
  const dd = a.date ? formatDday(a.date) : null;
  const ddCls = dd
    ? dd.kind === "past"
      ? cn("border", STATUS_CHIP.danger)
      : dd.kind === "today"
        ? cn("border", STATUS_CHIP.warning)
        : dd.diffDays <= 3
          ? "bg-warning/5 text-warning border border-warning/20"
          : "bg-muted/60 text-muted-foreground border"
    : "";
  return (
    <li>
      <Link
        href={`${TYPE_ROUTE[a.type]}/${a.id}`}
        className="flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-2 text-[12px] transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {ACTIVITY_LABELS[a.type]}
            </Badge>
            <span className="truncate font-medium">{a.title}</span>
            {dd && (
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                  ddCls,
                )}
                title={`시작 ${a.date}`}
              >
                {dd.label}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {a.date}
            {a.endDate && a.endDate !== a.date ? ` ~ ${a.endDate}` : ""}
            {a.status === "ongoing" ? " · 진행중" : " · 예정"}
          </p>
        </div>
        <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
