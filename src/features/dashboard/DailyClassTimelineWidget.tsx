"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  courseEnrollmentsApi,
  courseOfferingsApi,
  classSessionsApi,
} from "@/lib/bkend";
import {
  CLASS_SESSION_MODE_LABELS,
  type ClassSession,
  type ClassSessionMode,
  type CourseOffering,
} from "@/types";
import { inferCurrentSemester } from "@/lib/semester";
import {
  parseSchedule,
  fmtTimeRange,
  type ParsedSchedule,
} from "@/lib/courseSchedule";
import { cn } from "@/lib/utils";

const DAY_CHARS = ["일", "월", "화", "수", "목", "금", "토"] as const;
// 주간 그리드는 평일만(월~금)
const WEEK_DAY_INDICES = [1, 2, 3, 4, 5] as const;

const HOUR_START = 17;
const HOUR_END = 23;
const MIN_START = HOUR_START * 60;
const MIN_END = HOUR_END * 60;
const ROW_HEIGHT_PX = 64;

const VIEW_STORAGE_KEY = "dashboard.classTimeline.view";
type ViewMode = "daily" | "weekly";

const MODE_BORDER: Record<ClassSessionMode, string> = {
  in_person: "border-l-emerald-400 bg-emerald-50/40",
  zoom: "border-l-blue-400 bg-blue-50/40",
  assignment: "border-l-amber-400 bg-amber-50/40",
  cancelled: "border-l-rose-400 bg-rose-50/40",
  field: "border-l-purple-400 bg-purple-50/40",
  exam: "border-l-rose-500 bg-rose-50/60",
};

