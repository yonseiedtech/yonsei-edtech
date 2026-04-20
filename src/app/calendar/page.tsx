"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { seminarsApi, activitiesApi } from "@/lib/bkend";
import { getComputedStatus } from "@/lib/seminar-utils";
import type { Seminar, Activity } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Users, BookOpen, Presentation, Globe } from "lucide-react";
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

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">학술 캘린더</h1>
            <p className="text-sm text-muted-foreground">세미나, 프로젝트, 스터디, 대외활동 일정을 한눈에 확인하세요.</p>
          </div>
        </div>

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

        {/* 범례 */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {Object.entries(TYPE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className={cn("flex h-5 w-5 items-center justify-center rounded text-[10px]", config.color)}>
                  <Icon size={12} />
                </div>
                <span className="text-xs text-muted-foreground">{config.label}</span>
              </div>
            );
          })}
        </div>

        {/* 캘린더 본체 */}
        <div className="mt-3 rounded-xl border bg-white p-4 sm:p-6">
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
              <div className="mt-4 grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-2">{w}</div>
                ))}
              </div>

              {/* 주 단위 그리드 — 각 주는 이어지는 이벤트 바를 오버레이로 표시 */}
              <div className="flex flex-col divide-y">
                {weeks.map((week, wi) => {
                  const laneCount = week.bars.reduce((max, b) => Math.max(max, b.lane + 1), 0);
                  const BASE = 96;
                  const BAR_ROW = 20;
                  const weekMinHeight = BASE + laneCount * BAR_ROW;
                  const BAR_TOP_OFFSET = 30; // 날짜 숫자 아래 여유

                  return (
                    <div
                      key={wi}
                      className="relative grid grid-cols-7"
                      style={{ minHeight: `${weekMinHeight}px` }}
                    >
                      {week.cells.map((cell, di) => {
                        const isSelected = cell.dateStr === selectedDate;
                        return (
                          <button
                            key={di}
                            onClick={() => setSelectedDate(isSelected ? null : cell.dateStr)}
                            className={cn(
                              "relative border-r border-border/40 p-1 text-left transition-colors last:border-r-0 hover:bg-muted/20 sm:p-2",
                              !cell.inMonth && "bg-muted/10",
                              isSelected && "ring-2 ring-primary ring-inset z-10",
                            )}
                          >
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                                cell.isToday && "bg-primary font-bold text-white",
                                !cell.inMonth && "text-muted-foreground/40",
                              )}
                            >
                              {cell.day}
                            </span>
                          </button>
                        );
                      })}

                      {/* 이어지는 이벤트 바 오버레이 */}
                      {week.bars.map((bar, bi) => {
                        const config = TYPE_CONFIG[bar.event.type];
                        return (
                          <Link
                            key={`${bar.event.id}-${wi}-${bi}`}
                            href={bar.event.href}
                            onClick={(ev) => ev.stopPropagation()}
                            title={bar.event.title}
                            className={cn(
                              "absolute z-20 flex items-center truncate border text-[10px] font-medium leading-tight transition-opacity hover:opacity-80",
                              config.color,
                              bar.isStart ? "rounded-l pl-1.5" : "pl-1",
                              bar.isEnd ? "rounded-r pr-1.5" : "pr-1",
                            )}
                            style={{
                              left: `calc(${(bar.startCol / 7) * 100}% + 2px)`,
                              width: `calc(${(bar.span / 7) * 100}% - 4px)`,
                              top: `${BAR_TOP_OFFSET + bar.lane * BAR_ROW}px`,
                              height: "18px",
                            }}
                          >
                            {bar.isStart ? bar.event.title : "\u00A0"}
                          </Link>
                        );
                      })}
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
                <p className="py-8 text-center text-sm text-muted-foreground">이번 달 일정이 없습니다.</p>
              ) : (
                monthEvents.map((e) => <EventCard key={e.id} event={e} />)
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-4">
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

          <div className="rounded-xl border bg-white p-4">
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

function CompactEventRow({ event }: { event: CalendarEvent }) {
  const config = TYPE_CONFIG[event.type];
  const dateLabel = event.endDate && event.endDate !== event.date ? `${event.date} ~ ${event.endDate}` : event.date;
  return (
    <Link
      href={event.href}
      className="block rounded-lg p-2 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className={cn("text-[10px]", config.color)}>
          {config.label}
        </Badge>
        <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
      </div>
      <p className="mt-0.5 text-xs font-medium leading-tight">{event.title}</p>
    </Link>
  );
}
