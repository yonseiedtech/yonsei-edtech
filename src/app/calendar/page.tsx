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
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Clock,
  Users,
  BookOpen,
  Presentation,
  Globe,
  GraduationCap,
  CornerDownRight,
  AlertCircle,
  CalendarDays,
  Hourglass,
  CalendarClock,
  List,
  LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/auth-store";
import { parseSchedule, fmtMin } from "@/lib/courseSchedule";
import { inferCurrentSemester } from "@/lib/semester";
import { usePageHeader } from "@/features/site-settings/useSiteContent";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import InlineNotification from "@/components/ui/inline-notification";

// ─── 상수 ──────────────────────────────────────────────────────────────────
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// ─── 타입 ──────────────────────────────────────────────────────────────────
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

// ─── 6색 프리셋 — ROADMAP_COLOR_PRESETS (blue·emerald·amber·rose·purple·slate) ──
const TYPE_CONFIG: Record<
  CalendarEvent["type"],
  { label: string; barBg: string; barText: string; barBorder: string; iconBg: string; iconText: string; icon: React.ElementType }
> = {
  seminar: {
    label: "세미나",
    barBg: "bg-blue-100 dark:bg-blue-900/50",
    barText: "text-blue-800 dark:text-blue-200",
    barBorder: "border-blue-300 dark:border-blue-700",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    iconText: "text-blue-700 dark:text-blue-300",
    icon: Presentation,
  },
  project: {
    label: "프로젝트",
    barBg: "bg-emerald-100 dark:bg-emerald-900/50",
    barText: "text-emerald-800 dark:text-emerald-200",
    barBorder: "border-emerald-300 dark:border-emerald-700",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconText: "text-emerald-700 dark:text-emerald-300",
    icon: Users,
  },
  study: {
    label: "스터디",
    barBg: "bg-purple-100 dark:bg-purple-900/50",
    barText: "text-purple-800 dark:text-purple-200",
    barBorder: "border-purple-300 dark:border-purple-700",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    iconText: "text-purple-700 dark:text-purple-300",
    icon: BookOpen,
  },
  external: {
    label: "대외활동",
    barBg: "bg-amber-100 dark:bg-amber-900/50",
    barText: "text-amber-800 dark:text-amber-200",
    barBorder: "border-amber-300 dark:border-amber-700",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconText: "text-amber-700 dark:text-amber-300",
    icon: Globe,
  },
  course: {
    label: "수업",
    barBg: "bg-slate-100 dark:bg-slate-800/60",
    barText: "text-slate-700 dark:text-slate-300",
    barBorder: "border-slate-300 dark:border-slate-600",
    iconBg: "bg-slate-100 dark:bg-slate-800/50",
    iconText: "text-slate-600 dark:text-slate-400",
    icon: GraduationCap,
  },
};

// 카테고리 필터 뱃지용 컬러 (active 상태)
const CAT_ACTIVE_CLASS: Record<CalendarEvent["type"], string> = {
  seminar:  "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700",
  project:  "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700",
  study:    "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700",
  external: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700",
  course:   "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600",
};

const PUBLIC_FILTER_OPTIONS: { value: CalendarEvent["type"] | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "seminar", label: "세미나" },
  { value: "project", label: "프로젝트" },
  { value: "study", label: "스터디" },
  { value: "external", label: "대외활동" },
];

const MEMBER_FILTER_OPTIONS: { value: CalendarEvent["type"] | "all"; label: string }[] = [
  ...PUBLIC_FILTER_OPTIONS,
  { value: "course", label: "수업" },
];

const CAT_STORAGE_KEY = "calendar.visibleCategories";
const ALL_CATS: CalendarEvent["type"][] = ["seminar", "project", "study", "external", "course"];

// ─── 유틸 ──────────────────────────────────────────────────────────────────
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── 주 단위 바 레이아웃 ───────────────────────────────────────────────────
type WeekBar = {
  event: CalendarEvent;
  startCol: number;
  span: number;
  lane: number;
  isStart: boolean;
  isEnd: boolean;
};

