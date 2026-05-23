"use client";

/**
 * WeeklyGrid — 주간 타임라인 그리드.
 * `DailyClassTimelineWidget` 에서 분할 (Phase B 단순 추출 — 기능 변경 X).
 */

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { fmtTimeRange } from "@/lib/courseSchedule";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_MODE_BORDER,
  ACTIVITY_TYPE_LABEL,
  ACTIVITY_TYPE_PATH,
  DAY_CHARS,
  MODE_BORDER,
  ROW_HEIGHT_PX,
  ymd,
  type PlacedActivity,
  type PlacedClass,
} from "./types";

export function WeeklyGrid({
  placedWeekly,
  placedWeeklyActivities,
  hourRows,
  totalHeight,
  actualToday,
  nowPx,
  nowLabel,
  onResetSession,
}: {
  placedWeekly: Array<{ date: Date; dayIndex: number; items: PlacedClass[] }>;
  placedWeeklyActivities: Map<string, PlacedActivity[]>;
  hourRows: number[];
  totalHeight: number;
  actualToday: string;
  nowPx: number | null;
  nowLabel: string;
  onResetSession?: (sessionId: string, label: string) => void;
}) {
  const hasAny =
    placedWeekly.some((d) => d.items.length > 0) ||
    Array.from(placedWeeklyActivities.values()).some((arr) => arr.length > 0);
  return (
    <>
      <div className="mt-4 overflow-x-auto">
        <div
          className="grid min-w-[640px] gap-0"
          style={{ gridTemplateColumns: `44px repeat(${placedWeekly.length}, 1fr)` }}
        >
          {/* 헤더 행 */}
          <div />
          {placedWeekly.map(({ date, dayIndex }) => {
            const isToday = ymd(date) === actualToday;
            return (
              <div
                key={ymd(date)}
                className={cn(
                  "border-l border-muted px-2 pb-2 text-center text-[11px]",
                  isToday ? "font-bold text-primary" : "text-muted-foreground",
                )}
              >
                <div>{DAY_CHARS[dayIndex]}</div>
                <div className="text-[10px]">
                  {date.getMonth() + 1}/{date.getDate()}
                </div>
              </div>
            );
          })}

          {/* 시간 라벨 컬럼 */}
          <div className="relative" style={{ height: totalHeight }}>
            {hourRows.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-2 text-[11px] font-medium text-muted-foreground"
                style={{ top: i * ROW_HEIGHT_PX }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* 요일 컬럼들 */}
          {placedWeekly.map(({ date, items }) => {
            const isToday = ymd(date) === actualToday;
            const dayActivities = placedWeeklyActivities.get(ymd(date)) ?? [];
            return (
              <div
                key={ymd(date)}
                className={cn(
                  "relative border-l border-muted",
                  isToday && "bg-primary/[0.02]",
                )}
                style={{ height: totalHeight }}
              >
                {/* 시간 가이드 라인 */}
                {hourRows.slice(1).map((h, i) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-dashed border-muted/60"
                    style={{ top: (i + 1) * ROW_HEIGHT_PX }}
                  />
                ))}
                {/* 오늘 컬럼에만 NOW 라인 */}
                {isToday && nowPx !== null && (
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
                {/* 카드들 */}
                {items.map(({ offering: c, parsed, session, mode, topPx, heightPx }) => {
                  const isCancelled = mode === "cancelled";
                  const timeLabel = fmtTimeRange(parsed);
                  // 변경 기록이 있고 기본(in_person)이 아닐 때 — 1클릭 복원 버튼 노출
                  const hasOverride = session && session.mode !== "in_person";
                  return (
                    <div
                      key={c.id}
                      className="absolute left-1 right-1"
                      style={{ top: topPx, height: Math.max(heightPx, 40) }}
                    >
                      <Link
                        href={`/courses/${c.id}/schedule`}
                        className={cn(
                          "block h-full overflow-hidden rounded-md border border-l-4 bg-card p-1.5 text-[10px] shadow-sm transition-shadow hover:shadow",
                          MODE_BORDER[mode],
                          isCancelled && "opacity-60",
                        )}
                      >
                        <p
                          className={cn(
                            "truncate text-[11px] font-semibold leading-tight",
                            isCancelled && "line-through text-muted-foreground",
                          )}
                        >
                          {c.courseName}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {timeLabel}
                        </p>
                        {c.classroom && (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {c.classroom}
                          </p>
                        )}
                      </Link>
                      {hasOverride && session && onResetSession && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onResetSession(
                              session.id,
                              `${c.courseName} ${session.date}`,
                            );
                          }}
                          aria-label="변경 기록 삭제 (대면으로 복원)"
                          title="변경 기록 삭제 — 기본 대면으로 복원"
                          className="absolute right-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-card/95 text-amber-700 shadow-sm hover:bg-amber-50"
                        >
                          <RotateCcw size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {/* 학술활동 진행현황 카드 */}
                {dayActivities.map(({ activity, progress, topPx, heightPx, isLeader, mode }) => {
                  const typePath = ACTIVITY_TYPE_PATH[activity.type];
                  return (
                    <Link
                      key={progress.id}
                      href={`/activities/${typePath}/${activity.id}`}
                      className={cn(
                        "absolute left-1 right-1 overflow-hidden rounded-md border border-l-4 bg-card p-1.5 text-[10px] shadow-sm transition-shadow hover:shadow",
                        ACTIVITY_MODE_BORDER[mode],
                      )}
                      style={{ top: topPx, height: Math.max(heightPx, 40) }}
                    >
                      <div className="flex items-center gap-1">
                        <span className="shrink-0 rounded bg-violet-100 px-1 py-0 text-[9px] font-medium text-violet-700">
                          {ACTIVITY_TYPE_LABEL[activity.type][0]}{progress.week}
                        </span>
                        {isLeader && (
                          <span className="shrink-0 rounded bg-amber-100 px-1 py-0 text-[9px] font-medium text-amber-700">
                            운영
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] font-semibold leading-tight">
                        {activity.title}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {progress.startTime}~{progress.endTime}
                      </p>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {!hasAny && (
        <p className="mt-4 text-sm text-muted-foreground">
          이번 주(월~일)에 해당하는 수강과목·학술활동 일정이 없습니다.
        </p>
      )}
    </>
  );
}
