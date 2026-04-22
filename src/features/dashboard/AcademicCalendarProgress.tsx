"use client";

import Link from "next/link";
import { CalendarDays, Settings } from "lucide-react";
import {
  useAcademicCalendar,
  pickActiveEntry,
  computeProgress,
  type SemesterPhase,
} from "@/features/site-settings/useAcademicCalendar";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const PHASE_COLORS: Record<SemesterPhase, string> = {
  before: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  regular_pre_midterm: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  midterm: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  regular_post_midterm: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  final: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  post_final: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  break: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  after: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

interface MilestoneDef {
  key: keyof import("@/features/site-settings/useAcademicCalendar").AcademicCalendarEntry;
  label: string;
}

const MILESTONES: MilestoneDef[] = [
  { key: "semesterStart", label: "개강" },
  { key: "midtermStart", label: "중간" },
  { key: "finalStart", label: "기말" },
  { key: "semesterEnd", label: "종강" },
  { key: "breakEnd", label: "방학종료" },
];

function formatMonthDay(s: string | undefined): string {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  if (!m) return s;
  return `${Number(m[2])}/${Number(m[3])}`;
}

export default function AcademicCalendarProgress() {
  const { value, isLoading } = useAcademicCalendar();
  const { user } = useAuthStore();
  const canEdit = isPresidentOrAbove(user);

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const entry = pickActiveEntry(value.entries);
  const progress = entry ? computeProgress(entry) : null;

  if (!entry) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            <h2 className="font-bold">학사일정</h2>
          </div>
          {canEdit && (
            <Link
              href="/console/academic-calendar"
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              <Settings size={12} /> 학사일정 입력
            </Link>
          )}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {canEdit
            ? "학사일정이 등록되지 않았습니다. 운영콘솔에서 입력해 주세요."
            : "학사일정이 아직 등록되지 않았습니다."}
        </p>
      </div>
    );
  }

  // entry는 있지만 진행도 계산 불가 (semesterStart/End 누락)
  if (!progress) {
    const semesterLabel = `${entry.year}년 ${entry.semester === "first" ? "1학기" : "2학기"}`;
    return (
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            <h2 className="font-bold">학사일정 — {semesterLabel}</h2>
          </div>
          {canEdit && (
            <Link
              href="/console/academic-calendar"
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              <Settings size={12} /> 편집
            </Link>
          )}
        </div>
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {canEdit
            ? "개강일·종강일이 비어 있어 진행도를 계산할 수 없습니다. 학사일정을 다시 확인해 주세요."
            : "개강일·종강일 정보가 등록되지 않아 진행도를 계산할 수 없습니다."}
        </p>
      </div>
    );
  }

  const semesterLabel = `${entry.year}년 ${entry.semester === "first" ? "1학기" : "2학기"}`;
  const percentClamped = Math.max(0, Math.min(100, progress.percent));

  // 마일스톤별 진행 위치(%) 계산
  const semStart = parseDate(entry.semesterStart)!;
  const semEnd = parseDate(entry.breakEnd) ?? parseDate(entry.semesterEnd)!;
  const totalMs = Math.max(1, semEnd.getTime() - semStart.getTime());

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-primary" />
          <h2 className="font-bold">학사일정 — {semesterLabel}</h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              PHASE_COLORS[progress.phase],
            )}
          >
            {progress.phaseLabel}
          </span>
        </div>
        {canEdit && (
          <Link
            href="/console/academic-calendar"
            className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            <Settings size={12} /> 편집
          </Link>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm text-muted-foreground">
          현재 학기의{" "}
          <span className="font-semibold text-foreground">{percentClamped.toFixed(1)}%</span>가
          지나고 있습니다
          {progress.nextMilestone && (
            <>
              {" · "}
              다음:{" "}
              <span className="font-medium text-foreground">
                {progress.nextMilestone.label}
              </span>{" "}
              ({formatMonthDay(progress.nextMilestone.date)})
            </>
          )}
        </p>

        {/* 진행바 */}
        <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary/70 to-primary"
            style={{ width: `${percentClamped}%` }}
          />
        </div>

        {/* 마일스톤 라벨 */}
        <div className="relative mt-2 h-8">
          {MILESTONES.map((m) => {
            const dateStr = entry[m.key] as string | undefined;
            const d = parseDate(dateStr);
            if (!d) return null;
            const left =
              ((d.getTime() - semStart.getTime()) / totalMs) * 100;
            const clamped = Math.max(0, Math.min(100, left));
            return (
              <div
                key={String(m.key)}
                className="absolute top-0 -translate-x-1/2 text-center"
                style={{ left: `${clamped}%` }}
              >
                <div className="mx-auto h-2 w-px bg-muted-foreground/30" />
                <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  {m.label}
                </div>
                <div className="text-[10px] text-muted-foreground/70">
                  {formatMonthDay(dateStr)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            경과 <span className="font-semibold text-foreground">{progress.daysElapsed}일</span>
          </span>
          <span>
            남은 일수{" "}
            <span className="font-semibold text-foreground">{progress.daysRemaining}일</span>
          </span>
          <span>
            전체 <span className="font-semibold text-foreground">{progress.daysTotal}일</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function parseDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}
