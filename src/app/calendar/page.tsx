"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  seminarsApi,
  activitiesApi,
  courseEnrollmentsApi,
  courseOfferingsApi,
  classSessionsApi,
} from "@/lib/bkend";
import { getComputedStatus } from "@/lib/seminar-utils";
import type { Seminar, Activity, CourseOffering, ClassSession } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Users, BookOpen, Presentation, Globe, GraduationCap, CornerDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
import { parseSchedule, fmtMin } from "@/lib/courseSchedule";
import { inferCurrentSemester } from "@/lib/semester";
import { usePageHeader } from "@/features/site-settings/useSiteContent";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  location?: string;
  type: "seminar" | "project" | "study" | "external" | "course";
  status: string;
  href: string;
};

const TYPE_CONFIG: Record<CalendarEvent["type"], { label: string; color: string; icon: React.ElementType }> = {
  seminar: { label: "세미나", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Presentation },
  project: { label: "프로젝트", color: "bg-green-100 text-green-700 border-green-200", icon: Users },
  study: { label: "스터디", color: "bg-purple-100 text-purple-700 border-purple-200", icon: BookOpen },
  external: { label: "대외활동", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Globe },
  course: { label: "수업", color: "bg-cyan-100 text-cyan-700 border-cyan-200", icon: GraduationCap },
};

const PUBLIC_FILTER_OPTIONS: { value: CalendarEvent["type"] | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "seminar", label: "세미나" },
  { value: "project", label: "프로젝트" },
  { value: "study", label: "스터디" },
  { value: "external", label: "대외활동" },
];

// 회원 로그인 시 사용 — "수업" 토글 추가
const MEMBER_FILTER_OPTIONS: { value: CalendarEvent["type"] | "all"; label: string }[] = [
  ...PUBLIC_FILTER_OPTIONS,
  { value: "course", label: "수업" },
];

// 표시할 카테고리 (다중 선택). localStorage로 개인 설정 영속화.
const CAT_STORAGE_KEY = "calendar.visibleCategories";
const ALL_CATS: CalendarEvent["type"][] = ["seminar", "project", "study", "external", "course"];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type WeekBar = {
  event: CalendarEvent;
  startCol: number;
  span: number;
  lane: number;
  isStart: boolean;
  isEnd: boolean;
};

function buildWeekBars(week: { firstDateStr: string; lastDateStr: string }, events: CalendarEvent[]): WeekBar[] {
  type Raw = Omit<WeekBar, "lane">;
  const rawBars: Raw[] = [];
  const [wy, wm, wd] = week.firstDateStr.split("-").map(Number);
  const weekStartDate = new Date(wy, wm - 1, wd);
  const DAY = 24 * 60 * 60 * 1000;

  for (const e of events) {
    const eStart = e.date;
    const eEnd = e.endDate ?? e.date;
    if (eEnd < week.firstDateStr || eStart > week.lastDateStr) continue;
    const clippedStart = eStart < week.firstDateStr ? week.firstDateStr : eStart;
    const clippedEnd = eEnd > week.lastDateStr ? week.lastDateStr : eEnd;
    const [cy, cm, cd] = clippedStart.split("-").map(Number);
    const [cey, cem, ced] = clippedEnd.split("-").map(Number);
    const startCol = Math.round((new Date(cy, cm - 1, cd).getTime() - weekStartDate.getTime()) / DAY);
    const endCol = Math.round((new Date(cey, cem - 1, ced).getTime() - weekStartDate.getTime()) / DAY);
    rawBars.push({
      event: e,
      startCol: Math.max(0, startCol),
      span: Math.max(1, Math.min(6, endCol) - Math.max(0, startCol) + 1),
      isStart: eStart === clippedStart,
      isEnd: eEnd === clippedEnd,
    });
  }
  rawBars.sort((a, b) => a.startCol - b.startCol || b.span - a.span || a.event.id.localeCompare(b.event.id));

  const laneEnds: number[] = [];
  const bars: WeekBar[] = [];
  for (const rb of rawBars) {
    let lane = -1;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] < rb.startCol) {
        lane = i;
        break;
      }
    }
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(rb.startCol + rb.span - 1);
    } else {
      laneEnds[lane] = rb.startCol + rb.span - 1;
    }
    bars.push({ ...rb, lane });
  }
  return bars;
}

