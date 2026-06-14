"use client";

/**
 * HabitTracker — 습관 트래커 매트릭스 컴포넌트
 *
 * 스프레드시트 레이아웃을 그대로 재현:
 *  - 상단 좌: 월 달성 현황 (달성·미달성·달성률 3-stat)
 *  - 상단 중: 일자별 달성 수 area 차트 (SVG 곡선)
 *  - 상단 우: 월 미니 캘린더 (모든 습관 달성일 ring 표시)
 *  - 메인: 습관 × 날짜 매트릭스 표 (체크/미체크, 가로스크롤)
 *  - 우측: 습관별 달성 통계 + 진행 바
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────── types ─────────────────────────── */

export interface HabitDef {
  key: string;
  label: string;
  emoji?: string;
  target?: number; // 목표 횟수(지정 없으면 월 일수 기준)
}

export interface HabitTrackerProps {
  year: number;
  month: number; // 1-12
  habits: HabitDef[];
  /** "YYYY-MM-DD" → 그날 달성한 습관 key 집합 */
  achievedByDay: Map<string, Set<string>>;
}

/* ─────────────────────────────── helpers ────────────────────────── */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdOf(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function todayYmd(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/* smooth bezier path through points */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

/* ─────────────────────────────── sub-components ─────────────────── */

/** 상단 좌: 3-stat 달성 현황 */
function MonthStats({
  achieved,
  missed,
  rate,
}: {
  achieved: number;
  missed: number;
  rate: number;
}) {
  const stats = [
    { label: "달성", value: achieved, color: "text-teal-600 dark:text-teal-400" },
    { label: "미달성", value: missed, color: "text-rose-500 dark:text-rose-400" },
    { label: "달성률", value: `${rate}%`, color: "text-indigo-600 dark:text-indigo-400" },
  ];

  return (
    <div className="flex gap-6 items-end">
      {stats.map((s, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <span className={cn("text-3xl font-extrabold tabular-nums leading-none", s.color)}>
            {s.value}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 상단 중: 일자별 달성 수 area 차트 */
function DailyChart({
  dailyCounts,
  totalDays,
  maxCount,
}: {
  dailyCounts: number[];
  totalDays: number;
  maxCount: number;
}) {
  const W = 220;
  const H = 64;
  const PAD = 4;

  const points = useMemo(() => {
    return dailyCounts.map((count, i) => ({
      x: PAD + (i / Math.max(totalDays - 1, 1)) * (W - PAD * 2),
      y: H - PAD - (count / Math.max(maxCount, 1)) * (H - PAD * 2),
    }));
  }, [dailyCounts, totalDays, maxCount]);

  const linePath = smoothPath(points);
  const areaPath =
    points.length >= 2
      ? `${linePath} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`
      : "";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground font-medium">일자별 달성 수</span>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="habitAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(20,184,166)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(20,184,166)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {areaPath && (
          <path d={areaPath} fill="url(#habitAreaGrad)" />
        )}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="rgb(20,184,166)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* dot on each point */}
        {points.map((p, i) =>
          dailyCounts[i] > 0 ? (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={2.5}
              fill="rgb(20,184,166)"
              stroke="white"
              strokeWidth={1}
            />
          ) : null,
        )}
      </svg>
      <div className="flex justify-between text-[9px] text-muted-foreground/60">
        <span>1일</span>
        <span>{totalDays}일</span>
      </div>
    </div>
  );
}

/** 상단 우: 미니 캘린더 */
function MiniCalendar({
  year,
  month,
  totalDays,
  firstDow,
  allAchievedDays,
}: {
  year: number;
  month: number;
  totalDays: number;
  firstDow: number; // 0=일
  allAchievedDays: Set<string>;
}) {
  const today = todayYmd();
  // 앞 빈 칸
  const blanks = firstDow;

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map((d, i) => (
          <span
            key={i}
            className={cn(
              "text-center text-[9px] font-bold pb-0.5",
              i === 0 && "text-rose-500 dark:text-rose-400",
              i === 6 && "text-blue-500 dark:text-blue-400",
              i > 0 && i < 6 && "text-muted-foreground",
            )}
          >
            {d}
          </span>
        ))}
        {/* blank cells */}
        {Array.from({ length: blanks }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {/* day cells */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const dow = (firstDow + i) % 7;
          const ymd = ymdOf(year, month, day);
          const isToday = ymd === today;
          const isAllAchieved = allAchievedDays.has(ymd);

          return (
            <div
              key={day}
              className={cn(
                "w-5 h-5 flex items-center justify-center rounded-full text-[10px] leading-none mx-auto",
                dow === 0 && "text-rose-500 dark:text-rose-400",
                dow === 6 && "text-blue-500 dark:text-blue-400",
                dow > 0 && dow < 6 && "text-foreground/80",
                isToday && "bg-indigo-100 dark:bg-indigo-900/50 font-bold",
                isAllAchieved && "ring-2 ring-teal-500 dark:ring-teal-400 font-semibold",
              )}
            >
              {day}
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-muted-foreground/70 leading-tight">
        습관을 모두 달성한 날에는 동그라미로 표시됩니다
      </p>
    </div>
  );
}

/** 매트릭스 표 헤더 — 주차 그룹 */
function MatrixHeader({
  totalDays,
  firstDow,
  today,
}: {
  totalDays: number;
  firstDow: number;
  today: string;
}) {
  // 주차 그룹: 1~7, 8~14, 15~21, 22~28, 29~말일
  const weekGroups = [
    { label: "1주차", start: 1, end: Math.min(7, totalDays) },
    { label: "2주차", start: 8, end: Math.min(14, totalDays) },
    { label: "3주차", start: 15, end: Math.min(21, totalDays) },
    { label: "4주차", start: 22, end: Math.min(28, totalDays) },
    ...(totalDays > 28 ? [{ label: "5주차", start: 29, end: totalDays }] : []),
  ].filter((g) => g.start <= totalDays);

  return (
    <>
      {/* 주차 라벨 행 */}
      <tr>
        {/* 좌측 고정 열 */}
        <th className="sticky left-0 z-10 bg-card min-w-[160px] border-b border-r border-border" />
        {weekGroups.map((g) => (
          <th
            key={g.label}
            colSpan={g.end - g.start + 1}
            className="text-[10px] font-semibold text-muted-foreground text-center py-1 px-2 border-b border-r border-border whitespace-nowrap"
          >
            {g.label}
          </th>
        ))}
        {/* 우측 통계 열 */}
        <th className="sticky right-0 z-10 bg-card min-w-[120px] border-b border-l border-border" />
      </tr>
      {/* 날짜 숫자 행 */}
      <tr>
        <th className="sticky left-0 z-10 bg-card border-b border-r border-border">
          <span className="sr-only">습관</span>
        </th>
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const dow = (firstDow + i) % 7;
          // today ymd 매칭은 caller가 ymd를 전달 — 여기선 prop year/month 없으니 오늘 강조는 별도
          const isWeekend = dow === 0 || dow === 6;
          const isSun = dow === 0;
          const isSat = dow === 6;

          return (
            <th
              key={day}
              className={cn(
                "text-[10px] font-medium text-center py-1 px-0 border-b border-r border-border w-9 min-w-[36px]",
                isSun && "text-rose-500 dark:text-rose-400",
                isSat && "text-blue-500 dark:text-blue-400",
                !isWeekend && "text-muted-foreground",
              )}
            >
              {day}
            </th>
          );
        })}
        <th className="sticky right-0 z-10 bg-card border-b border-l border-border">
          <span className="text-[10px] font-semibold text-muted-foreground px-2">달성 현황</span>
        </th>
      </tr>
    </>
  );
}

/** 습관 행 */
function HabitRow({
  idx,
  habit,
  totalDays,
  firstDow,
  year,
  month,
  achievedByDay,
  today,
}: {
  idx: number;
  habit: HabitDef;
  totalDays: number;
  firstDow: number;
  year: number;
  month: number;
  achievedByDay: Map<string, Set<string>>;
  today: string;
}) {
  // 달성 수 계산
  let achievedCount = 0;
  for (let d = 1; d <= totalDays; d++) {
    const ymd = ymdOf(year, month, d);
    if (achievedByDay.get(ymd)?.has(habit.key)) achievedCount++;
  }
  const base = habit.target ?? totalDays;
  const rawRate = base > 0 ? achievedCount / base : 0;
  const rate = Math.min(Math.round(rawRate * 100), 100);
  const missed = (habit.target ?? totalDays) - achievedCount;

  return (
    <tr className="group">
      {/* 좌측 고정: 번호 + 라벨 */}
      <td className="sticky left-0 z-10 bg-card border-b border-r border-border px-2 py-1.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground/60 w-4 shrink-0">
            {idx + 1}
          </span>
          <span className="text-[11px] font-medium text-foreground truncate max-w-[108px]">
            {habit.emoji && <span className="mr-0.5">{habit.emoji}</span>}
            {habit.label}
          </span>
          {habit.target && (
            <span className="text-[9px] text-muted-foreground/70 shrink-0">
              /{habit.target}
            </span>
          )}
        </div>
      </td>
      {/* 날짜별 체크 셀 */}
      {Array.from({ length: totalDays }).map((_, i) => {
        const day = i + 1;
        const dow = (firstDow + i) % 7;
        const ymd = ymdOf(year, month, day);
        const isDone = achievedByDay.get(ymd)?.has(habit.key) ?? false;
        const isToday = ymd === today;
        const isSun = dow === 0;
        const isSat = dow === 6;

        return (
          <td
            key={day}
            className={cn(
              "border-b border-r border-border w-9 min-w-[36px] text-center py-1",
              isToday && "bg-indigo-50/60 dark:bg-indigo-950/30",
              isSun && !isToday && "bg-rose-50/30 dark:bg-rose-950/10",
              isSat && !isToday && "bg-blue-50/30 dark:bg-blue-950/10",
            )}
          >
            {isDone ? (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-900/50 mx-auto">
                <CheckIcon
                  size={11}
                  className="text-emerald-600 dark:text-emerald-400"
                  strokeWidth={3}
                />
              </span>
            ) : (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-border/60 bg-muted/20 mx-auto" />
            )}
          </td>
        );
      })}
      {/* 우측 고정: 달성 통계 */}
      <td className="sticky right-0 z-10 bg-card border-b border-l border-border px-2 py-1.5 min-w-[120px]">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {achievedCount}
            </span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-rose-500 dark:text-rose-400 font-medium">{missed < 0 ? 0 : missed}</span>
            <span className="ml-auto text-indigo-600 dark:text-indigo-400 font-bold">
              {rate}%
            </span>
          </div>
          {/* 진행 바 */}
          <div className="h-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-700"
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────── main component ─────────────────── */

export default function HabitTracker({
  year,
  month,
  habits,
  achievedByDay,
}: HabitTrackerProps) {
  const today = todayYmd();

  // 달력 기초 계산
  const totalDays = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=일

  // 일자별 달성 습관 수
  const dailyCounts = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const ymd = ymdOf(year, month, i + 1);
      return achievedByDay.get(ymd)?.size ?? 0;
    });
  }, [year, month, totalDays, achievedByDay]);

  const maxDailyCount = Math.max(...dailyCounts, 1);

  // 전체 달성 셀 수 (습관 × 날짜)
  const totalAchieved = useMemo(() => {
    return dailyCounts.reduce((sum, c) => sum + c, 0);
  }, [dailyCounts]);

  const totalCells = habits.length * totalDays;
  const totalMissed = totalCells - totalAchieved;
  const overallRate = totalCells > 0 ? Math.min(Math.round((totalAchieved / totalCells) * 100), 100) : 0;

  // 모든 습관 달성한 날
  const allAchievedDays = useMemo(() => {
    const s = new Set<string>();
    for (let d = 1; d <= totalDays; d++) {
      const ymd = ymdOf(year, month, d);
      const achieved = achievedByDay.get(ymd);
      if (achieved && habits.length > 0 && achieved.size >= habits.length) {
        s.add(ymd);
      }
    }
    return s;
  }, [year, month, totalDays, achievedByDay, habits.length]);

  // 오늘 헤더 강조를 MatrixHeader에 전달하기 위해 today를 직접 계산
  const todayForHeader = today;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* ── 상단 3-panel 요약 ── */}
      <div className="flex flex-wrap gap-6 items-start px-4 pt-4 pb-3 border-b border-border bg-muted/20">
        {/* 좌: 월 달성 현황 */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {month}월 달성 현황
          </span>
          <MonthStats
            achieved={totalAchieved}
            missed={totalMissed}
            rate={overallRate}
          />
        </div>

        {/* 중: 일자별 차트 */}
        <div className="flex-1 min-w-[180px]">
          <DailyChart
            dailyCounts={dailyCounts}
            totalDays={totalDays}
            maxCount={maxDailyCount}
          />
        </div>

        {/* 우: 미니 캘린더 */}
        <MiniCalendar
          year={year}
          month={month}
          totalDays={totalDays}
          firstDow={firstDow}
          allAchievedDays={allAchievedDays}
        />
      </div>

      {/* ── 메인 매트릭스 표 ── */}
      {habits.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          등록된 습관이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto" role="region" aria-label="습관 트래커 매트릭스">
          <table className="w-max min-w-full border-collapse text-left">
            <thead>
              <MatrixHeader
                totalDays={totalDays}
                firstDow={firstDow}
                today={todayForHeader}
              />
            </thead>
            <tbody>
              {habits.map((habit, idx) => (
                <HabitRow
                  key={habit.key}
                  idx={idx}
                  habit={habit}
                  totalDays={totalDays}
                  firstDow={firstDow}
                  year={year}
                  month={month}
                  achievedByDay={achievedByDay}
                  today={today}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 범례 ── */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-muted/10">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-flex w-4 h-4 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-900/50">
            <CheckIcon size={9} className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
          </span>
          달성
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-flex w-4 h-4 rounded border border-border/60 bg-muted/20" />
          미달성
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-flex w-4 h-4 rounded-full border-2 border-teal-500 dark:border-teal-400" />
          전체 달성일
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-flex w-4 h-4 rounded bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-700" />
          오늘
        </div>
      </div>
    </motion.div>
  );
}
