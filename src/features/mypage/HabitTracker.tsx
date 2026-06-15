"use client";

/**
 * HabitTracker — 습관 트래커 매트릭스 컴포넌트
 *
 * 스프레드시트 레이아웃을 재현 + 사이클 123 고도화:
 *  - 상단 좌: 월 달성 현황 (총 일자 / 달성일 / 미달성 3-stat)
 *  - 상단 우: 월 미니 캘린더 (한 달 통합 7열 주 단위 그리드) — 모든 습관 달성일 ring
 *  - 중단: 일자별 달성 수 차트 (가로 전체폭 + 하단 날짜 축 + 과거 실선 + 오늘 점·깜박임 + 미래 평균 예측 점선)
 *  - 메인: 습관 × 날짜 매트릭스 표 (체크/미체크, 가로스크롤)
 *  - 우측: 습관별 달성 통계 (총 일자 / 달성 / 미달성 3분할) + 진행 바
 *  - 하단: 범례 (그룹화·가독성 개선)
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

/* ─────────────────────────────── sub-components ─────────────────── */

/**
 * 상단 좌: 3-stat 달성 현황 — 총 일자 / 달성일 / 미달성
 * (전체 매트릭스 셀이 아닌 "일(日)" 기준 — 그달 달력 일수 대비 활동일)
 */
