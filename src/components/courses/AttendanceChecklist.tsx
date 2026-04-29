"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Square, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { classSessionsApi } from "@/lib/bkend";
import {
  buildAttendancePayload,
  getCompositeKey,
  isAttendanceEnabled,
} from "@/lib/attendance";
import type { ClassSession, ClassSessionMode, CourseEnrollment } from "@/types";
import { CLASS_SESSION_MODE_LABELS, ENROLLMENT_ROLE_LABELS } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  courseOfferingId: string;
  date: string;
  session: ClassSession | undefined;
  enrollments: CourseEnrollment[];
  actorUserId: string;
  fallbackMode?: ClassSessionMode;
};

export function AttendanceChecklist({
  open,
  onOpenChange,
  courseOfferingId,
  date,
  session,
  enrollments,
  actorUserId,
  fallbackMode = "in_person",
}: Props) {
  const qc = useQueryClient();
  const effectiveMode: ClassSessionMode = session?.mode ?? fallbackMode;
  const enabled = isAttendanceEnabled(effectiveMode);

  const visibleEnrollments = useMemo(
    () => enrollments.filter((e) => e.role !== "auditor"),
    [enrollments],
  );

  const initialAttended = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    if (session) {
      for (const uid of session.attendedUserIds ?? []) s.add(`user:${uid}`);
      for (const eid of session.attendedStudentIds ?? []) s.add(`enrollment:${eid}`);
    }
    return s;
  }, [session]);
  const initialNotes = useMemo<Record<string, string>>(
    () => session?.absenceNotes ?? {},
    [session],
  );

  const [attended, setAttended] = useState<Set<string>>(initialAttended);
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes);
  const [bulkAbsenceMemo, setBulkAbsenceMemo] = useState("");

  useEffect(() => {
    if (open) {
      setAttended(new Set(initialAttended));
      setNotes({ ...initialNotes });
      setBulkAbsenceMemo("");
    }
  }, [open, initialAttended, initialNotes]);

  const toggle = (key: string) => {
    setAttended((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    const next = new Set<string>();
    for (const e of visibleEnrollments) next.add(getCompositeKey(e));
    setAttended(next);
  };

  const deselectAll = () => setAttended(new Set());

  const applyBulkMemo = () => {
    if (!bulkAbsenceMemo.trim()) {
      toast.error("결석 사유를 입력해주세요.");
      return;
    }
    const next = { ...notes };
    let count = 0;
    for (const e of visibleEnrollments) {
      const k = getCompositeKey(e);
      if (!attended.has(k)) {
        next[k] = bulkAbsenceMemo.trim();
        count += 1;
      }
    }
    setNotes(next);
    toast.success(`${count}명에게 결석 사유 일괄 입력`);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildAttendancePayload(visibleEnrollments, attended, notes, actorUserId);
      return classSessionsApi.bulkUpsertAttendance(
        courseOfferingId,
        date,
        payload,
        { mode: effectiveMode, createdBy: actorUserId },
      );
    },
    onSuccess: () => {
      toast.success("출석 정보를 저장했습니다.");
      qc.invalidateQueries({ queryKey: ["class-sessions"] });
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "저장에 실패했습니다.";
      toast.error(msg);
    },
  });

  const summary = useMemo(() => {
    let attendedCount = 0;
    let absentCount = 0;
    for (const e of visibleEnrollments) {
      if (attended.has(getCompositeKey(e))) attendedCount += 1;
      else absentCount += 1;
    }
    return { attendedCount, absentCount, total: visibleEnrollments.length };
  }, [visibleEnrollments, attended]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            출석 체크
            <Badge variant="outline" className="text-[11px]">
              {date}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {CLASS_SESSION_MODE_LABELS[effectiveMode]}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {enabled ? (
              <>출석한 수강생을 체크하고 저장하세요. 미체크자는 결석 처리됩니다.</>
            ) : (
              <>비대면·휴강·과제 대체 회차는 출석 체크가 의미가 없어요. 그래도 기록할 수 있습니다.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Button type="button" size="sm" variant="outline" onClick={selectAll}>
              <CheckSquare className="mr-1 h-3.5 w-3.5" /> 전체 선택
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={deselectAll}>
              <Square className="mr-1 h-3.5 w-3.5" /> 전체 해제
            </Button>
            <span className="ml-auto text-muted-foreground">
              출석 <span className="font-semibold text-emerald-700">{summary.attendedCount}</span>
              {" · "}
              결석 <span className="font-semibold text-rose-700">{summary.absentCount}</span>
              {" / "}
              총 {summary.total}명
            </span>
          </div>

          {visibleEnrollments.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-muted-foreground">
              등록된 수강생이 없습니다. 운영 콘솔에서 명단을 먼저 추가하세요.
            </p>
          ) : (
            <ul className="max-h-[40vh] divide-y overflow-y-auto rounded-md border">
              {visibleEnrollments.map((e) => {
                const k = getCompositeKey(e);
                const isAttended = attended.has(k);
                const note = notes[k] ?? "";
                return (
                  <li key={e.id} className="px-3 py-2">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggle(k)}
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          isAttended
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                        aria-label={isAttended ? "출석 해제" : "출석 표시"}
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{e.studentName}</span>
                          {e.studentId && (
                            <span className="text-xs text-muted-foreground">{e.studentId}</span>
                          )}
                          {e.role && e.role !== "student" && (
                            <Badge variant="outline" className="text-[10px]">
                              {ENROLLMENT_ROLE_LABELS[e.role]}
                            </Badge>
                          )}
                          {!e.userId && (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-700">
                              회원 미연동
                            </Badge>
                          )}
                        </div>
                        {!isAttended && (
                          <input
                            type="text"
                            value={note}
                            onChange={(ev) => {
                              const v = ev.target.value;
                              setNotes((prev) => {
                                const n = { ...prev };
                                if (v.trim()) n[k] = v;
                                else delete n[k];
                                return n;
                              });
                            }}
                            placeholder="결석 사유 (선택)"
                            className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                          />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
            <span className="font-medium text-slate-700">결석자 일괄 사유:</span>
            <input
              type="text"
              value={bulkAbsenceMemo}
              onChange={(ev) => setBulkAbsenceMemo(ev.target.value)}
              placeholder="예: 재택 과제 제출"
              className="flex-1 rounded border border-slate-200 bg-white px-2 py-1"
            />
            <Button type="button" size="sm" variant="outline" onClick={applyBulkMemo}>
              미체크자에게 일괄 적용
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || visibleEnrollments.length === 0}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
