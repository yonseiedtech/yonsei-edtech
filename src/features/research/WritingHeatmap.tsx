"use client";

import { useMemo } from "react";
import type { WritingPaperHistory } from "@/types";
import { computeDailyActivity } from "@/lib/research-stats";

interface Props {
  history: WritingPaperHistory[];
}

const DAYS = 7;

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

const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export default function WritingHeatmap({ history }: Props) {
  const dailyMap = useMemo(() => computeDailyActivity(history), [history]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const year = today.getFullYear();

  const cells = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    jan1.setHours(0, 0, 0, 0);
    const jan1Weekday = jan1.getDay();

    const dec31 = new Date(year, 11, 31);
    dec31.setHours(0, 0, 0, 0);

    const startDate = new Date(jan1);
    startDate.setDate(jan1.getDate() - jan1Weekday);

    const dec31Weekday = dec31.getDay();
    const endDate = new Date(dec31);
    endDate.setDate(dec31.getDate() + (6 - dec31Weekday));

    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.ceil(totalDays / DAYS);

    const out: Array<{ key: string; date: Date | null; count: number; lastSavedAt?: string }> = [];

    for (let week = 0; week < weeks; week++) {
      for (let day = 0; day < DAYS; day++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + week * DAYS + day);

        if (d > today) {
          out.push({ key: `${week}-${day}`, date: null, count: 0 });
          continue;
        }

        const key = ymd(d);
        const found = dailyMap.get(key);
        out.push({
          key: `${week}-${day}`,
          date: d,
          count: found?.count ?? 0,
          lastSavedAt: found?.lastSavedAt,
        });
      }
    }
    return { cells: out, weeks };
  }, [today, year, dailyMap]);

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
      const cell = cellData[week * DAYS];
      if (!cell?.date) continue;
      const m = cell.date.getMonth();
      if (m !== lastMonth) {
        arr.push({ week, label: MONTH_LABELS[m] });
        lastMonth = m;
      }
    }
    return arr;
  }, [cellData, weeks]);

  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{year}년 작성 활동</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            저장 시점 기준 활동일 <span className="font-medium text-foreground">{totalActiveDays}일</span>
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
              {["일", "", "화", "", "목", "", "토"].map((d, i) => (
                <span key={i} className="h-3 leading-3">{d}</span>
              ))}
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${weeks}, 12px)`,
                gridTemplateRows: `repeat(${DAYS}, 12px)`,
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