function buildWeekBars(
  week: { firstDateStr: string; lastDateStr: string },
  events: CalendarEvent[],
): WeekBar[] {
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
    const startCol = Math.round(
      (new Date(cy, cm - 1, cd).getTime() - weekStartDate.getTime()) / DAY,
    );
    const endCol = Math.round(
      (new Date(cey, cem - 1, ced).getTime() - weekStartDate.getTime()) / DAY,
    );
    rawBars.push({
      event: e,
      startCol: Math.max(0, startCol),
      span: Math.max(1, Math.min(6, endCol) - Math.max(0, startCol) + 1),
      isStart: eStart === clippedStart,
      isEnd: eEnd === clippedEnd,
    });
  }
  rawBars.sort(
    (a, b) =>
      a.startCol - b.startCol ||
      b.span - a.span ||
      a.event.id.localeCompare(b.event.id),
  );

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

// ─── 페이지 ────────────────────────────────────────────────────────────────
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
  const [visibleCats, setVisibleCats] = useState<Set<CalendarEvent["type"]>>(
    () => new Set(ALL_CATS),
  );
  const [viewMode, setViewMode] = useState<"month" | "list">("month");

  // 카테고리 설정 영속화
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

  // ── 데이터 페치 ──
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

  const { data: courseSessionsRes } = useQuery({
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

    const weeksArr: {
      cells: Cell[];
      firstDateStr: string;
      lastDateStr: string;
      bars: WeekBar[];
    }[] = [];
    for (let i = 0; i < flatCells.length; i += 7) {
      const cells = flatCells.slice(i, i + 7);
      const firstDateStr = cells[0].dateStr;
      const lastDateStr = cells[6].dateStr;
      const bars = buildWeekBars({ firstDateStr, lastDateStr }, filteredEvents);
      weeksArr.push({ cells, firstDateStr, lastDateStr, bars });
    }
    return weeksArr;
  }, [year, month, filteredEvents, todayStr]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [] as CalendarEvent[];
    return filteredEvents.filter((e) => {
      const end = e.endDate ?? e.date;
      return e.date <= selectedDate && selectedDate <= end;
    });
  }, [filteredEvents, selectedDate]);

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

  // 선택 날짜 포맷 (예: "5월 13일 화요일")
  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "";
    const [sy, sm, sd] = selectedDate.split("-").map(Number);
    const dt = new Date(sy, sm - 1, sd);
    return `${sm}월 ${sd}일 ${WEEKDAYS[dt.getDay()]}요일`;
  }, [selectedDate]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-4xl px-4">

        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={Calendar}
          title={header.title}
          description={header.description}
        />

        <Separator className="mt-6" />

        {/* ── 카테고리 필터 + 뷰 모드 ── */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {/* 카테고리 토글 */}
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="이벤트 카테고리 필터"
          >
            <span className="text-[11px] font-medium text-muted-foreground mr-0.5">표시:</span>
            {(isLoggedIn ? MEMBER_FILTER_OPTIONS : PUBLIC_FILTER_OPTIONS)
              .filter((opt) => opt.value !== "all")
              .map((opt) => {
                const cat = opt.value as CalendarEvent["type"];
                const active = visibleCats.has(cat);
                const Icon = TYPE_CONFIG[cat].icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleCat(cat)}
                    aria-pressed={active}
                    aria-label={`${opt.label} ${active ? "표시 중" : "숨김"}, 클릭하여 토글`}
                    className={cn(
                      "inline-flex min-h-[32px] items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? cn(CAT_ACTIVE_CLASS[cat], "shadow-sm")
                        : "border-border bg-background text-muted-foreground opacity-50 hover:opacity-75",
                    )}
                  >
                    <Icon size={11} aria-hidden="true" className="shrink-0" />
                    {opt.label}
                  </button>
                );
              })}
            <button
              type="button"
              onClick={() => setAllCats(visibleCats.size < ALL_CATS.length)}
              className="ml-0.5 rounded-md px-1.5 py-1 text-[11px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {visibleCats.size < ALL_CATS.length ? "모두 켜기" : "모두 끄기"}
            </button>
          </div>

          {/* 오늘 + 뷰 모드 */}
          <div className="flex items-center gap-2">
            {!isThisMonth && (
              <button
                type="button"
                onClick={() => {
                  setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDate(null);
                }}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="오늘이 포함된 달로 이동"
              >
                오늘
              </button>
            )}
            <div
              className="inline-flex rounded-lg border bg-muted/40 p-0.5 shadow-sm"
              role="group"
              aria-label="캘린더 뷰 모드"
            >
              <button
                type="button"
                onClick={() => setViewMode("month")}
                aria-pressed={viewMode === "month"}
                aria-label="월간 캘린더 보기"
                className={cn(
                  "rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  viewMode === "month"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                aria-label="목록 보기"
                className={cn(
                  "rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* ── 캘린더 본체 ── */}
        <div className="mt-3 rounded-2xl border bg-card shadow-sm">
          {/* 월 내비게이션 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => {
                setCurrentMonth(new Date(year, month - 1, 1));
                setSelectedDate(null);
              }}
              aria-label="이전 달"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <h2 className="text-base font-bold tracking-tight sm:text-lg">
              {year}년 {month + 1}월
            </h2>
            <button
              type="button"
              onClick={() => {
                setCurrentMonth(new Date(year, month + 1, 1));
                setSelectedDate(null);
              }}
              aria-label="다음 달"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <Separator />

          {/* 캘린더 본문 */}
          <div className="p-3 sm:p-4">
            {isInitialLoading ? (
              <CalendarSkeleton />
            ) : loadError ? (
              <div className="py-4">
                <InlineNotification
                  kind="error"
                  title="일정을 불러오지 못했습니다"
                  description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
                  action={
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="text-xs font-medium underline underline-offset-2"
                    >
                      다시 시도
                    </button>
                  }
                />
              </div>
            ) : viewMode === "month" ? (
              <>
                {/* 요일 헤더 */}
                <div
                  className="grid grid-cols-7 border-b text-center text-[11px] font-semibold text-muted-foreground sm:text-xs"
                  aria-hidden="true"
                >
                  {WEEKDAYS.map((w, idx) => (
                    <div
                      key={w}
                      className={cn(
                        "py-2",
                        idx === 0 && "text-rose-500 dark:text-rose-400",
                        idx === 6 && "text-blue-500 dark:text-blue-400",
                      )}
                    >
                      {w}
                    </div>
                  ))}
                </div>

                {/* 주 단위 그리드 */}
                <div className="flex flex-col divide-y divide-border/60">
                  {weeks.map((week, wi) => {
                    const laneCount = week.bars.reduce(
                      (max, b) => Math.max(max, b.lane + 1),
                      0,
                    );
                    const HEADER_H = 36;
                    const BAR_ROW = 22;
                    const BARS_AREA_MIN = 80;
                    const barsAreaH = Math.max(
                      BARS_AREA_MIN,
                      laneCount * BAR_ROW + 8,
                    );
                    const weekMinHeight = HEADER_H + barsAreaH;

                    return (
                      <div
                        key={wi}
                        className="relative"
                        style={{ minHeight: `${weekMinHeight}px` }}
                      >
                        {/* 날짜 숫자 헤더 행 */}
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
                                  !cell.inMonth && "bg-muted/20",
                                  isSelected && "bg-primary/5",
                                )}
                              >
                                <span
                                  className={cn(
                                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                                    cell.isToday
                                      ? "bg-primary font-bold text-primary-foreground"
                                      : "",
                                    !cell.inMonth && "text-muted-foreground/30",
                                    cell.inMonth &&
                                      !cell.isToday &&
                                      dow === 0 &&
                                      "text-rose-500 dark:text-rose-400",
                                    cell.inMonth &&
                                      !cell.isToday &&
                                      dow === 6 &&
                                      "text-blue-500 dark:text-blue-400",
                                  )}
                                >
                                  {cell.day}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* 바 zone */}
                        <div
                          className="relative grid grid-cols-7"
                          style={{ minHeight: `${barsAreaH}px` }}
                        >
                          {/* 클릭 영역 */}
                          {week.cells.map((cell, di) => {
                            const isSelected = cell.dateStr === selectedDate;
                            const dayCount = filteredEvents.filter((ev) => {
                              const end = ev.endDate ?? ev.date;
                              return (
                                ev.date <= cell.dateStr &&
                                cell.dateStr <= end
                              );
                            }).length;
                            return (
                              <button
                                key={`b-${di}`}
                                type="button"
                                onClick={() =>
                                  setSelectedDate(
                                    isSelected ? null : cell.dateStr,
                                  )
                                }
                                aria-label={`${cell.day}일${cell.isToday ? ", 오늘" : ""}${dayCount > 0 ? `, 일정 ${dayCount}건` : ""}${isSelected ? ", 선택됨" : ""}`}
                                aria-pressed={isSelected}
                                className={cn(
                                  "border-r border-border/30 transition-colors last:border-r-0 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                                  !cell.inMonth && "bg-muted/10",
                                  isSelected && "bg-primary/5 ring-2 ring-primary ring-inset",
                                )}
                              />
                            );
                          })}

                          {/* 이벤트 바 오버레이 */}
                          {week.bars.map((bar, bi) => {
                            const config = TYPE_CONFIG[bar.event.type];
                            return (
                              <Link
                                key={`${bar.event.id}-${wi}-${bi}`}
                                href={bar.event.href}
                                onClick={(ev) => ev.stopPropagation()}
                                title={bar.event.title}
                                aria-label={`${config.label}: ${bar.event.title}${bar.isStart ? "" : " (이어짐)"}`}
                                className={cn(
                                  "absolute z-10 flex items-center gap-0.5 truncate border text-[10px] font-medium leading-tight transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-[11px]",
                                  config.barBg,
                                  config.barText,
                                  config.barBorder,
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
                                    className="shrink-0 opacity-60"
                                    aria-hidden="true"
                                  />
                                )}
                                <span className="truncate">{bar.event.title}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 선택 날짜 이벤트 패널 */}
                {selectedDate && (
                  <div className="mt-4 border-t pt-4">
                    <h3 className="mb-2 text-sm font-semibold text-foreground">
                      {selectedDateLabel}
                    </h3>
                    {selectedEvents.length === 0 ? (
                      <EmptyState
                        icon={CalendarDays}
                        title="이 날 일정이 없습니다"
                        description="카테고리 필터를 확인하거나 다른 날짜를 선택해 보세요."
                        compact
                      />
                    ) : (
                      <div className="space-y-2">
                        {selectedEvents.map((e) => (
                          <EventCard key={e.id} event={e} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* 목록 뷰 */
              <div className="space-y-2 pt-1">
                {monthEvents.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="이번 달 일정이 없습니다"
                    description={
                      !isThisMonth
                        ? "오늘이 포함된 달로 이동하면 현재 일정을 확인할 수 있습니다."
                        : "세미나, 프로젝트, 스터디 일정이 등록되면 여기에 표시됩니다."
                    }
                    actions={
                      !isThisMonth
                        ? [
                            {
                              label: "오늘이 포함된 달로 이동",
                              onClick: () => {
                                setCurrentMonth(
                                  new Date(today.getFullYear(), today.getMonth(), 1),
                                );
                                setSelectedDate(null);
                              },
                              variant: "outline",
                            },
                          ]
                        : []
                    }
                  />
                ) : (
                  monthEvents.map((e) => <EventCard key={e.id} event={e} />)
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 하단 위젯 패널 ── */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* 진행중인 학술활동 */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Hourglass
                size={16}
                className="shrink-0 text-primary"
                aria-hidden="true"
              />
              <h3 className="text-sm font-bold text-foreground">
                진행중인 학술활동
              </h3>
            </div>
            <div className="mt-3">
              {ongoingEvents.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="진행 중인 활동이 없습니다"
                  compact
                />
              ) : (
                <div className="space-y-1.5">
                  {ongoingEvents.map((e) => (
                    <CompactEventRow key={e.id} event={e} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 다가오는 일정 */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarClock
                size={16}
                className="shrink-0 text-primary"
                aria-hidden="true"
              />
              <h3 className="text-sm font-bold text-foreground">
                다가오는 일정
              </h3>
            </div>
            <div className="mt-3">
              {upcomingEvents.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="예정된 일정이 없습니다"
                  compact
                />
              ) : (
                <div className="space-y-1.5">
                  {upcomingEvents.map((e) => (
                    <CompactEventRow key={e.id} event={e} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 이벤트 카드 (선택 날짜 / 목록 뷰) ──────────────────────────────────────
function EventCard({ event }: { event: CalendarEvent }) {
  const config = TYPE_CONFIG[event.type];
  const Icon = config.icon;
  return (
    <Link
      href={event.href}
      className="group flex items-start gap-3 rounded-2xl border bg-background p-3 transition-all hover:border-border hover:bg-muted/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          config.iconBg,
          config.iconText,
        )}
        aria-hidden="true"
      >
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:text-[11px]",
              config.iconBg,
              config.iconText,
              config.barBorder,
            )}
          >
            {config.label}
          </span>
          {event.endDate && event.endDate !== event.date && (
            <span className="text-[10px] text-muted-foreground">
              ~ {event.endDate.slice(5).replace("-", "/")}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
          {event.title}
        </p>
        {(event.time || event.location) && (
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {event.time && (
              <span className="flex items-center gap-1">
                <Clock size={11} aria-hidden="true" />
                {event.time}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} aria-hidden="true" />
                {event.location}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── 컴팩트 이벤트 행 (하단 패널용) ─────────────────────────────────────────
function CompactEventRow({ event }: { event: CalendarEvent }) {
  const config = TYPE_CONFIG[event.type];
  const Icon = config.icon;
  const dateLabel =
    event.endDate && event.endDate !== event.date
      ? `${event.date.slice(5).replace("-", "/")} ~ ${event.endDate.slice(5).replace("-", "/")}`
      : event.date.slice(5).replace("-", "/");
  return (
    <Link
      href={event.href}
      className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          config.iconBg,
          config.iconText,
        )}
        aria-hidden="true"
      >
        <Icon size={12} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-foreground group-hover:text-primary transition-colors">
          {event.title}
        </p>
        <p className="text-[10px] text-muted-foreground tabular-nums">{dateLabel}</p>
      </div>
    </Link>
  );
}

// ─── 로딩 스켈레톤 ────────────────────────────────────────────────────────
function CalendarSkeleton() {
  return (
    <div aria-busy="true" aria-label="캘린더 일정을 불러오는 중">
      {/* 요일 헤더 스켈레톤 */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2 flex justify-center">
            <Skeleton className="h-3 w-4 rounded" />
          </div>
        ))}
      </div>
      {/* 주 행 스켈레톤 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b py-3 px-1">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="h-6 w-6 rounded-full mx-auto" />
            ))}
          </div>
          <div className="mt-2 space-y-1.5">
            <Skeleton className="h-[18px] w-3/4 rounded" />
            {i % 2 === 0 && <Skeleton className="h-[18px] w-1/2 rounded" />}
          </div>
        </div>
      ))}
    </div>
  );
}
