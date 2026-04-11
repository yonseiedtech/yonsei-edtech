"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { seminarsApi, activitiesApi } from "@/lib/bkend";
import { getComputedStatus } from "@/lib/seminar-utils";
import type { Seminar, Activity } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Users, BookOpen, Presentation, FlaskConical, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  location?: string;
  type: "seminar" | "project" | "study" | "external";
  status: string;
  href: string;
};

const TYPE_CONFIG: Record<CalendarEvent["type"], { label: string; color: string; icon: React.ElementType }> = {
  seminar: { label: "세미나", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Presentation },
  project: { label: "프로젝트", color: "bg-green-100 text-green-700 border-green-200", icon: Users },
  study: { label: "스터디", color: "bg-purple-100 text-purple-700 border-purple-200", icon: BookOpen },
  external: { label: "대외활동", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Globe },
};

const FILTER_OPTIONS: { value: CalendarEvent["type"] | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "seminar", label: "세미나" },
  { value: "project", label: "프로젝트" },
  { value: "study", label: "스터디" },
  { value: "external", label: "대외활동" },
];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<CalendarEvent["type"] | "all">("all");
  const [viewMode, setViewMode] = useState<"month" | "list">("month");

  const { data: seminars = [] } = useQuery({
    queryKey: ["seminars"],
    queryFn: async () => {
      const res = await seminarsApi.list({ limit: 200 });
      return res.data as unknown as Seminar[];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities-all"],
    queryFn: async () => {
      const res = await activitiesApi.list();
      return res.data as unknown as Activity[];
    },
  });

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

    for (const a of activities) {
      if (!a.date) continue;
      result.push({
        id: a.id,
        title: a.title,
        date: a.date.slice(0, 10),
        endDate: a.endDate?.slice(0, 10),
        location: a.location,
        type: a.type as CalendarEvent["type"],
        status: a.status,
        href: `/activities/${a.type}/${a.id}`,
      });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [seminars, activities]);

  const filteredEvents = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.type === filter)),
    [events, filter],
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const { days, eventsByDate } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= lastDate; d++) days.push(d);

    const eventsByDate = new Map<string, CalendarEvent[]>();
    for (const e of filteredEvents) {
      const d = e.date;
      const [ey, em] = d.split("-").map(Number);
      if (ey === year && em === month + 1) {
        if (!eventsByDate.has(d)) eventsByDate.set(d, []);
        eventsByDate.get(d)!.push(e);
      }
    }

    return { days, eventsByDate };
  }, [year, month, filteredEvents]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  function makeDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // 리스트 뷰용: 이번 달 이벤트
  const monthEvents = useMemo(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    return filteredEvents.filter((e) => e.date.startsWith(monthStr));
  }, [filteredEvents, year, month]);

  // 다가오는 이벤트 (오늘 이후)
  const upcomingEvents = useMemo(
    () => filteredEvents.filter((e) => e.date >= todayStr).slice(0, 5),
    [filteredEvents, todayStr],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="flex items-center gap-3">
        <Calendar size={28} className="text-primary" />
        <h1 className="text-3xl font-bold">학술 캘린더</h1>
      </div>
      <p className="mt-2 text-muted-foreground">세미나, 프로젝트, 스터디, 대외활동 일정을 한눈에 확인하세요.</p>

      {/* 필터 + 뷰 모드 */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                filter === opt.value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border p-0.5">
          <button
            onClick={() => setViewMode("month")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "month" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted",
            )}
          >
            월간
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted",
            )}
          >
            목록
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* 메인 영역 */}
        <div className="rounded-xl border bg-white p-4 sm:p-6">
          {/* 월 네비게이션 */}
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

          {viewMode === "month" ? (
            <>
              {/* 요일 헤더 */}
              <div className="mt-4 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-2">{w}</div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="grid grid-cols-7 gap-px bg-muted/30">
                {days.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} className="min-h-[80px] bg-white sm:min-h-[100px]" />;
                  const dateStr = makeDateStr(day);
                  const dayEvents = eventsByDate.get(dateStr) ?? [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={cn(
                        "min-h-[80px] bg-white p-1 text-left transition-colors hover:bg-muted/20 sm:min-h-[100px] sm:p-2",
                        isSelected && "ring-2 ring-primary ring-inset",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                          isToday && "bg-primary font-bold text-white",
                        )}
                      >
                        {day}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 3).map((e) => {
                          const config = TYPE_CONFIG[e.type];
                          return (
                            <div
                              key={e.id}
                              className={cn("truncate rounded px-1 py-0.5 text-[10px] font-medium", config.color)}
                            >
                              {e.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}개</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 선택된 날짜 이벤트 */}
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
            /* 리스트 뷰 */
            <div className="mt-4 space-y-2">
              {monthEvents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">이번 달 일정이 없습니다.</p>
              ) : (
                monthEvents.map((e) => <EventCard key={e.id} event={e} />)
              )}
            </div>
          )}
        </div>

        {/* 사이드바 */}
        <div className="space-y-4">
          {/* 오늘 바로가기 */}
          <button
            onClick={() => {
              setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelectedDate(todayStr);
            }}
            className="w-full rounded-xl border bg-white p-4 text-left transition-colors hover:bg-muted/20"
          >
            <div className="text-xs font-medium text-muted-foreground">오늘</div>
            <div className="text-lg font-bold">
              {today.getMonth() + 1}월 {today.getDate()}일 ({WEEKDAYS[today.getDay()]})
            </div>
          </button>

          {/* 범례 */}
          <div className="rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold">범례</h3>
            <div className="mt-2 space-y-1.5">
              {Object.entries(TYPE_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className={cn("flex h-5 w-5 items-center justify-center rounded text-[10px]", config.color)}>
                      <Icon size={12} />
                    </div>
                    <span className="text-xs text-muted-foreground">{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 다가오는 일정 */}
          <div className="rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold">다가오는 일정</h3>
            {upcomingEvents.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">예정된 일정이 없습니다.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {upcomingEvents.map((e) => {
                  const config = TYPE_CONFIG[e.type];
                  return (
                    <Link
                      key={e.id}
                      href={e.href}
                      className="block rounded-lg p-2 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn("text-[10px]", config.color)}>
                          {config.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{e.date}</span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium leading-tight">{e.title}</p>
                    </Link>
                  );
                })}
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
          <Badge variant="outline" className={cn("text-[10px]", config.color)}>
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
