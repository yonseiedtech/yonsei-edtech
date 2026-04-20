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
    return (
      <div className="rounded-2xl border bg-white p-6">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap size={18} className="text-amber-700" />
          <h2 className="font-bold text-amber-900">종합시험</h2>
        </div>
        <Link
          href="/courses?tab=mine"
          className="inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900"
        >
          관리하기 <ArrowRight size={11} />
        </Link>
      </div>

      {upcoming ? (
        <div className="mt-4 rounded-lg bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">다음 응시 예정</p>
              <p className="mt-0.5 text-sm font-semibold">
                {upcoming.exam.plannedYear}년 {SEMESTER_TERM_LABELS[upcoming.exam.plannedTerm]}
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  {COMPREHENSIVE_EXAM_STATUS_LABELS[upcoming.exam.status]}
                </span>
              </p>
              {upcoming.exam.notes && (
                <p className="mt-1 text-[11px] text-muted-foreground">{upcoming.exam.notes}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-700">{dDayLabel(upcoming.when)}</p>
              <p className="text-[10px] text-muted-foreground">
                {upcoming.when.toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
        </div>
      ) : exams.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed bg-white p-4 text-center">
          <p className="text-xs text-muted-foreground">
            등록된 종합시험 응시 계획이 없습니다.
          </p>
          <Link
            href="/courses?tab=mine"
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50"
          >
            응시 계획 등록 <ArrowRight size={11} />
          </Link>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          예정·신청된 시험이 없습니다. 결과는 /courses 내 수강기록 탭에서 관리하세요.
        </p>
      )}
    </div>
  );
}