const MODE_BADGE: Record<ClassSessionMode, string> = {
  in_person: "bg-emerald-100 text-emerald-700",
  zoom: "bg-blue-100 text-blue-700",
  assignment: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
  field: "bg-purple-100 text-purple-700",
  exam: "bg-rose-100 text-rose-700",
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function semesterToTerm(semester: "first" | "second"): "spring" | "fall" {
  return semester === "first" ? "spring" : "fall";
}

function pickLatestSession(sessions: ClassSession[]): ClassSession | null {
  if (sessions.length === 0) return null;
  return sessions.reduce((a, b) =>
    new Date(b.updatedAt ?? b.createdAt).getTime() >
    new Date(a.updatedAt ?? a.createdAt).getTime()
      ? b
      : a,
  );
}

interface PlacedClass {
  offering: CourseOffering;
  parsed: ParsedSchedule;
  session: ClassSession | null;
  mode: ClassSessionMode;
  topPx: number;
  heightPx: number;
}

export default function DailyClassTimelineWidget() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const now = new Date();
  const today = ymd(now);
  const todayDayIndex = now.getDay();
  const dayChar = DAY_CHARS[todayDayIndex];
  const { year, semester } = inferCurrentSemester(now);
  const term = semesterToTerm(semester);
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 (${dayChar})`;
  const semesterLabel = `${year}년 ${term === "spring" ? "1학기" : "2학기"}`;

  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "daily" || saved === "weekly") setViewMode(saved);
    } catch {}
  }, []);
  const handleSetView = (v: ViewMode) => {
    setViewMode(v);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch {}
  };

  // 현재 시각 위치 (분 단위)
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowPx =
    nowMin >= MIN_START && nowMin <= MIN_END
      ? ((nowMin - MIN_START) / 60) * ROW_HEIGHT_PX
      : null;

  const { data: enrollmentsRes, isLoading: loadingEnrollments } = useQuery({
    queryKey: ["my-enrollments", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseEnrollmentsApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const courseIds = useMemo(() => {
    return (enrollmentsRes?.data ?? [])
      .filter((e) => e.year === year && e.term === term)
      .map((e) => e.courseOfferingId);
  }, [enrollmentsRes, year, term]);

  const { data: offeringsRes, isLoading: loadingOfferings } = useQuery({
    queryKey: ["course-offerings", year, term],
    queryFn: () => courseOfferingsApi.listBySemester(year, term),
    staleTime: 1000 * 60 * 5,
  });

  const myOfferings: CourseOffering[] = useMemo(() => {
    return (offeringsRes?.data ?? []).filter((o) => courseIds.includes(o.id));
  }, [offeringsRes, courseIds]);

  // 모든 강의 + 파싱 결과
  const parsedOfferings = useMemo(
    () =>
      myOfferings.map((o) => ({ offering: o, parsed: parseSchedule(o.schedule) })),
    [myOfferings],
  );

  // 오늘 요일 강의 (daily 모드)
  const todayOfferings = useMemo(() => {
    return parsedOfferings
      .filter(({ parsed }) => parsed.weekdays.includes(todayDayIndex))
      .sort((a, b) => {
        const sa = a.parsed.startMin ?? Number.POSITIVE_INFINITY;
        const sb = b.parsed.startMin ?? Number.POSITIVE_INFINITY;
        return sa - sb;
      });
  }, [parsedOfferings, todayDayIndex]);

  // 이번 주 월~금 날짜 (weekly 모드)
  const weekDates = useMemo(() => {
    // 일요일 기준 → 월요일을 첫 칸으로
    const monday = new Date(now);
    const dayDiff = (todayDayIndex + 6) % 7; // 월=0, ..., 일=6
    monday.setDate(monday.getDate() - dayDiff);
    return WEEK_DAY_INDICES.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [now, todayDayIndex]);

  const weekStartStr = weekDates.length > 0 ? ymd(weekDates[0]) : today;
  const weekEndStr = weekDates.length > 0 ? ymd(weekDates[weekDates.length - 1]) : today;

  // 오늘 / 주간 모두에서 사용할 class_sessions
  const { data: dailySessionsRes } = useQuery({
    queryKey: ["class-sessions", today],
    queryFn: () => classSessionsApi.listByDate(today),
    staleTime: 1000 * 60,
    enabled: viewMode === "daily" && todayOfferings.length > 0,
  });

  const { data: weeklySessionsRes } = useQuery({
    queryKey: ["class-sessions-range", weekStartStr, weekEndStr],
    queryFn: async () => {
      // listByDate를 평일별로 호출
      const all: ClassSession[] = [];
      for (const d of weekDates) {
        const res = await classSessionsApi.listByDate(ymd(d));
        all.push(...((res?.data ?? []) as ClassSession[]));
      }
      return { data: all };
    },
    staleTime: 1000 * 60,
    enabled: viewMode === "weekly" && parsedOfferings.length > 0,
  });

  const dailySessionsByCourse = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    (dailySessionsRes?.data ?? []).forEach((s) => {
      if (!map.has(s.courseOfferingId)) map.set(s.courseOfferingId, []);
      map.get(s.courseOfferingId)!.push(s);
    });
    return map;
  }, [dailySessionsRes]);

  // weekly: { date(YYYY-MM-DD)+courseId → sessions }
  const weeklySessionsByDateCourse = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    (weeklySessionsRes?.data ?? []).forEach((s: ClassSession) => {
      const key = `${s.date}__${s.courseOfferingId}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [weeklySessionsRes]);

  // daily 배치
  const placedDaily: PlacedClass[] = useMemo(() => {
    const result: PlacedClass[] = [];
    for (const { offering, parsed } of todayOfferings) {
      if (parsed.startMin === null || parsed.endMin === null) continue;
      const s = Math.max(MIN_START, parsed.startMin);
      const e = Math.min(MIN_END, parsed.endMin);
      if (e <= s) continue;
      const session = pickLatestSession(dailySessionsByCourse.get(offering.id) ?? []);
      const mode: ClassSessionMode = session?.mode ?? "in_person";
      result.push({
        offering,
        parsed,
        session,
        mode,
        topPx: ((s - MIN_START) / 60) * ROW_HEIGHT_PX,
        heightPx: ((e - s) / 60) * ROW_HEIGHT_PX,
      });
    }
    return result;
  }, [todayOfferings, dailySessionsByCourse]);

  const undated = useMemo(() => {
    return todayOfferings.filter(
      ({ parsed }) => parsed.startMin === null || parsed.endMin === null,
    );
  }, [todayOfferings]);

  // weekly 배치 — 요일별
  const placedWeekly: Array<{
    date: Date;
    dayIndex: number;
    items: PlacedClass[];
  }> = useMemo(() => {
    return weekDates.map((d) => {
      const dayIdx = d.getDay();
      const dateStr = ymd(d);
      const items: PlacedClass[] = [];
      for (const { offering, parsed } of parsedOfferings) {
        if (!parsed.weekdays.includes(dayIdx)) continue;
        if (parsed.startMin === null || parsed.endMin === null) continue;
        const s = Math.max(MIN_START, parsed.startMin);
        const e = Math.min(MIN_END, parsed.endMin);
        if (e <= s) continue;
        const sessions = weeklySessionsByDateCourse.get(`${dateStr}__${offering.id}`) ?? [];
        const session = pickLatestSession(sessions);
        const mode: ClassSessionMode = session?.mode ?? "in_person";
        items.push({
          offering,
          parsed,
          session,
          mode,
          topPx: ((s - MIN_START) / 60) * ROW_HEIGHT_PX,
          heightPx: ((e - s) / 60) * ROW_HEIGHT_PX,
        });
      }
      return { date: d, dayIndex: dayIdx, items };
    });
  }, [weekDates, parsedOfferings, weeklySessionsByDateCourse]);

  if (!userId) return null;
  const isLoading = loadingEnrollments || loadingOfferings;

  const hourRows = Array.from(
    { length: HOUR_END - HOUR_START + 1 },
    (_, i) => HOUR_START + i,
  );
  const totalHeight = ROW_HEIGHT_PX * (HOUR_END - HOUR_START);

  const headerLabel =
    viewMode === "daily"
      ? `${dateLabel} · ${semesterLabel} · ${HOUR_START}~${HOUR_END}시`
      : `${weekDates[0]?.getMonth() + 1}/${weekDates[0]?.getDate()} ~ ${weekDates[4]?.getMonth() + 1}/${weekDates[4]?.getDate()} · ${semesterLabel}`;

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-primary" />
          <div className="leading-tight">
            <h2 className="font-bold">
              {viewMode === "daily" ? "오늘의 수업" : "이번 주 수업"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{headerLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 일간/주간 토글 */}
          <div className="flex gap-0.5 rounded-lg border p-0.5">
            <button
              onClick={() => handleSetView("daily")}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                viewMode === "daily"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              일간
            </button>
            <button
              onClick={() => handleSetView("weekly")}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                viewMode === "weekly"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              주간
            </button>
          </div>
          <Link
            href="/courses?tab=mine"
            className="text-xs text-muted-foreground hover:text-primary"
          >
            내 수강기록 →
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 h-72 animate-pulse rounded-lg bg-muted" />
      ) : viewMode === "daily" ? (
        todayOfferings.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            오늘({dayChar})에 해당하는 수강과목이 없습니다.
          </p>
        ) : (
          <DailyGrid
            placed={placedDaily}
            undated={undated}
            hourRows={hourRows}
            totalHeight={totalHeight}
            nowPx={nowPx}
          />
        )
      ) : (
        <WeeklyGrid
          placedWeekly={placedWeekly}
          hourRows={hourRows}
          totalHeight={totalHeight}
          todayDayIndex={todayDayIndex}
          nowPx={nowPx}
        />
      )}
    </div>
  );
}

