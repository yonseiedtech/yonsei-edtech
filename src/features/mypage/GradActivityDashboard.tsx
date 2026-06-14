"use client";

/**
 * GradActivityDashboard — 대학원생활 종합 대시보드 (사이클 121)
 *
 * LearningStreak 의 activityByDay 를 받아 이번 달 활동을 3영역
 * (연구활동·학술활동·대학원생활) 매트릭스 대시보드로 표시한다.
 *  - 상단: 3영역 핵심 지표 카드(영역색 좌측 보더) + 영역별 누적 현황 chip
 *  - 하단: HabitTracker(designer 완성) 매트릭스 표 + 차트 + 미니 캘린더
 *
 * 사이클 122: 영역별 "누적 현황"(이번 달이 아닌 전체) chip 추가.
 *  - 본인 데이터만 fetch(userId filter), 실패/빈 데이터는 0 처리.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import HabitTracker from "./HabitTracker";
import {
  buildGradActivity,
  buildCumulativeSummary,
  type AreaSummary,
  type AreaKey,
  type CumulativeByArea,
  type CumulativeMetric,
} from "./grad-activity";
import {
  courseEnrollmentsApi,
  comprehensiveExamsApi,
  gradLifePositionsApi,
  externalActivitiesApi,
  attendeesApi,
  writingPaperHistoryApi,
  paperReadingLogsApi,
} from "@/lib/bkend";
import type {
  CourseEnrollment,
  ComprehensiveExamRecord,
  GradLifePosition,
  ExternalActivity,
  SeminarAttendee,
  WritingPaperHistory,
} from "@/types";
import type { PaperReadingLog } from "@/types/paper-reading";
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO datetime → 로컬 YYYY-MM-DD (distinct-day 집계용) */
function isoToYmd(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function AreaCard({
  summary,
  cumulative,
  loading,
}: {
  summary: AreaSummary;
  cumulative: CumulativeMetric[];
  loading: boolean;
}) {
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

      {/* 누적 현황 chip (이번 달이 아닌 전체) */}
      <div className="mt-2.5 border-t border-border/60 pt-2">
        <p className="mb-1 text-[10px] font-semibold text-muted-foreground/80">누적 현황</p>
        {loading ? (
          <div className="flex gap-1">
            <span className="h-4 w-16 animate-pulse rounded-full bg-muted/60" aria-hidden />
            <span className="h-4 w-14 animate-pulse rounded-full bg-muted/60" aria-hidden />
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {cumulative.map((m) => (
              <span
                key={m.label}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                  colors.chip,
                )}
                title={`${m.label} ${m.value}`}
              >
                <span aria-hidden="true">{m.emoji}</span>
                <span>{m.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GradActivityDashboard({
  activityByDay,
  userId,
}: {
  activityByDay: Map<string, Map<string, number>>;
  userId: string;
}) {
  // 현재 년/월 (브라우저 KST 기준)
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { habits, achievedByDay, areaSummary } = useMemo(
    () => buildGradActivity(activityByDay, year, month),
    [activityByDay, year, month],
  );

  // ── 영역별 누적 현황 — 본인 데이터만 fetch (enabled: !!userId) ──
  const qOpts = { enabled: !!userId, staleTime: 5 * 60_000 } as const;

  const { data: coursesRes, isLoading: lCourses } = useQuery({
    queryKey: ["grad-cumulative", "courses", userId],
    queryFn: () => courseEnrollmentsApi.listByUser(userId),
    ...qOpts,
  });
  const { data: examsRes, isLoading: lExams } = useQuery({
    queryKey: ["grad-cumulative", "exams", userId],
    queryFn: () => comprehensiveExamsApi.listByUser(userId),
    ...qOpts,
  });
  const { data: positionsRes, isLoading: lPositions } = useQuery({
    queryKey: ["grad-cumulative", "grad-positions", userId],
    queryFn: () => gradLifePositionsApi.listByUser(userId),
    ...qOpts,
  });
  const { data: externalRes, isLoading: lExternal } = useQuery({
    queryKey: ["grad-cumulative", "external", userId],
    queryFn: () => externalActivitiesApi.listByUser(userId),
    ...qOpts,
  });
  const { data: attendeesRes, isLoading: lAttendees } = useQuery({
    queryKey: ["grad-cumulative", "attendees", userId],
    queryFn: () => attendeesApi.listByUser(userId),
    ...qOpts,
  });
  const { data: writingRes, isLoading: lWriting } = useQuery({
    queryKey: ["grad-cumulative", "writing-history", userId],
    queryFn: () => writingPaperHistoryApi.listByUser(userId),
    ...qOpts,
  });
  const { data: readingRes, isLoading: lReading } = useQuery({
    queryKey: ["grad-cumulative", "paper-reading", userId],
    queryFn: () => paperReadingLogsApi.listByUser(userId),
    ...qOpts,
  });

  const cumulativeLoading =
    lCourses || lExams || lPositions || lExternal || lAttendees || lWriting || lReading;

  const cumulative: CumulativeByArea = useMemo(() => {
    const courses = (coursesRes?.data ?? []) as CourseEnrollment[];
    const exams = (examsRes?.data ?? []) as ComprehensiveExamRecord[];
    const positions = (positionsRes?.data ?? []) as GradLifePosition[];
    const external = (externalRes?.data ?? []) as ExternalActivity[];
    const attendees = (attendeesRes?.data ?? []) as SeminarAttendee[];
    const writing = (writingRes?.data ?? []) as WritingPaperHistory[];
    const reading = (readingRes?.data ?? []) as PaperReadingLog[];

    // 세미나: 본인 출석(체크인 완료) 건수
    const seminarCount = attendees.filter((a) => a.checkedIn).length;
    // 논문 읽기: 완료(done) 기록 — status 누락분은 readAt 존재로 보정
    const paperReadingCount = reading.filter(
      (r) => r.status === "done" || !!r.readAt,
    ).length;
    // 논문 작성: 저장 이력의 distinct 활동일
    const writingDays = new Set<string>();
    for (const h of writing) {
      const ymd = isoToYmd(h.createdAt) ?? isoToYmd(h.savedAt);
      if (ymd) writingDays.add(ymd);
    }

    return buildCumulativeSummary({
      courseCount: courses.length,
      examPassedCount: exams.filter((e) => e.status === "passed").length,
      examTotalCount: exams.length,
      gradPositionCount: positions.length,
      seminarCount,
      externalCount: external.length,
      paperReadingCount,
      writingActiveDays: writingDays.size,
    });
  }, [coursesRes, examsRes, positionsRes, externalRes, attendeesRes, writingRes, readingRes]);

  const emptyByArea: CumulativeByArea = { research: [], academic: [], grad: [] };
  const cumulativeView = userId ? cumulative : emptyByArea;

  return (
    <section className="mt-6">
      <div className="mb-3">
        <h3 className="text-base font-bold text-foreground">이번 달 활동 대시보드</h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          연구활동·학술활동·대학원생활 세 영역의 {month}월 활동을 한눈에 살펴보세요.
        </p>
      </div>

      {/* 3영역 핵심 지표 카드 (+ 영역별 누적 현황 chip) */}
      <div className="flex flex-wrap gap-3">
        {areaSummary.map((s) => (
          <AreaCard
            key={s.areaKey}
            summary={s}
            cumulative={cumulativeView[s.areaKey as AreaKey]}
            loading={cumulativeLoading}
          />
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
