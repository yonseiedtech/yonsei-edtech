"use client";

/**
 * DailyGrid — 일간 타임라인 그리드.
 * `DailyClassTimelineWidget` 에서 분할 (Phase B 단순 추출 — 기능 변경 X).
 */

import Link from "next/link";
import { ExternalLink, Users } from "lucide-react";
import { ACTIVITY_PROGRESS_MODE_LABELS, CLASS_SESSION_MODE_LABELS } from "@/types";
import type { CourseOffering } from "@/types";
import type { ParsedSchedule } from "@/lib/courseSchedule";
import { fmtTimeRange } from "@/lib/courseSchedule";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_MODE_BADGE,
  ACTIVITY_MODE_BORDER,
  ACTIVITY_TYPE_LABEL,
  ACTIVITY_TYPE_PATH,
  MODE_BADGE,
  MODE_BORDER,
  ROW_HEIGHT_PX,
  computeLanes,
  type PlacedActivity,
  type PlacedClass,
} from "./types";

export function DailyGrid({
  placed,
  placedActivities,
  undated,
  hourRows,
  totalHeight,
  nowPx,
  nowLabel,
}: {
  placed: PlacedClass[];
  placedActivities: PlacedActivity[];
  undated: { offering: CourseOffering; parsed: ParsedSchedule }[];
  hourRows: number[];
  totalHeight: number;
  nowPx: number | null;
  nowLabel: string;
}) {
  // QA-v2: 동시간대 일정이 서로를 완전히 가리던 문제 — 겹침 그룹을 레인으로 분할
  const laneMap = computeLanes(
    [
      ...placed.map((p) => ({ key: `c-${p.offering.id}`, top: p.topPx, height: p.heightPx })),
      ...placedActivities.map((a) => ({ key: `a-${a.progress.id}`, top: a.topPx, height: a.heightPx })),
    ],
    64,
  );
  const laneStyle = (key: string) => {
    const li = laneMap.get(key) ?? { lane: 0, lanes: 1 };
    return {
      left: `calc(12px + (100% - 24px) * ${li.lane} / ${li.lanes})`,
      width: `calc((100% - 24px) / ${li.lanes})`,
    };
  };
  return (
    <>
      <div className="mt-4 grid gap-0" style={{ gridTemplateColumns: "44px 1fr" }}>
        {/* 시간 라벨 */}
        <div className="relative" style={{ height: totalHeight }}>
          {hourRows.map((h, i) => (
            <div
              key={h}
              className="absolute right-2 -translate-y-2 text-[11px] font-medium text-muted-foreground"
              style={{ top: i * ROW_HEIGHT_PX }}
            >
              {h === 24 ? "00:00" : `${h}:00`}
            </div>
          ))}
        </div>

        {/* 카드 영역 */}
        <div
          className="relative border-l border-muted"
          style={{ height: totalHeight }}
        >
          {hourRows.slice(1).map((h, i) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-dashed border-muted/60"
              style={{ top: (i + 1) * ROW_HEIGHT_PX }}
            />
          ))}
          {nowPx !== null && (
            <div
              className="absolute left-0 right-0 z-10 border-t-2 border-primary/60"
              style={{ top: nowPx }}
            >
              <span className="absolute -top-2 -left-1 h-2 w-2 rounded-full bg-primary" />
              <span className="absolute -top-2.5 left-2 rounded bg-primary px-1 py-0.5 text-[9px] font-medium tabular-nums text-white">
                {nowLabel}
              </span>
            </div>
          )}
          {placed.map(
            ({ offering: c, parsed, session, mode, topPx, heightPx }) => {
              const compact = heightPx < 80;
              const timeLabel = fmtTimeRange(parsed) || c.schedule || "";
              const isCancelled = mode === "cancelled";
              return (
                <Link
                  key={c.id}
                  href={`/courses/${c.id}/schedule`}
                  aria-label={`${c.courseName} 강의 스케줄로 이동`}
                  className={cn(
                    "absolute block overflow-hidden rounded-2xl border border-l-4 bg-card p-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer",
                    MODE_BORDER[mode],
                    isCancelled && "opacity-70",
                  )}
                  style={{ top: topPx, height: Math.max(heightPx, 64), ...laneStyle(`c-${c.id}`) }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p
                          className={cn(
                            "truncate text-sm font-semibold",
                            isCancelled && "line-through text-muted-foreground",
                          )}
                        >
                          {c.courseName}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            MODE_BADGE[mode],
                          )}
                        >
                          {CLASS_SESSION_MODE_LABELS[mode]}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {timeLabel}
                        {c.professor && ` · ${c.professor}`}
                        {c.classroom && ` · ${c.classroom}`}
                      </p>
                      {!compact && session?.notes && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                          📝 {session.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {session?.link && !isCancelled && (
                        <a
                          href={session.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/5"
                        >
                          입장 <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                </Link>
              );
            },
          )}
          {placedActivities.map(({ activity, progress, topPx, heightPx, isLeader, mode }) => {
            const compact = heightPx < 80;
            const typePath = ACTIVITY_TYPE_PATH[activity.type];
            const timeLabel =
              progress.startTime && progress.endTime
                ? `${progress.startTime}~${progress.endTime}`
                : progress.startTime || "";
            return (
              <Link
                key={progress.id}
                href={`/activities/${typePath}/${activity.id}`}
                aria-label={`${activity.title} ${progress.week}주차 활동으로 이동`}
                className={cn(
                  "absolute block overflow-hidden rounded-2xl border border-l-4 bg-card p-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cat-5/40 cursor-pointer",
                  ACTIVITY_MODE_BORDER[mode],
                )}
                style={{ top: topPx, height: Math.max(heightPx, 64), ...laneStyle(`a-${progress.id}`) }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="shrink-0 rounded bg-cat-5/10 px-1.5 py-0.5 text-[10px] font-medium text-cat-5">
                        {ACTIVITY_TYPE_LABEL[activity.type]} · {progress.week}주차
                      </span>
                      <p className="truncate text-sm font-semibold">
                        {activity.title}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          ACTIVITY_MODE_BADGE[mode],
                        )}
                      >
                        {ACTIVITY_PROGRESS_MODE_LABELS[mode]}
                      </span>
                      {isLeader && (
                        <span className="shrink-0 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                          운영진
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {timeLabel}
                      {progress.title && ` · ${progress.title}`}
                    </p>
                    {!compact && progress.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {progress.description}
                      </p>
                    )}
                  </div>
                  <Users size={14} className="shrink-0 text-cat-5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <div className="mt-4 rounded-lg border border-dashed bg-muted/30 p-3 text-xs">
          <p className="font-medium text-muted-foreground">
            시간 미정 ({undated.length}개)
          </p>
          <ul className="mt-1.5 space-y-1">
            {undated.map(({ offering }) => (
              <li
                key={offering.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {offering.courseName}
                  {offering.professor && (
                    <span className="ml-1 text-muted-foreground">
                      · {offering.professor}
                    </span>
                  )}
                  {offering.schedule && (
                    <span className="ml-1 text-muted-foreground">
                      ({offering.schedule})
                    </span>
                  )}
                </span>
                <Link
                  href={`/courses/${offering.id}/schedule`}
                  className="shrink-0 text-primary hover:underline"
                >
                  스케줄 →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

    </>
  );
}