export default function CalendarPage() {
  const { user } = useAuthStore();
  const header = usePageHeader("calendar", {
    title: "학술 캘린더",
    description: "세미나, 프로젝트, 스터디, 대외활동 일정을 한눈에 확인하세요.",
  });
  const userId = user?.id;
  const isLoggedIn = !!userId;

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // 표시 카테고리 다중 선택 (Set). 기본값: 전체 ON
  const [visibleCats, setVisibleCats] = useState<Set<CalendarEvent["type"]>>(
    () => new Set(ALL_CATS),
  );
  const [viewMode, setViewMode] = useState<"month" | "list">("month");

  // 사용자별 카테고리 설정 영속화
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CAT_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as string[];
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((v): v is CalendarEvent["type"] =>
          ALL_CATS.includes(v as CalendarEvent["type"]),
        );
        setVisibleCats(new Set(valid));
      }
    } catch {}
  }, []);

  const toggleCat = (cat: CalendarEvent["type"]) => {
    setVisibleCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      try {
        localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const setAllCats = (on: boolean) => {
    const next = on ? new Set(ALL_CATS) : new Set<CalendarEvent["type"]>();
    setVisibleCats(next);
    try {
      localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {}
  };

  const {
    data: seminars = [],
    isLoading: seminarsLoading,
    error: seminarsError,
  } = useQuery({
    queryKey: ["seminars"],
    queryFn: async () => {
      const res = await seminarsApi.list({ limit: 200 });
      return res.data as unknown as Seminar[];
    },
  });

  const {
    data: activities = [],
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useQuery({
    queryKey: ["activities-all"],
    queryFn: async () => {
      const res = await activitiesApi.list();
      return res.data as unknown as Activity[];
    },
  });

  const isInitialLoading = seminarsLoading || activitiesLoading;
  const loadError = seminarsError || activitiesError;

  // ── 수강과목 (로그인 사용자만) ──
  const { year: semYear, semester } = inferCurrentSemester(new Date());
  const term: "spring" | "fall" = semester === "first" ? "spring" : "fall";

  const { data: enrollmentsRes } = useQuery({
    queryKey: ["my-enrollments", userId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      return await courseEnrollmentsApi.listByUser(userId);
    },
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5,
  });

  const myCourseIds = useMemo(
    () =>
      (enrollmentsRes?.data ?? [])
        .filter((e) => e.year === semYear && e.term === term)
        .map((e) => e.courseOfferingId),
    [enrollmentsRes, semYear, term],
  );

  const { data: offeringsRes } = useQuery({
    queryKey: ["course-offerings", semYear, term],
    queryFn: () => courseOfferingsApi.listBySemester(semYear, term),
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5,
  });

  const myOfferings: CourseOffering[] = useMemo(
    () => (offeringsRes?.data ?? []).filter((o) => myCourseIds.includes(o.id)),
    [offeringsRes, myCourseIds],
  );

  // 현재 월의 class_sessions 일괄 조회 (mode 오버라이드용)
  const { data: courseSessionsRes } = useQuery({
    // prefix 통일: invalidate({queryKey:["class-sessions"]}) 시 함께 무효화되도록
    queryKey: ["class-sessions", "by-courses", myCourseIds],
    queryFn: () => classSessionsApi.listByCourses(myCourseIds),
    enabled: isLoggedIn && myCourseIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  const sessionByDateCourse = useMemo(() => {
    const map = new Map<string, ClassSession>();
    for (const s of (courseSessionsRes?.data ?? []) as ClassSession[]) {
      map.set(`${s.date}__${s.courseOfferingId}`, s);
    }
    return map;
  }, [courseSessionsRes]);

  // 현재 보이는 month 의 평일들에 대해 수업 이벤트 생성
  const courseEvents: CalendarEvent[] = useMemo(() => {
    if (!isLoggedIn || myOfferings.length === 0) return [];
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const lastDate = new Date(y, m + 1, 0).getDate();
    const result: CalendarEvent[] = [];
    for (let d = 1; d <= lastDate; d++) {
      const dt = new Date(y, m, d);
      const dayIdx = dt.getDay();
      const dateStr = toDateStr(dt);
      for (const o of myOfferings) {
        const parsed = parseSchedule(o.schedule);
        if (!parsed.weekdays.includes(dayIdx)) continue;
        const session = sessionByDateCourse.get(`${dateStr}__${o.id}`);
        // 휴강은 캘린더에서 숨김
        if (session?.mode === "cancelled") continue;
        const timeLabel =
          parsed.startMin !== null && parsed.endMin !== null
            ? `${fmtMin(parsed.startMin)}~${fmtMin(parsed.endMin)}`
            : undefined;
        result.push({
          id: `course-${o.id}-${dateStr}`,
          title: o.courseName,
          date: dateStr,
          time: timeLabel,
          location: o.classroom,
          type: "course",
          status: session?.mode ?? "scheduled",
          href: `/courses/${o.id}/schedule`,
        });
      }
    }
    return result;
  }, [isLoggedIn, myOfferings, currentMonth, sessionByDateCourse]);

  const events: CalendarEvent[] = useMemo(() => {
    const result: CalendarEvent[] = [];
    for (const s of seminars) {
      if (!s.date) continue;
      result.push({
        id: s.id,
        title: s.title,
        date: s.date.slice(0, 10),
        time: s.time,
        location: s.location,
        type: "seminar",
        status: getComputedStatus(s),
        href: `/seminars/${s.id}`,
      });
    }
    // Sprint 76d: 라우트 폴더는 복수형(studies/projects), 활동 type 은 단수(study/project) — 매핑 필요
    const ACTIVITY_ROUTE_PATH: Record<string, string> = {
      study: "studies",
      project: "projects",
      external: "external",
    };
    for (const a of activities) {
      if (!a.date) continue;
      const routePath = ACTIVITY_ROUTE_PATH[a.type] ?? a.type;
      result.push({
        id: a.id,
        title: a.title,
        date: a.date.slice(0, 10),
        endDate: a.endDate?.slice(0, 10),
        location: a.location,
        type: a.type as CalendarEvent["type"],
        status: a.status,
        href: `/activities/${routePath}/${a.id}`,
      });
    }
    result.push(...courseEvents);
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [seminars, activities, courseEvents]);

  const filteredEvents = useMemo(
    () => events.filter((e) => visibleCats.has(e.type)),
    [events, visibleCats],
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const today = new Date();
  const todayStr = toDateStr(today);

  // 주 단위 그리드: 각 주는 7개의 칸과 그 위에 이어지는 이벤트 바를 가진다.
  const weeks = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    type Cell = { day: number; dateStr: string; inMonth: boolean; isToday: boolean };
    const flatCells: Cell[] = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const dateStr = toDateStr(d);
      flatCells.push({ day: d.getDate(), dateStr, inMonth: false, isToday: dateStr === todayStr });
    }
    for (let d = 1; d <= lastDate; d++) {
      const dt = new Date(year, month, d);
      const dateStr = toDateStr(dt);
      flatCells.push({ day: d, dateStr, inMonth: true, isToday: dateStr === todayStr });
    }
    let trailing = 1;
    while (flatCells.length % 7 !== 0) {
      const dt = new Date(year, month + 1, trailing);
      const dateStr = toDateStr(dt);
      flatCells.push({ day: dt.getDate(), dateStr, inMonth: false, isToday: dateStr === todayStr });
      trailing += 1;
    }

    const weeksArr: { cells: Cell[]; firstDateStr: string; lastDateStr: string; bars: WeekBar[] }[] = [];
    for (let i = 0; i < flatCells.length; i += 7) {
      const cells = flatCells.slice(i, i + 7);
      const firstDateStr = cells[0].dateStr;
      const lastDateStr = cells[6].dateStr;
      const bars = buildWeekBars({ firstDateStr, lastDateStr }, filteredEvents);
      weeksArr.push({ cells, firstDateStr, lastDateStr, bars });
    }
    return weeksArr;
  }, [year, month, filteredEvents, todayStr]);

  // 선택 날짜의 이벤트 (해당 날짜 범위 포함 이벤트)
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [] as CalendarEvent[];
    return filteredEvents.filter((e) => {
      const end = e.endDate ?? e.date;
      return e.date <= selectedDate && selectedDate <= end;
    });
  }, [filteredEvents, selectedDate]);

  // 리스트 뷰용: 이번 달 이벤트 (시작일 기준)
  const monthEvents = useMemo(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    return filteredEvents.filter((e) => e.date.startsWith(monthStr));
  }, [filteredEvents, year, month]);

  const ongoingEvents = useMemo(() => {
    return filteredEvents.filter((e) => {
      if (e.type === "seminar") return e.status === "ongoing";
      const end = e.endDate ?? e.date;
      return e.date <= todayStr && todayStr <= end;
    });
  }, [filteredEvents, todayStr]);

  const upcomingEvents = useMemo(
    () => filteredEvents.filter((e) => e.date > todayStr).slice(0, 8),
    [filteredEvents, todayStr],
  );

  const isThisMonth =
    today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar size={24} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{header.title}</h1>
            <p className="text-sm text-muted-foreground">{header.description}</p>
          </div>
        </div>

        {/* 표시 카테고리 토글 + 뷰 모드 */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="이벤트 카테고리 필터"
          >
            <span className="text-[11px] font-medium text-muted-foreground">표시:</span>
            {(isLoggedIn ? MEMBER_FILTER_OPTIONS : PUBLIC_FILTER_OPTIONS)
              .filter((opt) => opt.value !== "all")
              .map((opt) => {
                const cat = opt.value as CalendarEvent["type"];
                const active = visibleCats.has(cat);
                const config = TYPE_CONFIG[cat];
                const Icon = config.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleCat(cat)}
                    aria-pressed={active}
                    aria-label={`${opt.label} ${active ? "표시 중" : "숨김"}, 클릭하여 토글`}
                    className={cn(
                      "flex min-h-[32px] items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      active
                        ? cn(config.color, "border-transparent shadow-sm")
                        : cn(
                            config.color,
                            "border-current/20 bg-background opacity-50 hover:opacity-80",
                          ),
                    )}
                  >
                    <Icon size={12} aria-hidden="true" />
                    {opt.label}
                  </button>
                );
              })}
            <button
              type="button"
              onClick={() => setAllCats(visibleCats.size < ALL_CATS.length)}
              className="ml-1 rounded-md px-1.5 py-1 text-[11px] text-primary hover:underline"
            >
              {visibleCats.size < ALL_CATS.length ? "모두 켜기" : "모두 끄기"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!isThisMonth && (
              <button
                type="button"
                onClick={() => {
                  setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDate(null);
                }}
                className="rounded-md border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                aria-label="오늘이 포함된 달로 이동"
              >
                오늘
              </button>
            )}
            <div
              className="flex gap-1 rounded-lg border p-0.5"
              role="group"
              aria-label="캘린더 뷰 모드"
            >
              <button
                type="button"
                onClick={() => setViewMode("month")}
                aria-pressed={viewMode === "month"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                월간
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                목록
              </button>
            </div>
          </div>
        </div>

        {/* 캘린더 본체 */}
        <div className="mt-3 rounded-xl border bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setCurrentMonth(new Date(year, month - 1, 1)); setSelectedDate(null); }}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold">
              {year}년 {month + 1}월
            </h2>
            <button
              onClick={() => { setCurrentMonth(new Date(year, month + 1, 1)); setSelectedDate(null); }}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {isInitialLoading ? (
            <div
              className="mt-4 space-y-2"
              aria-busy="true"
              aria-label="캘린더 일정을 불러오는 중"
            >
              <Skeleton className="h-8 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : loadError ? (
            <p
              className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              ⚠ 일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </p>
          ) : viewMode === "month" ? (
            <>
              {/* 요일 헤더 */}
              <div className="mt-4 grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
                {WEEKDAYS.map((w, idx) => (
                  <div
                    key={w}
                    className={cn(
                      "py-2",
                      idx === 0 && "text-rose-500",
                      idx === 6 && "text-blue-500",
                    )}
                    aria-hidden="true"
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* 주 단위 그리드 — 각 주는 이어지는 이벤트 바를 오버레이로 표시 */}
              <div className="flex flex-col divide-y">
                {weeks.map((week, wi) => {
                  const laneCount = week.bars.reduce((max, b) => Math.max(max, b.lane + 1), 0);
                  // 날짜 숫자 헤더 행: 36px 고정 (h-9). 바는 이 영역 아래 별도 zone에서만 그려짐.
                  const HEADER_H = 36;
                  const BAR_ROW = 22;
                  const BARS_AREA_MIN = 80; // 본문 영역 최소 높이
                  const barsAreaH = Math.max(BARS_AREA_MIN, laneCount * BAR_ROW + 8);
                  const weekMinHeight = HEADER_H + barsAreaH;

                  return (
                    <div
                      key={wi}
                      className="relative"
                      style={{ minHeight: `${weekMinHeight}px` }}
                    >
                      {/* 날짜 숫자 헤더 행 (고정 높이) */}
                      <div
                        className="grid grid-cols-7"
                        style={{ height: `${HEADER_H}px` }}
                      >
                        {week.cells.map((cell, di) => {
                          const isSelected = cell.dateStr === selectedDate;
                          const dow = di % 7;
                          return (
                            <div
                              key={`h-${di}`}
                              className={cn(
                                "flex items-center px-1 sm:px-2",
                                !cell.inMonth && "bg-muted/10",
                                isSelected && "bg-primary/5",
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                                  cell.isToday
                                    ? "bg-primary font-bold text-primary-foreground"
                                    : "",
                                  !cell.inMonth && "text-muted-foreground/40",
                                  cell.inMonth && !cell.isToday && dow === 0 && "text-rose-500",
                                  cell.inMonth && !cell.isToday && dow === 6 && "text-blue-500",
                                )}
                              >
                                {cell.day}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* 바 zone — 헤더 아래 별도 영역 (바는 이 div 안에서만 absolute 배치) */}
                      <div
                        className="relative grid grid-cols-7"
                        style={{ minHeight: `${barsAreaH}px` }}
                      >
                        {/* 클릭 영역 (셀 버튼) */}
                        {week.cells.map((cell, di) => {
                          const isSelected = cell.dateStr === selectedDate;
                          const dayCount = filteredEvents.filter((ev) => {
                            const end = ev.endDate ?? ev.date;
                            return ev.date <= cell.dateStr && cell.dateStr <= end;
                          }).length;
                          return (
                            <button
                              key={`b-${di}`}
                              type="button"
                              onClick={() => setSelectedDate(isSelected ? null : cell.dateStr)}
                              aria-label={`${cell.day}일${cell.isToday ? ", 오늘" : ""}${dayCount > 0 ? `, 일정 ${dayCount}건` : ""}${isSelected ? ", 선택됨" : ""}`}
                              aria-pressed={isSelected}
                              className={cn(
                                "border-r border-border/40 transition-colors last:border-r-0 hover:bg-muted/20",
                                !cell.inMonth && "bg-muted/10",
                                isSelected && "ring-2 ring-primary ring-inset",
                              )}
                            />
                          );
                        })}

                        {/* 이어지는 이벤트 바 오버레이 (헤더 아래 zone에서만, 날짜와 결코 겹치지 않음) */}
                        {week.bars.map((bar, bi) => {
                          const config = TYPE_CONFIG[bar.event.type];
                          // Sprint 76d: ↳ 텍스트 제거 — CornerDownRight 아이콘 한 번만 표시
                          const continuationLabel = bar.event.title;
                          return (
                            <Link
                              key={`${bar.event.id}-${wi}-${bi}`}
                              href={bar.event.href}
                              onClick={(ev) => ev.stopPropagation()}
                              title={bar.event.title}
                              aria-label={`${TYPE_CONFIG[bar.event.type].label}: ${bar.event.title}${bar.isStart ? "" : " (이어짐)"}`}
                              className={cn(
                                "absolute z-10 flex items-center gap-0.5 truncate border text-[10px] font-medium leading-tight transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-primary sm:text-[11px]",
                                config.color,
                                bar.isStart ? "rounded-l pl-1.5" : "pl-1",
                                bar.isEnd ? "rounded-r pr-1.5" : "pr-1",
                              )}
                              style={{
                                left: `calc(${(bar.startCol / 7) * 100}% + 2px)`,
                                width: `calc(${(bar.span / 7) * 100}% - 4px)`,
                                top: `${4 + bar.lane * BAR_ROW}px`,
                                height: "18px",
                              }}
                            >
                              {!bar.isStart && (
                                <CornerDownRight
                                  size={10}
                                  className="shrink-0 opacity-70"
                                  aria-hidden="true"
                                />
                              )}
                              <span className="truncate">{continuationLabel}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedEvents.length > 0 && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <h3 className="text-sm font-semibold">{selectedDate} 일정</h3>
                  {selectedEvents.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 space-y-2">
              {monthEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">이번 달 일정이 없습니다.</p>
                  {!isThisMonth && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                        setSelectedDate(null);
                      }}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      오늘이 포함된 달로 이동
                    </button>
                  )}
                </div>
              ) : (
                monthEvents.map((e) => <EventCard key={e.id} event={e} />)
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">진행중인 학술활동</h3>
            {ongoingEvents.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">진행 중인 활동이 없습니다.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {ongoingEvents.map((e) => (
                  <CompactEventRow key={e.id} event={e} />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">다가오는 일정</h3>
            {upcomingEvents.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">예정된 일정이 없습니다.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {upcomingEvents.map((e) => (
                  <CompactEventRow key={e.id} event={e} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const config = TYPE_CONFIG[event.type];
  const Icon = config.icon;
  return (
    <Link
      href={event.href}
      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
    >
      <div className={cn("mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg", config.color)}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-[11px] sm:text-xs", config.color)}>
            {config.label}
          </Badge>
        </div>
        <p className="mt-1 text-sm font-medium">{event.title}</p>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {event.time && (
            <span className="flex items-center gap-1">
              <Clock size={12} /> {event.time}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {event.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function CompactEventRow({ event }: { event: CalendarEvent }) {
  const config = TYPE_CONFIG[event.type];
  const dateLabel = event.endDate && event.endDate !== event.date ? `${event.date} ~ ${event.endDate}` : event.date;
  return (
    <Link
      href={event.href}
      className="block rounded-lg p-2 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className={cn("text-[11px] sm:text-xs", config.color)}>
          {config.label}
        </Badge>
        <span className="text-[11px] text-muted-foreground sm:text-xs">{dateLabel}</span>
      </div>
      <p className="mt-1 text-sm font-medium leading-tight">{event.title}</p>
    </Link>
  );
}