/* ───────────── Daily ───────────── */

function DailyGrid({
  placed,
  undated,
  hourRows,
  totalHeight,
  nowPx,
}: {
  placed: PlacedClass[];
  undated: { offering: CourseOffering; parsed: ParsedSchedule }[];
  hourRows: number[];
  totalHeight: number;
  nowPx: number | null;
}) {
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
              {h}:00
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
              <span className="absolute -top-2.5 left-2 rounded bg-primary px-1 py-0.5 text-[9px] font-medium text-white">
                NOW
              </span>
            </div>
          )}
          {placed.map(
            ({ offering: c, parsed, session, mode, topPx, heightPx }) => {
              const compact = heightPx < 80;
              const timeLabel = fmtTimeRange(parsed) || c.schedule || "";
              const isCancelled = mode === "cancelled";
              return (
                <div
                  key={c.id}
                  className={cn(
                    "absolute left-3 right-3 overflow-hidden rounded-xl border border-l-4 bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
                    MODE_BORDER[mode],
                    isCancelled && "opacity-70",
                  )}
                  style={{ top: topPx, height: Math.max(heightPx, 64) }}
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
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                      {session?.link && !isCancelled && (
                        <a
                          href={session.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/5"
                        >
                          입장 <ExternalLink size={11} />
                        </a>
                      )}
                      <Link
                        href={`/courses/${c.id}/schedule`}
                        className="rounded-md border bg-white px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                      >
                        스케줄
                      </Link>
                    </div>
                  </div>
                </div>
              );
            },
          )}
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

/* ───────────── Weekly ───────────── */

function WeeklyGrid({
  placedWeekly,
  hourRows,
  totalHeight,
  todayDayIndex,
  nowPx,
}: {
  placedWeekly: Array<{ date: Date; dayIndex: number; items: PlacedClass[] }>;
  hourRows: number[];
  totalHeight: number;
  todayDayIndex: number;
  nowPx: number | null;
}) {
  const hasAny = placedWeekly.some((d) => d.items.length > 0);
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
            const isToday = dayIndex === todayDayIndex;
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
          {placedWeekly.map(({ date, dayIndex, items }) => {
            const isToday = dayIndex === todayDayIndex;
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
                  </div>
                )}
                {/* 카드들 */}
                {items.map(({ offering: c, parsed, session, mode, topPx, heightPx }) => {
                  const isCancelled = mode === "cancelled";
                  const timeLabel = fmtTimeRange(parsed);
                  return (
                    <Link
                      key={c.id}
                      href={`/courses/${c.id}/schedule`}
                      className={cn(
                        "absolute left-1 right-1 overflow-hidden rounded-md border border-l-4 bg-white p-1.5 text-[10px] shadow-sm transition-shadow hover:shadow",
                        MODE_BORDER[mode],
                        isCancelled && "opacity-60",
                      )}
                      style={{ top: topPx, height: Math.max(heightPx, 40) }}
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
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {!hasAny && (
        <p className="mt-4 text-sm text-muted-foreground">
          이번 주 평일에 해당하는 수강과목이 없습니다.
        </p>
      )}
    </>
  );
}
