"use client";

import { useMemo, useState } from "react";
import type { Seminar } from "@/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface MiniCalendarProps {
  seminars: Seminar[];
}

export default function MiniCalendar({ seminars }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { days, seminarDates } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // 이전 달 빈 칸 + 이번 달 날짜
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= lastDate; d++) days.push(d);

    // 세미나 날짜 set
    const seminarDates = new Map<string, Seminar[]>();
    for (const s of seminars) {
      const d = s.date?.slice(0, 10);
      if (!d) continue;
      const [sy, sm] = d.split("-").map(Number);
      if (sy === year && sm === month + 1) {
        if (!seminarDates.has(d)) seminarDates.set(d, []);
        seminarDates.get(d)!.push(s);
      }
    }

    return { days, seminarDates };
  }, [currentMonth, seminars]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedSeminars = selectedDate ? seminarDates.get(selectedDate) ?? [] : [];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }
  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  function makeDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="이전 달"
        >
          &lt;
        </button>
        <span className="text-sm font-semibold">
          {year}년 {month + 1}월
        </span>
        <button
          onClick={nextMonth}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="다음 달"
        >
          &gt;
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 text-center text-sm">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = makeDateStr(day);
          const hasSeminar = seminarDates.has(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={day}
              onClick={() => hasSeminar && setSelectedDate(isSelected ? null : dateStr)}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors",
                isToday && "font-bold text-primary",
                isSelected && "bg-primary text-white",
                hasSeminar && !isSelected && "hover:bg-muted",
                !hasSeminar && "cursor-default text-muted-foreground/70"
              )}
            >
              {day}
              {hasSeminar && (
                <span
                  className={cn(
                    "absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                    isSelected ? "bg-card" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜의 세미나 */}
      {selectedSeminars.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t pt-3">
          {selectedSeminars.map((s) => (
            <a
              key={s.id}
              href={`/seminars/${s.id}`}
              className="block rounded-lg bg-primary/5 px-3 py-2 text-xs transition-colors hover:bg-primary/10"
            >
              <p className="font-medium">{s.title}</p>
              <p className="mt-0.5 text-muted-foreground">
                {s.time} · {s.location}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
