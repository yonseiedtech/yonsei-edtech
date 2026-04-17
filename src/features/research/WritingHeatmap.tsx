"use client";

import { useMemo, useState, useCallback } from "react";
import type { WritingPaperHistory } from "@/types";
import { computeDailyActivity } from "@/lib/research-stats";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Props {
  history: WritingPaperHistory[];
}

const ROWS = 7;

type PeriodType = "year" | "spring" | "fall";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function levelColor(count: number): string {
  if (count <= 0) return "#ebedf0";
  if (count <= 1) return "#9be9a8";
  if (count <= 3) return "#40c463";
  if (count <= 5) return "#30a14e";
  return "#216e39";
}

function levelLabel(count: number): string {
  if (count <= 0) return "0";
  if (count <= 1) return "1";
  if (count <= 3) return "2~3";
  if (count <= 5) return "4~5";
  return "6+";
}

function periodRange(periodType: PeriodType, baseYear: number): { start: Date; end: Date } {
  const s = new Date(baseYear, 0, 1);
  const e = new Date(baseYear, 11, 31);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);

  if (periodType === "spring") {
    s.setMonth(2, 1);
    e.setFullYear(baseYear + 1, 1, 28);
    const leap = new Date(baseYear + 1, 1, 29).getMonth() === 1;
    if (leap) e.setDate(29);
  } else if (periodType === "fall") {
    s.setMonth(8, 1);
    e.setFullYear(baseYear + 1, 7, 31);
  }
  return { start: s, end: e };
}

function periodLabel(periodType: PeriodType, baseYear: number): string {
  if (periodType === "spring") return `${baseYear} 전기 (3월~)`;
  if (periodType === "fall") return `${baseYear} 후기 (9월~)`;
  return `${baseYear}년`;
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: "year", label: "연도별" },
  { value: "spring", label: "전기 (3월)" },
  { value: "fall", label: "후기 (9월)" },
];

export default function WritingHeatmap({ history }: Props) {
  const dailyMap = useMemo(() => computeDailyActivity(history), [history]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const currentYear = today.getFullYear();

  const [draftYear, setDraftYear] = useState(currentYear);
  const [draftPeriod, setDraftPeriod] = useState<PeriodType>("year");

  const [activeYear, setActiveYear] = useState(currentYear);
  const [activePeriod, setActivePeriod] = useState<PeriodType>("year");

  const handleSearch = useCallback(() => {
    setActiveYear(draftYear);
    setActivePeriod(draftPeriod);
  }, [draftYear, draftPeriod]);

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => periodRange(activePeriod, activeYear),
    [activePeriod, activeYear],
  );

  const startWeekday = rangeStart.getDay();

  const dayLabels = useMemo(() => {
    return Array.from({ length: ROWS }, (_, i) => {
      const idx = (startWeekday + i) % 7;
      return i % 2 === 0 ? DAY_NAMES[idx] : "";
    });
  }, [startWeekday]);

  const cells = useMemo(() => {
    const totalDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.ceil(totalDays / ROWS);

    const out: Array<{ key: string; date: Date | null; count: number; lastSavedAt?: string }> = [];

    for (let week = 0; week < weeks; week++) {
      for (let row = 0; row < ROWS; row++) {
        const dayIndex = week * ROWS + row;
        if (dayIndex >= totalDays) {
          out.push({ key: `${week}-${row}`, date: null, count: 0 });
          continue;
        }

        const d = new Date(rangeStart);
        d.setDate(rangeStart.getDate() + dayIndex);

        if (d > today) {
          out.push({ key: `${week}-${row}`, date: null, count: 0 });
          continue;
        }

        const key = ymd(d);
        const found = dailyMap.get(key);
        out.push({
          key: `${week}-${row}`,
          date: d,
          count: found?.count ?? 0,
          lastSavedAt: found?.lastSavedAt,
        });
      }
    }
    return { cells: out, weeks };
  }, [today, rangeStart, rangeEnd, dailyMap]);

  const totalActiveDays = useMemo(() => {
    let n = 0;
    for (const c of cells.cells) {
      if (c.date && c.count > 0) n += 1;
    }
    return n;
  }, [cells]);

  const weeks = cells.weeks;
  const cellData = cells.cells;

  const monthMarkers = useMemo(() => {
    const arr: Array<{ week: number; label: string }> = [];
    let lastMonth = -1;
    for (let week = 0; week < weeks; week++) {
      const cell = cellData[week * ROWS];
      if (!cell?.date) continue;
      const m = cell.date.getMonth();
      if (m !== lastMonth) {
        arr.push({ week, label: MONTH_LABELS[m] });
        lastMonth = m;
      }
    }
    return arr;
  }, [cellData, weeks]);

  const maxYear = activePeriod === "year" ? currentYear : currentYear;

  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setDraftYear((y) => y - 1); setActiveYear((y) => y - 1); }}
              className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="이전"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[5rem] text-center text-sm font-semibold tabular-nums">
              {periodLabel(activePeriod, activeYear)}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = Math.min(draftYear + 1, maxYear);
                setDraftYear(next);
                setActiveYear(next);
              }}
              disabled={activeYear >= maxYear}
              className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              aria-label="다음"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <select
              value={draftPeriod}
              onChange={(e) => setDraftPeriod(e.target.value as PeriodType)}
              className="h-7 rounded-md border bg-white px-2 text-xs"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSearch}
              className="flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Search size={12} />
              조회
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            활동일 <span className="font-medium text-foreground">{totalActiveDays}일</span>
          </p>
        </div>
        <div className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:flex">
          <span>적음</span>
          {[0, 1, 3, 5, 7].map((c) => (
            <span
              key={c}
              className="inline-block size-2.5 rounded-[2px]"
              style={{ background: levelColor(c) }}
              aria-hidden
            />
          ))}
          <span>많음</span>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="inline-flex min-w-max flex-col gap-1">
          <div className="relative ml-6 h-3" style={{ width: weeks * 14 }}>
            {monthMarkers.map((m) => (
              <span
                key={`${m.week}-${m.label}`}
                className="absolute text-[10px] text-muted-foreground"
                style={{ left: m.week * 14 }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <div className="flex flex-col gap-[2px] pr-1 text-[9px] text-muted-foreground">
              {dayLabels.map((d, i) => (
                <span key={i} className="h-3 leading-3">{d}</span>
              ))}
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${weeks}, 12px)`,
                gridTemplateRows: `repeat(${ROWS}, 12px)`,
                gridAutoFlow: "column",
                gap: 2,
              }}
            >
              {cellData.map((c) => (
                <div
                  key={c.key}
                  title={
                    c.date
                      ? `${ymd(c.date)} · ${c.count}회 저장${c.lastSavedAt ? ` · 마지막 ${c.lastSavedAt.slice(11, 16)}` : ""}`
                      : ""
                  }
                  className="rounded-[2px]"
                  style={{
                    width: 12,
                    height: 12,
                    background: c.date ? levelColor(c.count) : "transparent",
                  }}
                  aria-label={c.date ? `${ymd(c.date)} ${levelLabel(c.count)}회` : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
