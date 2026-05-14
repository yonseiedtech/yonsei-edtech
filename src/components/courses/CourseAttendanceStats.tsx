"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getEnrollmentAttendanceKey,
  isAttendanceEnabled,
  isAttended,
} from "@/lib/attendance";
import type { ClassSession, CourseEnrollment } from "@/types";
import type { WeekRange } from "@/lib/semesterWeeks";

interface Props {
  enrollments: CourseEnrollment[];
  sessions: ClassSession[];
  weeks: WeekRange[];
}

interface StudentRow {
  enrollment: CourseEnrollment;
  attended: number;
  absent: number;
  rate: number;
}

interface WeekRow {
  weekNo: number;
  date: string;
  attended: number;
  total: number;
  rate: number;
}

function attendanceColor(rate: number): string {
  if (rate >= 0.9) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (rate >= 0.75) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

export function CourseAttendanceStats({ enrollments, sessions, weeks }: Props) {
  const [open, setOpen] = useState(false);

  // 출석체크 가능한 세션만 (취소/줌/과제 제외)
  const trackedSessions = useMemo(
    () => sessions.filter((s) => isAttendanceEnabled(s.mode)),
    [sessions],
  );

  const studentRows: StudentRow[] = useMemo(() => {
    const onlyStudents = enrollments.filter((e) => e.role !== "ta");
    return onlyStudents
      .map((e) => {
        const key = getEnrollmentAttendanceKey(e);
        let attended = 0;
        let absent = 0;
        for (const s of trackedSessions) {
          if (isAttended(s, key)) attended += 1;
          else absent += 1;
        }
        const total = trackedSessions.length;
        const rate = total === 0 ? 0 : attended / total;
        return { enrollment: e, attended, absent, rate };
      })
      .sort((a, b) => a.rate - b.rate); // 출석률 낮은 순으로 정렬 (관심 필요한 학생 우선)
  }, [enrollments, trackedSessions]);

  const weekRows: WeekRow[] = useMemo(() => {
    const onlyStudents = enrollments.filter((e) => e.role !== "ta");
    const total = onlyStudents.length;
    return weeks
      .map((w) => {
        const weekSessions = trackedSessions.filter(
          (s) => s.date >= w.startDate && s.date <= w.endDate,
        );
        let attended = 0;
        for (const s of weekSessions) {
          for (const e of onlyStudents) {
            if (isAttended(s, getEnrollmentAttendanceKey(e))) attended += 1;
          }
        }
        const denom = weekSessions.length * total;
        const rate = denom === 0 ? 0 : attended / denom;
        return {
          weekNo: w.weekNo,
          date: weekSessions[0]?.date ?? w.startDate,
          attended,
          total: denom,
          rate,
        };
      })
      .filter((r) => r.total > 0);
  }, [weeks, enrollments, trackedSessions]);

  const overall = useMemo(() => {
    const total = studentRows.length;
    if (total === 0) return { rate: 0, atRisk: 0 };
    const sum = studentRows.reduce((acc, r) => acc + r.rate, 0);
    const atRisk = studentRows.filter((r) => r.rate < 0.75).length;
    return { rate: sum / total, atRisk };
  }, [studentRows]);

  if (trackedSessions.length === 0 || studentRows.length === 0) return null;

  return (
    <section className="mx-auto mt-6 max-w-4xl px-4">
      <div className="rounded-2xl border bg-card">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            <h3 className="text-sm font-semibold">출석 현황</h3>
            <Badge variant="secondary" className="text-[10px]">
              평균 {Math.round(overall.rate * 100)}%
            </Badge>
            {overall.atRisk > 0 && (
              <Badge variant="secondary" className="bg-rose-50 text-[10px] text-rose-700">
                관심 {overall.atRisk}명
              </Badge>
            )}
          </div>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {open && (
          <div className="space-y-6 border-t px-4 py-4">
            <div>
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                학생별 출석률 (출석률 낮은 순)
              </h4>
              <ul className="divide-y">
                {studentRows.map((r) => (
                  <li
                    key={r.enrollment.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{r.enrollment.studentName}</span>
                      {r.enrollment.studentId && (
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {r.enrollment.studentId}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {r.attended}/{trackedSessions.length}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn("min-w-[52px] justify-center text-[11px]", attendanceColor(r.rate))}
                    >
                      {Math.round(r.rate * 100)}%
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>

            {weekRows.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                  주차별 출석률
                </h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {weekRows.map((w) => (
                    <div
                      key={w.weekNo}
                      className={cn(
                        "rounded-lg border px-3 py-2",
                        attendanceColor(w.rate),
                      )}
                    >
                      <div className="text-[10px] opacity-70">{w.weekNo}주차</div>
                      <div className="text-sm font-semibold">
                        {Math.round(w.rate * 100)}%
                      </div>
                      <div className="text-[10px] opacity-70">
                        {w.attended}/{w.total}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const csv = [
                  ["학번", "이름", "출석", "결석", "출석률"],
                  ...studentRows.map((r) => [
                    r.enrollment.studentId ?? "",
                    r.enrollment.studentName ?? "",
                    String(r.attended),
                    String(r.absent),
                    `${Math.round(r.rate * 100)}%`,
                  ]),
                ]
                  .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
                  .join("\n");
                const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              CSV 내보내기
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
