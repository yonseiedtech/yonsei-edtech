"use client";

import { useMemo } from "react";
import type { WritingPaperHistory } from "@/types";
import { computeDailyActivity } from "@/lib/research-stats";

interface Props {
  history: WritingPaperHistory[];
}

const WEEKS = 53;
const DAYS = 7; // 일~토

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

  // 오늘 기준 마지막 토요일까지 끝맞춤 → 53주 × 7일 = 371칸
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const cells = useMemo(() => {
    // 현재 요일 (0=일, 6=토). 마지막 칸은 오늘.
    const out: Array<{ key: string; date: Date | null; count: number; lastSavedAt?: string }> = [];
    const todayWeekday = today.getDay();
    // 첫 칸 = 오늘 - (52주*7 + todayWeekday)일
    const firstCellOffsetDays = (WEEKS - 1) * DAYS + todayWeekday;
    for (let week = 0; week < WEEKS; week++) {
      for (let day = 0; day < DAYS; day++) {
        const offset = firstCellOffsetDays - (week * DAYS + day);
        if (offset < 0) {
          // 오늘 이후 칸은 비움 (실제로는 이번 주 토요일 미래만 해당)
          out.push({ key: `${week}-${day}`, date: null, count: 0 });
          continue;
        }
        const d = new Date(today);
        d.setDate(today.getDate() - offset);
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
    return out;
  }, [today, dailyMap]);

  const totalActiveDays = useMemo(() => {
    let n = 0;
    for (const c of cells) {
      if (c.date && c.count > 0) n += 1;
    }
    return n;
  }, [cells]);

  // 월 라벨 위치 (각 주의 첫 일자가 새 달이면 표시)
  const monthMarkers = useMemo(() => {
    const arr: Array<{ week: number; label: string }> = [];
    let lastMonth = -1;
    for (let week = 0; week < WEEKS; week++) {
      const cell = cells[week * DAYS]; // 일요일 칸
      if (!cell.date) continue;
      const m = cell.date.getMonth();
      if (m !== lastMonth) {
        arr.push({ week, label: MONTH_LABELS[m] });
        lastMonth = m;
      }
    }
    return arr;
  }, [cells]);

  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">작성 활동 (지난 1년)</h3>
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
          {/* 월 라벨 */}
          <div className="relative ml-6 h-3" style={{ width: WEEKS * 14 }}>
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
            {/* 요일 라벨 */}
            <div className="flex flex-col gap-[2px] pr-1 text-[9px] text-muted-foreground">
              {["일", "", "화", "", "목", "", "토"].map((d, i) => (
                <span key={i} className="h-3 leading-3">{d}</span>
              ))}
            </div>
            {/* 격자 */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${WEEKS}, 12px)`,
                gridTemplateRows: `repeat(${DAYS}, 12px)`,
                gridAutoFlow: "column",
                gap: 2,
              }}
            >
              {cells.map((c) => (
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
