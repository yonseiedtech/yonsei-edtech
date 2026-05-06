"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ArrowRight } from "lucide-react";
import { comprehensiveExamsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  COMPREHENSIVE_EXAM_STATUS_LABELS,
  SEMESTER_TERM_LABELS,
  type ComprehensiveExamRecord,
  type SemesterTerm,
} from "@/types";
import WidgetCard from "@/components/ui/widget-card";
import SkeletonWidget from "@/components/ui/skeleton-widget";
import EmptyState from "@/components/ui/empty-state";
import { SEMANTIC } from "@/lib/design-tokens";

/** 학기 → 대표 시작일 (D-Day 계산용 근사치) */
function termStartDate(year: number, term: SemesterTerm): Date {
  const monthDay: Record<SemesterTerm, [number, number]> = {
    spring: [3, 1],
    summer: [6, 20],
    fall: [9, 1],
    winter: [12, 20],
  };
  const [m, d] = monthDay[term];
  return new Date(year, m - 1, d);
}

function dDayLabel(target: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "D-Day";
  if (days > 0) return `D-${days}`;
  return `D+${-days}`;
}

export default function ComprehensiveExamCountdown() {
  const { user } = useAuthStore();
  const tone = SEMANTIC.warning;

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["dashboard-comp-exams", user?.id],
    queryFn: async () => {
      if (!user) return [] as ComprehensiveExamRecord[];
      const res = await comprehensiveExamsApi.listByUser(user.id);
      return res.data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const upcoming = useMemo(() => {
    if (exams.length === 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // planning/applied 상태 + 시작일이 오늘 이후인 시험 중 가장 가까운 것
    const candidates = exams
      .filter((e) => e.status === "planning" || e.status === "applied")
      .map((e) => ({ exam: e, when: termStartDate(e.plannedYear, e.plannedTerm) }))
      .filter((x) => x.when.getTime() >= today.getTime())
      .sort((a, b) => a.when.getTime() - b.when.getTime());
    return candidates[0] ?? null;
  }, [exams]);

  if (!user) return null;
  if (isLoading) {
    return <SkeletonWidget rows={2} />;
  }

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
      {upcoming ? (
        <div className="mt-4 rounded-lg bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">다음 응시 예정</p>
              <p className="mt-0.5 text-sm font-semibold">
                {upcoming.exam.plannedYear}년 {SEMESTER_TERM_LABELS[upcoming.exam.plannedTerm]}
                <span
                  className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${tone.chipBg} ${tone.chipText}`}
                >
                  {COMPREHENSIVE_EXAM_STATUS_LABELS[upcoming.exam.status]}
                </span>
              </p>
              {upcoming.exam.notes && (
                <p className="mt-1 text-[11px] text-muted-foreground">{upcoming.exam.notes}</p>
              )}
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${tone.accent}`}>{dDayLabel(upcoming.when)}</p>
              <p className="text-[10px] text-muted-foreground">
                {upcoming.when.toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="등록된 종합시험 응시 계획이 없어요"
          description="응시 학기와 영역을 미리 등록해 두면 D-day로 알려드려요."
          compact
          className="mt-4 bg-transparent"
          actions={[
            { label: "응시 계획 등록", href: "/courses?tab=mine", variant: "outline" },
          ]}
        />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          예정·신청된 시험이 없습니다. 결과는 /courses 내 수강기록 탭에서 관리하세요.
        </p>
      )}
    </WidgetCard>
  );
}
