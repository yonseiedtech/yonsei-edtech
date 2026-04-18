"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import type { WritingPaperHistory } from "@/types";
import { computeDailyActivity } from "@/lib/research-stats";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Props {
  history: WritingPaperHistory[];
}

const ROWS = 7;
type PeriodType = "spring" | "fall";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

function periodRange(type: PeriodType, baseYear: number): { start: Date; end: Date } {
  if (type === "spring") {
    const s = new Date(baseYear, 2, 1);
    const endYear = baseYear + 1;
    const leap = new Date(endYear, 1, 29).getMonth() === 1;
    const e = new Date(endYear, 1, leap ? 29 : 28);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return { start: s, end: e };
  }
  const s = new Date(baseYear, 8, 1);
  const e = new Date(baseYear + 1, 7, 31);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return { start: s, end: e };
}

function detectPeriod(d: Date): { type: PeriodType; year: number } {
  const m = d.getMonth();
  if (m >= 2 && m <= 7) return { type: "spring", year: d.getFullYear() };
  if (m >= 8) return { type: "fall", year: d.getFullYear() };
  return { type: "fall", year: d.getFullYear() - 1 };
}

function periodLabel(type: PeriodType, baseYear: number): string {
  if (type === "spring") return `${baseYear} 전기 (3월~)`;
  return `${baseYear} 후기 (9월~)`;
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function formatDateKo(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dow = DAY_NAMES[d.getDay()];
  return `${y}년 ${m}월 ${day}일(${dow})`;
}

interface TooltipData {
  x: number;
  y: number;
  dateStr: string;
  hasWriting: boolean;
  count: number;
}

interface CellData {
  key: string;
  date: Date | null;
  count: number;
  lastSavedAt?: string;
  isToday: boolean;
}

export default function WritingHeatmap({ history }: Props) {
  const dailyMap = useMemo(() => computeDailyActivity(history), [history]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const defaultPeriod = useMemo(() => detectPeriod(today), [today]);

  const [draftYear, setDraftYear] = useState(defaultPeriod.year);
  const [draftPeriod, setDraftPeriod] = useState<PeriodType>(defaultPeriod.type);
  const [activeYear, setActiveYear] = useState(defaultPeriod.year);
  const [activePeriod, setActivePeriod] = useState<PeriodType>(defaultPeriod.type);

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
      if (i === 0) return DAY_NAMES[(startWeekday) % 7];
      if (i === 6) return DAY_NAMES[(startWeekday + 6) % 7];
      return "";
    });
  }, [startWeekday]);

  const cells = useMemo(() => {
    const totalDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.ceil(totalDays / ROWS);

    const out: CellData[] = [];

    for (let week = 0; week < weeks; week++) {
      for (let row = 0; row < ROWS; row++) {
        const dayIndex = week * ROWS + row;

        if (dayIndex >= totalDays) {
          out.push({ key: `${week}-${row}`, date: null, count: 0, isToday: false });
          continue;
        }

        const d = new Date(rangeStart);
        d.setDate(rangeStart.getDate() + dayIndex);
        const isToday = sameDay(d, today);

        if (d > today) {
          out.push({ key: `${week}-${row}`, date: d, count: 0, isToday: false });
          continue;
        }

        const key = ymd(d);
        const found = dailyMap.get(key);
        out.push({
          key: `${week}-${row}`,
          date: d,
          count: found?.count ?? 0,
          lastSavedAt: found?.lastSavedAt,
          isToday,
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

  const handlePrev = useCallback(() => {
    setDraftYear((y) => y - 1);
    setActiveYear((y) => y - 1);
  }, []);

  const handleNext = useCallback(() => {
    setDraftYear((y) => y + 1);
    setActiveYear((y) => y + 1);
  }, []);

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleCellEnter = useCallback((e: React.MouseEvent, c: CellData) => {
    if (!c.date) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const parentRect = gridRef.current?.closest(".overflow-x-auto")?.getBoundingClientRect();
    const baseX = parentRect ? rect.left - parentRect.left + rect.width / 2 : rect.left + rect.width / 2;
    const baseY = parentRect ? rect.top - parentRect.top : rect.top;
    setTooltip({
      x: baseX,
      y: baseY,
      dateStr: formatDateKo(c.date),
      hasWriting: c.count > 0,
      count: c.count,
    });
  }, []);

  const handleCellLeave = useCallback(() => setTooltip(null), []);

  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="이전"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[7rem] text-center text-sm font-semibold tabular-nums">
              {periodLabel(activePeriod, activeYear)}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={activeYear >= defaultPeriod.year && activePeriod === defaultPeriod.type}
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
              <option value="spring">전기 (3월)</option>
              <option value="fall">후기 (9월)</option>
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
        <div className="relative inline-flex min-w-max flex-col gap-1" ref={gridRef}>
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
                  onMouseEnter={(e) => handleCellEnter(e, c)}
                  onMouseLeave={handleCellLeave}
                  className="rounded-[2px]"
                  style={{
                    width: 12,
                    height: 12,
                    background: c.date ? levelColor(c.count) : "transparent",
                    boxShadow: c.isToday ? "inset 0 0 0 1.5px #1e3a5f" : undefined,
                  }}
                  aria-label={c.date ? `${ymd(c.date)} ${levelLabel(c.count)}회` : undefined}
                />
              ))}
            </div>
          </div>

          {tooltip && (
            <div
              className="pointer-events-none absolute z-50 rounded-md border bg-white px-2.5 py-1.5 text-[11px] leading-relaxed shadow-lg"
              style={{ left: tooltip.x, top: tooltip.y - 4, transform: "translate(-50%, -100%)" }}
            >
              <p className="font-semibold text-foreground">{tooltip.dateStr}</p>
              <p className="text-muted-foreground">
                논문 작성 : <span className={tooltip.hasWriting ? "font-bold text-green-600" : "text-muted-foreground"}>{tooltip.hasWriting ? "YES!" : "NO"}</span>
              </p>
              <p className="text-muted-foreground">
                작업 이력 : <span className="font-medium text-foreground">{tooltip.count}건</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
