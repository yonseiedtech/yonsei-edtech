"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ArrowRight, MapPin, CalendarDays } from "lucide-react";
import { comprehensiveExamsApi } from "@/lib/bkend";
import { comprehensiveExamSchedulesApi } from "@/lib/comprehensive-exam-schedules-api";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  COMPREHENSIVE_EXAM_STATUS_LABELS,
  SEMESTER_TERM_LABELS,
  type ComprehensiveExamRecord,
} from "@/types";
import type { ComprehensiveExamSchedule } from "@/types/comprehensive-exam-schedule";
import WidgetCard from "@/components/ui/widget-card";
import SkeletonWidget from "@/components/ui/skeleton-widget";
import { SEMANTIC } from "@/lib/design-tokens";

function dDayLabel(target: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "D-Day";
  if (days > 0) return `D-${days}`;
  return `D+${-days}`;
}

/**
 * 종합시험 카운트다운 — 사이클 93 개편.
 *
 * 본인 응시 계획(planning/applied) 과 운영진이 입력한 학기별 일정(examDate)을 매칭해
 * 정확한 D-day 를 보여준다. 매칭되는 일정이 없으면(= 운영진이 아직 일정을 입력하지 않았거나
 * 본인이 응시 대상 학기가 아니면) 위젯 자체를 노출하지 않는다.
 * → "운영진이 일정을 입력하기 전까지 영역이 안 보이도록" + "해당 시점 응시자에게만" 요구 반영.
 */
export default function ComprehensiveExamCountdown() {
  const { user } = useAuthStore();
  const tone = SEMANTIC.warning;

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["dashboard-comp-exams", user?.id],
    queryFn: async () => {
      if (!user) return [] as ComprehensiveExamRecord[];
      const res = await comprehensiveExamsApi.listByUser(user.id);
      return res.data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: schedules = [], isLoading: schedLoading } = useQuery({
    queryKey: ["comp-exam-schedules"],
    queryFn: async () =>
      (await comprehensiveExamSchedulesApi.list())
        .data as ComprehensiveExamSchedule[],
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  // 응시 계획 × 운영 일정 매칭 — 가장 가까운 미래 시험
  const upcoming = useMemo(() => {
    if (exams.length === 0 || schedules.length === 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const candidates = exams
      .filter((e) => e.status === "planning" || e.status === "applied")
      .map((e) => {
        const sched = schedules.find(
          (s) => s.year === e.plannedYear && s.term === e.plannedTerm,
        );
        if (!sched?.examDate) return null;
        return { exam: e, schedule: sched, when: new Date(`${sched.examDate}T00:00:00`) };
      })
      .filter(
        (x): x is { exam: ComprehensiveExamRecord; schedule: ComprehensiveExamSchedule; when: Date } =>
          !!x && !Number.isNaN(x.when.getTime()) && x.when.getTime() >= today.getTime(),
      )
      .sort((a, b) => a.when.getTime() - b.when.getTime());
    return candidates[0] ?? null;
  }, [exams, schedules]);

  if (!user) return null;
  if (examsLoading || schedLoading) return <SkeletonWidget rows={2} />;
  // 매칭되는 운영 일정이 없으면 비노출 (운영진 입력 전 / 응시 대상 아님)
  if (!upcoming) return null;

  const { exam, schedule, when } = upcoming;

  const headerActions = (
    <Link
      href="/courses?tab=mine"
      className={`inline-flex items-center gap-1 text-xs hover:underline ${tone.text}`}
    >
      관리하기 <ArrowRight size={11} />
    </Link>
  );

  return (
    <WidgetCard
      title="종합시험"
      icon={GraduationCap}
      semantic="warning"
      actions={headerActions}
    >
      <div className="mt-4 rounded-lg bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">다음 응시 예정</p>
            <p className="mt-0.5 text-sm font-semibold">
              {schedule.year}년 {SEMESTER_TERM_LABELS[schedule.term]}
              <span
                className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${tone.chipBg} ${tone.chipText}`}
              >
                {COMPREHENSIVE_EXAM_STATUS_LABELS[exam.status]}
              </span>
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={11} />
                {when.toLocaleDateString("ko-KR")}
              </span>
              {schedule.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} />
                  {schedule.location}
                </span>
              )}
            </p>
            {schedule.notes && (
              <p className="mt-1 text-[11px] text-muted-foreground">{schedule.notes}</p>
            )}
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${tone.accent}`}>{dDayLabel(when)}</p>
            {schedule.applicationEnd && (
              <p className="text-[10px] text-muted-foreground">
                신청 마감 {new Date(`${schedule.applicationEnd}T00:00:00`).toLocaleDateString("ko-KR")}
              </p>
            )}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
