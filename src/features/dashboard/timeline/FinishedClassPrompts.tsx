"use client";

/**
 * FinishedClassPrompts — 오늘 수업 종료 후 메모·할 일 + 다음주 수업 형태 편집 프롬프트.
 * `DailyClassTimelineWidget` 에서 분할 (Phase B 단순 추출 — 기능 변경 X).
 */

import { ListChecks, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CLASS_SESSION_MODE_LABELS,
  type ClassSession,
  type ClassSessionMode,
  type CourseOffering,
} from "@/types";
import type { ParsedSchedule } from "@/lib/courseSchedule";
import { cn } from "@/lib/utils";
import { SEMANTIC } from "@/lib/design-tokens";
import { DAY_CHARS, MODE_BADGE } from "./types";

export interface FinishedClassEntry {
  offering: CourseOffering;
  parsed: ParsedSchedule;
}

export function FinishedClassPrompts({
  finishedToday,
  dismissedToday,
  currentTime,
  nextWeekDate,
  nextWeekSessionByCourse,
  savingNextMode,
  onMemo,
  onTodo,
  onDismiss,
  onSetNextMode,
}: {
  finishedToday: FinishedClassEntry[];
  dismissedToday: Record<string, boolean>;
  currentTime: Date;
  nextWeekDate: string;
  nextWeekSessionByCourse: Map<string, ClassSession>;
  savingNextMode: string | null;
  onMemo: (offering: CourseOffering) => void;
  onTodo: (offering: CourseOffering) => void;
  onDismiss: (offeringId: string) => void;
  onSetNextMode: (courseOfferingId: string, mode: ClassSessionMode) => void;
}) {
  if (finishedToday.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      {finishedToday.map(({ offering, parsed }) => {
        if (dismissedToday[offering.id]) return null;
        const nextWeekday =
          parsed.weekdays.length > 0
            ? DAY_CHARS[parsed.weekdays[0]]
            : DAY_CHARS[currentTime.getDay()];
        const nextSession = nextWeekSessionByCourse.get(offering.id);
        const nextMode: ClassSessionMode = nextSession?.mode ?? "in_person";
        const isSavingThis = savingNextMode?.startsWith(`${offering.id}__`);
        return (
          <div
            key={offering.id}
            className={cn("rounded-2xl border p-3", SEMANTIC.success.border, SEMANTIC.success.bg)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex-1 text-[13px]">
                <p className={cn("font-medium", SEMANTIC.success.titleStrong)}>
                  오늘도 <b>{offering.courseName}</b> 수업 들으시느라 고생하셨습니다.
                </p>
                <p className={cn("text-[11px]", SEMANTIC.success.textMuted)}>
                  오늘 수업에 대한 메모 또는 할 일을 남겨둘까요?
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMemo(offering)}
                >
                  <NotebookPen size={12} className="mr-1" /> 메모
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTodo(offering)}
                >
                  <ListChecks size={12} className="mr-1" /> 할 일
                </Button>
                <button
                  type="button"
                  onClick={() => onDismiss(offering.id)}
                  className="rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  닫기
                </button>
              </div>
            </div>

            {/* 다음주 수업 형태 편집 */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-success/30 pt-2">
              <span className={cn("text-[11px] font-medium", SEMANTIC.success.titleStrong)}>
                다음주 {nextWeekday}요일 ({nextWeekDate}) 수업 형태:
              </span>
              {(["in_person", "zoom", "assignment", "cancelled", "exam"] as ClassSessionMode[]).map(
                (m) => {
                  const active = nextMode === m;
                  const saving = savingNextMode === `${offering.id}__${m}`;
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={!!isSavingThis}
                      onClick={() => onSetNextMode(offering.id, m)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] transition-colors",
                        active
                          ? cn(
                              MODE_BADGE[m],
                              "border-current/30 ring-1 ring-current/30 font-medium",
                            )
                          : "border-success/30 bg-card text-success/70 hover:border-success/50 hover:bg-success/5",
                        isSavingThis && !saving && "opacity-50",
                      )}
                    >
                      {saving ? "저장중…" : CLASS_SESSION_MODE_LABELS[m]}
                    </button>
                  );
                },
              )}
              {!nextSession && (
                <span className="text-[10px] text-success/60">
                  (기본: 대면 — 변경하려면 클릭)
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