function MonthStats({
  totalDays,
  achievedDays,
  missedDays,
}: {
  totalDays: number;
  achievedDays: number;
  missedDays: number;
}) {
  const stats = [
    { label: "총 일자", value: totalDays, color: "text-foreground/80" },
    { label: "달성일", value: achievedDays, color: "text-teal-600 dark:text-teal-400" },
    { label: "미달성", value: missedDays, color: "text-rose-500 dark:text-rose-400" },
  ];

  return (
    <div className="flex gap-5 items-end">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col items-center gap-0.5">
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

/**
 * 상단 중: 일자별 달성 수 차트 (사이클 123 고도화)
 *  - 폭 넓게 + 하단 날짜 축(1·주요 분기·말일).
 *  - 과거: 실제 달성 수 실선.
 *  - 오늘(당일): 어제와 선으로 잇지 않고 점만 + 어제 대비 색상 깜박임
 *      (동일=검정 · 적음=빨강 · 많음=파랑, 점/점선 애니메이션).
 *  - 미래(아직 안 온 날): 과거 평균 추이를 검정 점선(예측 가이드라인).
 */
function DailyChart({
  month,
  dailyCounts,
  totalDays,
  maxCount,
  todayDay,
}: {
  month: number;
  dailyCounts: number[];
  totalDays: number;
  maxCount: number;
  /** 이번 달 안에 오늘이 있으면 1-based day, 아니면 null(전부 과거 or 전부 미래) */
  todayDay: number | null;
}) {
  const W = 960; // 가로로 길게 (달력 통합으로 확보한 전체폭 사용)
  const H = 150;
  const PAD_L = 10;
  const PAD_R = 10;
  const PAD_T = 12;
  const PAD_B = 26; // 날짜 축 공간 (눈금 + 라벨)

  const yMax = Math.max(maxCount, 1);

  const xOf = (dayIdx: number) =>
    PAD_L + (dayIdx / Math.max(totalDays - 1, 1)) * (W - PAD_L - PAD_R);
  const yOf = (count: number) =>
    H - PAD_B - (count / yMax) * (H - PAD_T - PAD_B);

  // 오늘 인덱스(0-based). 이번 달 안에 없으면 모든 날을 "과거"로 본다.
  const todayIdx = todayDay != null ? todayDay - 1 : totalDays - 1;

  // 과거 구간(어제까지)·오늘·미래 분리
  const pastPoints = useMemo(() => {
    const pts: { x: number; y: number; count: number; idx: number }[] = [];
    const lastPastIdx = todayDay != null ? todayIdx - 1 : totalDays - 1;
    for (let i = 0; i <= lastPastIdx; i++) {
      pts.push({ x: xOf(i), y: yOf(dailyCounts[i] ?? 0), count: dailyCounts[i] ?? 0, idx: i });
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyCounts, totalDays, yMax, todayDay, todayIdx]);

  // 과거 평균(달성이 있던 날 평균이 아닌, 경과한 모든 날 평균 — 추이 가이드)
  const pastAvg = useMemo(() => {
    if (pastPoints.length === 0) return 0;
    const sum = pastPoints.reduce((a, p) => a + p.count, 0);
    return sum / pastPoints.length;
  }, [pastPoints]);

  // 오늘 포인트 + 어제 대비 비교
  const todayInfo = useMemo(() => {
    if (todayDay == null) return null;
    const todayCount = dailyCounts[todayIdx] ?? 0;
    const prevCount = todayIdx - 1 >= 0 ? dailyCounts[todayIdx - 1] ?? 0 : null;
    let trend: "same" | "less" | "more" = "same";
    if (prevCount != null) {
      if (todayCount < prevCount) trend = "less";
      else if (todayCount > prevCount) trend = "more";
    }
    return {
      x: xOf(todayIdx),
      y: yOf(todayCount),
      count: todayCount,
      trend,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyCounts, todayDay, todayIdx, yMax, totalDays]);

  const TREND_COLOR: Record<"same" | "less" | "more", string> = {
    same: "rgb(24,24,27)", // 검정 (foreground)
    less: "rgb(244,63,94)", // 빨강 rose-500
    more: "rgb(59,130,246)", // 파랑 blue-500
  };

  // 과거 실선 path
  const pastPath = useMemo(() => {
    if (pastPoints.length < 1) return "";
    let d = `M ${pastPoints[0].x} ${pastPoints[0].y}`;
    for (let i = 1; i < pastPoints.length; i++) {
      d += ` L ${pastPoints[i].x} ${pastPoints[i].y}`;
    }
    return d;
  }, [pastPoints]);

  // 미래 예측 점선 — 오늘(또는 마지막 과거)에서 시작해 말일까지 평균선 수평
  const futurePath = useMemo(() => {
    if (todayDay == null) return ""; // 오늘이 이 달에 없으면 예측 생략
    const startIdx = todayIdx; // 오늘부터
    if (startIdx >= totalDays - 1) return "";
    const y = yOf(pastAvg);
    return `M ${xOf(startIdx)} ${y} L ${xOf(totalDays - 1)} ${y}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayDay, todayIdx, totalDays, pastAvg, yMax]);

  // 날짜 축 눈금: 1·5·10·15·20·25·말일 (가독 라벨)
  const axisTicks = useMemo(() => {
    const ticks = new Set<number>([1, 5, 10, 15, 20, 25, totalDays]);
    return Array.from(ticks).filter((d) => d >= 1 && d <= totalDays).sort((a, b) => a - b);
  }, [totalDays]);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground font-medium">
        일자별 달성 수 · {month}월
      </span>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${month}월 일자별 달성 수 추이`}
        className="w-full h-auto min-h-[120px] overflow-visible"
      >
        <defs>
          <linearGradient id="habitAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(20,184,166)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(20,184,166)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* baseline (축) */}
        <line
          x1={PAD_L}
          y1={H - PAD_B}
          x2={W - PAD_R}
          y2={H - PAD_B}
          stroke="currentColor"
          className="text-border"
          strokeWidth={1}
        />

        {/* 과거 area + 실선 */}
        {pastPoints.length >= 2 && (
          <path
            d={`${pastPath} L ${pastPoints[pastPoints.length - 1].x} ${H - PAD_B} L ${pastPoints[0].x} ${H - PAD_B} Z`}
            fill="url(#habitAreaGrad)"
          />
        )}
        {pastPath && (
          <path
            d={pastPath}
            fill="none"
            stroke="rgb(13,148,136)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* 과거 달성 점 */}
        {pastPoints.map((p) =>
          p.count > 0 ? (
            <circle
              key={`past-${p.idx}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="rgb(13,148,136)"
              stroke="white"
              strokeWidth={1.2}
            />
          ) : null,
        )}

        {/* 미래 평균 예측 점선 */}
        {futurePath && (
          <>
            <path
              d={futurePath}
              fill="none"
              stroke="rgb(24,24,27)"
              className="dark:[stroke:rgb(228,228,231)]"
              strokeWidth={1.4}
              strokeDasharray="4 4"
              strokeOpacity={0.55}
            />
            <text
              x={W - PAD_R}
              y={yOf(pastAvg) - 5}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={11}
            >
              평균 {pastAvg.toFixed(1)}
            </text>
          </>
        )}

        {/* 오늘 — 선 없이 점만 + 어제 대비 깜박임 애니메이션 */}
        {todayInfo && (
          <g>
            {/* 펄스 링 */}
            <circle cx={todayInfo.x} cy={todayInfo.y} r={6} fill={TREND_COLOR[todayInfo.trend]} opacity={0.25}>
              <animate
                attributeName="r"
                values="5;11;5"
                dur="1.4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.35;0;0.35"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </circle>
            {/* 코어 점 (깜박임) */}
            <circle cx={todayInfo.x} cy={todayInfo.y} r={4.2} fill={TREND_COLOR[todayInfo.trend]} stroke="white" strokeWidth={1.2}>
              <animate
                attributeName="opacity"
                values="1;0.35;1"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </circle>
            <text
              x={todayInfo.x}
              y={todayInfo.y - 10}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill={TREND_COLOR[todayInfo.trend]}
            >
              오늘 {todayInfo.count}
            </text>
          </g>
        )}

        {/* 날짜 축 눈금 (틱 마크 + 일자 라벨) */}
        {axisTicks.map((d) => {
          const tx = xOf(d - 1);
          return (
            <g key={`tick-${d}`}>
              <line
                x1={tx}
                y1={H - PAD_B}
                x2={tx}
                y2={H - PAD_B + 4}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />
              <text
                x={tx}
                y={H - PAD_B + 16}
                textAnchor={d === 1 ? "start" : d === totalDays ? "end" : "middle"}
                className="fill-muted-foreground"
                fontSize={11}
                fontWeight={500}
              >
                {d}
                <tspan className="fill-muted-foreground/60" fontSize={9} fontWeight={400}>일</tspan>
              </text>
            </g>
          );
        })}
      </svg>

      {/* 차트 범례 (작게) */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[8.5px] text-muted-foreground/80">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 rounded-full bg-teal-600" /> 과거 실선
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground" /> 오늘 점(깜박임)
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-0 w-3 border-t border-dashed border-foreground/60"
            aria-hidden
          />{" "}
          미래 평균 예측
        </span>
      </div>
    </div>
  );
}

/** 상단 우: 미니 캘린더 (한 달 통합 — 7열 주 단위 그리드, 일~토) */
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
  firstDow: number; // 0=일 (1일의 요일)
  allAchievedDays: Set<string>;
}) {
  const today = todayYmd();

  return (
    <div className="flex flex-col gap-1.5 min-w-[210px]">
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map((d, i) => (
          <span
            key={i}
            className={cn(
              "text-center text-[9px] font-bold",
              i === 0 && "text-rose-500 dark:text-rose-400",
              i === 6 && "text-blue-500 dark:text-blue-400",
              i > 0 && i < 6 && "text-muted-foreground/70",
            )}
          >
            {d}
          </span>
        ))}
        {/* 1일 앞 빈칸 (요일 정렬) */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const dow = (firstDow + i) % 7;
          const ymd = ymdOf(year, month, day);
          const isToday = ymd === today;
          const isAllAchieved = allAchievedDays.has(ymd);

          return (
            <div
              key={day}
              title={isAllAchieved ? `${ymd} · 모두 달성` : ymd}
              className={cn(
                "w-[22px] h-[22px] flex items-center justify-center rounded-full text-[10px] leading-none mx-auto",
                dow === 0 && "text-rose-500 dark:text-rose-400",
                dow === 6 && "text-blue-500 dark:text-blue-400",
                dow > 0 && dow < 6 && "text-foreground/75",
                isToday && "bg-indigo-100 dark:bg-indigo-900/50 font-bold",
                isAllAchieved && "ring-2 ring-teal-500 dark:ring-teal-400 font-semibold",
              )}
            >
              {day}
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-muted-foreground/70 leading-tight text-center">
        <span className="inline-flex w-2.5 h-2.5 rounded-full border-2 border-teal-500 dark:border-teal-400 align-middle mr-1" />
        모든 습관을 달성한 날
      </p>
    </div>
  );
}

/** 매트릭스 표 헤더 — 주차 그룹 + 날짜 */
function MatrixHeader({
  year,
  month,
  totalDays,
  firstDow,
  today,
}: {
  year: number;
  month: number;
  totalDays: number;
  firstDow: number;
  today: string;
}) {
  const weekGroups = [
    { label: "1주차", start: 1, end: Math.min(7, totalDays) },
    { label: "2주차", start: 8, end: Math.min(14, totalDays) },
    { label: "3주차", start: 15, end: Math.min(21, totalDays) },
    { label: "4주차", start: 22, end: Math.min(28, totalDays) },
    ...(totalDays > 28 ? [{ label: "5주차", start: 29, end: totalDays }] : []),
  ].filter((g) => g.start <= totalDays);

  return (
    <>
      <tr>
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
        <th className="sticky right-0 z-10 bg-card min-w-[150px] border-b border-l border-border" />
      </tr>
      <tr>
        <th className="sticky left-0 z-10 bg-card border-b border-r border-border">
          <span className="sr-only">습관</span>
        </th>
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const dow = (firstDow + i) % 7;
          const ymd = ymdOf(year, month, day);
          const isToday = ymd === today;
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
                isToday && "bg-indigo-50/60 dark:bg-indigo-950/30 font-bold text-indigo-600 dark:text-indigo-400",
              )}
            >
              {day}
            </th>
          );
        })}
        <th className="sticky right-0 z-10 bg-card border-b border-l border-border">
          <span className="text-[10px] font-semibold text-muted-foreground px-2">
            총 / 달성 / 미달성
          </span>
        </th>
      </tr>
    </>
  );
}

/** 습관 행 — 우측 통계 3분할(총 일자 / 달성 / 미달성) */
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
  let achievedCount = 0;
  for (let d = 1; d <= totalDays; d++) {
    const ymd = ymdOf(year, month, d);
    if (achievedByDay.get(ymd)?.has(habit.key)) achievedCount++;
  }
  const base = habit.target ?? totalDays;
  const rawRate = base > 0 ? achievedCount / base : 0;
  const rate = Math.min(Math.round(rawRate * 100), 100);
  const missed = Math.max(base - achievedCount, 0);

  return (
    <tr className="group">
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
            <span className="text-[9px] text-muted-foreground/70 shrink-0">/{habit.target}</span>
          )}
        </div>
      </td>
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
                <CheckIcon size={11} className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
              </span>
            ) : (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-border/60 bg-muted/20 mx-auto" />
            )}
          </td>
        );
      })}
      {/* 우측 고정: 달성 통계 3분할 */}
      <td className="sticky right-0 z-10 bg-card border-b border-l border-border px-2 py-1.5 min-w-[150px]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] tabular-nums">
            <span className="flex flex-col items-center leading-none">
              <span className="font-semibold text-foreground/70">{base}</span>
              <span className="text-[8px] text-muted-foreground/60">총</span>
            </span>
            <span className="flex flex-col items-center leading-none">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{achievedCount}</span>
              <span className="text-[8px] text-muted-foreground/60">달성</span>
            </span>
            <span className="flex flex-col items-center leading-none">
              <span className="font-medium text-rose-500 dark:text-rose-400">{missed}</span>
              <span className="text-[8px] text-muted-foreground/60">미달성</span>
            </span>
            <span className="ml-auto text-indigo-600 dark:text-indigo-400 font-bold">{rate}%</span>
          </div>
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

  const totalDays = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=일

  // 이번 달에 오늘이 있으면 1-based day
  const todayDay = useMemo(() => {
    const prefix = `${year}-${pad2(month)}-`;
    if (!today.startsWith(prefix)) return null;
    return Number(today.slice(8, 10));
  }, [year, month, today]);

  // 일자별 달성 습관 수
  const dailyCounts = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const ymd = ymdOf(year, month, i + 1);
      return achievedByDay.get(ymd)?.size ?? 0;
    });
  }, [year, month, totalDays, achievedByDay]);

  const maxDailyCount = Math.max(...dailyCounts, 1);

  // 일(日) 기준 통계 — 총 일자 / 달성일 / 미달성
  //  - 달성일: 1개 이상 활동이 있던 distinct day (오늘까지만 카운트)
  //  - 미달성: 경과한 날 중 활동 없던 날
  const dayStats = useMemo(() => {
    let achievedDays = 0;
    let elapsed = 0;
    for (let d = 1; d <= totalDays; d++) {
      const ymd = ymdOf(year, month, d);
      const isFuture = ymd > today;
      if (!isFuture) elapsed++;
      const cnt = achievedByDay.get(ymd)?.size ?? 0;
      if (cnt > 0 && !isFuture) achievedDays++;
    }
    return { achievedDays, missedDays: Math.max(elapsed - achievedDays, 0) };
  }, [year, month, totalDays, achievedByDay, today]);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* ── 상단 요약 (현황 + 통합 캘린더) ── */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3 border-b border-border bg-muted/20">
        <div className="flex flex-wrap gap-6 items-start justify-between">
          <div className="flex flex-col gap-1 min-w-[150px]">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {month}월 달성 현황
            </span>
            <MonthStats
              totalDays={totalDays}
              achievedDays={dayStats.achievedDays}
              missedDays={dayStats.missedDays}
            />
          </div>

          <MiniCalendar
            year={year}
            month={month}
            totalDays={totalDays}
            firstDow={firstDow}
            allAchievedDays={allAchievedDays}
          />
        </div>

        {/* 일자별 달성 수 차트 — 가로 전체폭 */}
        <div className="w-full">
          <DailyChart
            month={month}
            dailyCounts={dailyCounts}
            totalDays={totalDays}
            maxCount={maxDailyCount}
            todayDay={todayDay}
          />
        </div>
      </div>

      {/* ── 메인 매트릭스 표 ── */}
      {habits.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          표시할 활동이 없습니다. 활동을 추가해보세요.
        </div>
      ) : (
        <div className="overflow-x-auto" role="region" aria-label="습관 트래커 매트릭스">
          <table className="w-max min-w-full border-collapse text-left">
            <thead>
              <MatrixHeader
                year={year}
                month={month}
                totalDays={totalDays}
                firstDow={firstDow}
                today={today}
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

      {/* ── 범례 (그룹화·가독성 개선) ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 border-t border-border bg-muted/10">
        <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
          범례
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex w-4 h-4 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-900/50">
            <CheckIcon size={9} className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
          </span>
          달성
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex w-4 h-4 rounded border border-border/60 bg-muted/20" />
          미달성
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex w-4 h-4 rounded-full border-2 border-teal-500 dark:border-teal-400" />
          전체 달성일
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex w-4 h-4 rounded bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-700" />
          오늘
        </div>
      </div>
    </motion.div>
  );
}
