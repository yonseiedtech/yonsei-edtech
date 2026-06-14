"use client";

/**
 * MonthlyGrid — 월간 캘린더 (사이클 114, 사용자 요청 — 안 A)
 * 시간표 위젯 월간 뷰. 수업(요일 반복)과 세미나(특정 날짜)를 한 달력에 점으로 표시.
 * 하단에 덩그러니 있던 세미나 캘린더(miniCalendar)를 시간표 영역으로 통합.
 */

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WD = ["일", "월", "화", "수", "목", "금", "토"];

function fmtYmd(y: number, m0: number, d: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface MonthlyGridProps {
  /** 수업이 있는 요일 집합 (0=일 ~ 6=토) — parsedOfferings.parsed.weekdays 플랫 */
  classWeekdays: number[];
  /** 세미나 날짜(YYYY-MM-DD) → 제목 배열 */
  seminarsByDate: Map<string, string[]>;
  /** 오늘 YYYY-MM-DD */
  todayYmd: string;
  /** 날짜 클릭 시 (일간 전환 등) */
  onPickDate?: (ymd: string) => void;
}

export function MonthlyGrid({
  classWeekdays,
  seminarsByDate,
  todayYmd,
  onPickDate,
}: MonthlyGridProps) {
  const [ty, tm] = todayYmd.split("-").map(Number);
  const [cur, setCur] = useState({ y: ty, m: tm - 1 }); // m: 0-based

  const classWd = useMemo(() => new Set(classWeekdays), [classWeekdays]);

  const cells = useMemo(() => {
    const startWd = new Date(cur.y, cur.m, 1).getDay();
    const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
    const out: { ymd: string; day: number; inMonth: boolean; wd: number }[] = [];
    // 앞 패딩 (이전 달 말일들)
    for (let i = 0; i < startWd; i++) {
      const d = new Date(cur.y, cur.m, 1 - (startWd - i));
      out.push({
        ymd: fmtYmd(d.getFullYear(), d.getMonth(), d.getDate()),
        day: d.getDate(),
        inMonth: false,
        wd: d.getDay(),
      });
    }
    // 이번 달
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({
        ymd: fmtYmd(cur.y, cur.m, d),
        day: d,
        inMonth: true,
        wd: new Date(cur.y, cur.m, d).getDay(),
      });
    }
    // 뒤 패딩 (다음 달 초)
    const trailing = (7 - (out.length % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      const d = new Date(cur.y, cur.m + 1, i);
      out.push({
        ymd: fmtYmd(d.getFullYear(), d.getMonth(), d.getDate()),
        day: i,
        inMonth: false,
        wd: d.getDay(),
      });
    }
    return out;
  }, [cur]);

  const monthLabel = `${cur.y}년 ${cur.m + 1}월`;

  function shift(delta: number) {
    setCur((c) => {
      const nm = c.m + delta;
      return { y: c.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  }

  return (
    <div className="mt-3">
      {/* 월 네비 */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
          aria-label="이전 달"
        >
          <ChevronLeft size={15} />
        </button>
        <p className="text-sm font-semibold">{monthLabel}</p>
        <button
          type="button"
          onClick={() => shift(1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
          aria-label="다음 달"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
        {WD.map((w, i) => (
          <div key={w} className={cn(i === 0 && "text-rose-500", i === 6 && "text-blue-500")}>
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const hasClass = c.inMonth && classWd.has(c.wd);
          const seminars = seminarsByDate.get(c.ymd);
          const isToday = c.ymd === todayYmd;
          const interactive = !!onPickDate && c.inMonth;
          return (
            <button
              key={c.ymd}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onPickDate?.(c.ymd)}
              title={seminars && seminars.length > 0 ? seminars.join(", ") : undefined}
              className={cn(
                "flex min-h-[42px] flex-col items-center rounded-lg border p-1 text-[11px] transition-colors",
                c.inMonth ? "bg-card" : "bg-muted/20 text-muted-foreground/50",
                isToday && "border-primary ring-1 ring-primary/40",
                interactive && "hover:bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "font-medium",
                  c.wd === 0 && c.inMonth && "text-rose-500",
                  c.wd === 6 && c.inMonth && "text-blue-500",
                  isToday && "text-primary",
                )}
              >
                {c.day}
              </span>
              <span className="mt-auto flex items-center gap-0.5 pt-1">
                {hasClass && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" title="수업" />
                )}
                {seminars && seminars.length > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" title="세미나" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> 수업
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> 세미나
        </span>
      </div>
    </div>
  );
}
