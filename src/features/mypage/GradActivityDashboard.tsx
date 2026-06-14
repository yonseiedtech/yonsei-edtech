"use client";

/**
 * GradActivityDashboard — 대학원생활 종합 대시보드 (사이클 121)
 *
 * LearningStreak 의 activityByDay 를 받아 이번 달 활동을 3영역
 * (연구활동·학술활동·대학원생활) 매트릭스 대시보드로 표시한다.
 *  - 상단: 3영역 핵심 지표 카드(영역색 좌측 보더)
 *  - 하단: HabitTracker(designer 완성) 매트릭스 표 + 차트 + 미니 캘린더
 */

import { useMemo } from "react";
import HabitTracker from "./HabitTracker";
import { buildGradActivity, type AreaSummary } from "./grad-activity";
import { cn } from "@/lib/utils";

/** 영역 대표색 → 정적 tailwind 클래스 (JIT purge 안전: 문자열 전부 명시) */
const AREA_COLOR_CLASS: Record<string, { border: string; accent: string; chip: string }> = {
  indigo: {
    border: "border-l-indigo-500 dark:border-l-indigo-400",
    accent: "text-indigo-600 dark:text-indigo-400",
    chip: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
  teal: {
    border: "border-l-teal-500 dark:border-l-teal-400",
    accent: "text-teal-600 dark:text-teal-400",
    chip: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  },
  amber: {
    border: "border-l-amber-500 dark:border-l-amber-400",
    accent: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
};

function AreaCard({ summary }: { summary: AreaSummary }) {
  const colors = AREA_COLOR_CLASS[summary.color] ?? AREA_COLOR_CLASS.indigo;
  return (
    <div
      className={cn(
        "flex-1 min-w-[160px] rounded-xl border border-l-4 bg-card px-4 py-3",
        colors.border,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-lg leading-none" aria-hidden="true">
          {summary.emoji}
        </span>
        <span className="text-sm font-bold text-foreground">{summary.label}</span>
      </div>
      <div className="mt-2 flex items-end gap-4">
        <div className="flex flex-col">
          <span className={cn("text-2xl font-extrabold leading-none tabular-nums", colors.accent)}>
            {summary.activeDays}
          </span>
          <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">활동 일수</span>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-extrabold leading-none tabular-nums text-foreground/80">
            {summary.totalCount}
          </span>
          <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">총 활동 수</span>
        </div>
      </div>
    </div>
  );
}

export default function GradActivityDashboard({
  activityByDay,
}: {
  activityByDay: Map<string, Map<string, number>>;
}) {
  // 현재 년/월 (브라우저 KST 기준)
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { habits, achievedByDay, areaSummary } = useMemo(
    () => buildGradActivity(activityByDay, year, month),
    [activityByDay, year, month],
  );

  return (
    <section className="mt-6">
      <div className="mb-3">
        <h3 className="text-base font-bold text-foreground">이번 달 활동 대시보드</h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          연구활동·학술활동·대학원생활 세 영역의 {month}월 활동을 한눈에 살펴보세요.
        </p>
      </div>

      {/* 3영역 핵심 지표 카드 */}
      <div className="flex flex-wrap gap-3">
        {areaSummary.map((s) => (
          <AreaCard key={s.areaKey} summary={s} />
        ))}
      </div>

      {/* 매트릭스 대시보드 */}
      <div className="mt-4">
        <HabitTracker
          year={year}
          month={month}
          habits={habits}
          achievedByDay={achievedByDay}
        />
      </div>
    </section>
  );
}
