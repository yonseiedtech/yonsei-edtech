"use client";

/**
 * 시간대별 가능 인원 시간표.
 * 자원봉사 신청자의 schedule 답변을 집계해 슬롯별 가능 인원 수·이름을 표시한다.
 * 인원이 적은 슬롯(부족 경고)을 시각적으로 강조.
 */

import { useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import type { Activity, ApplicantEntry, FormField } from "@/types";
import EmptyState from "@/components/ui/empty-state";
import {
  aggregateAvailability,
  buildTimeGrid,
  collectScheduleFields,
  formatDateLabel,
  parseScheduleAnswer,
  type SlotAvailability,
} from "./volunteer-utils";

interface Props {
  activity: Activity | undefined;
  applicants: ApplicantEntry[];
}

/** 부족 경고 임계치 — 이 인원 이하 슬롯은 강조 */
const SHORTAGE_THRESHOLD = 2;

export default function AvailabilityTimeGrid({ activity, applicants }: Props) {
  const scheduleFields = useMemo(() => collectScheduleFields(activity), [activity]);
  const [fieldId, setFieldId] = useState<string>(scheduleFields[0]?.id ?? "");

  const activeField: FormField | undefined =
    scheduleFields.find((f) => f.id === fieldId) ?? scheduleFields[0];

  const grid = useMemo(
    () => buildTimeGrid(activity, activeField),
    [activity, activeField],
  );

  const { days, answeredCount } = useMemo(() => {
    if (!activeField) return { days: [], answeredCount: 0 };
    const parsed = applicants.map((a) => ({
      name: a.name || "(이름 미상)",
      answer: parseScheduleAnswer(a.answers?.[activeField.id]),
    }));
    return aggregateAvailability(grid, parsed);
  }, [grid, applicants, activeField]);

  const maxCount = useMemo(() => {
    let m = 0;
    for (const d of days) for (const s of d.slots) m = Math.max(m, s.names.length);
    return m;
  }, [days]);

  if (scheduleFields.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold">시간대별 가능 인원</h2>
        <EmptyState
          icon={CalendarRange}
          title="가능 시간대 폼이 없습니다"
          description="신청폼에 '시간표(schedule)' 또는 '가능한 날짜·시간' 질문을 추가하면 신청자의 가능 시간대가 집계됩니다."
          compact
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">시간대별 가능 인원</h2>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>응답 {answeredCount} / {applicants.length}명</span>
          {scheduleFields.length > 1 && (
            <select
              value={fieldId || scheduleFields[0]?.id}
              onChange={(e) => setFieldId(e.target.value)}
              className="rounded border bg-card px-1.5 py-0.5 text-[11px]"
            >
              {scheduleFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {grid.length === 0 || days.every((d) => d.slots.length === 0) ? (
        <p className="rounded-md border border-dashed bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          시간 그리드를 만들 수 없습니다. 활동 일자 또는 schedule 폼 설정을 확인하세요.
        </p>
      ) : answeredCount === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          아직 가능 시간대를 응답한 신청자가 없습니다.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-destructive/20" />
              부족 ({SHORTAGE_THRESHOLD}명 이하)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-success/20" />
              여유
            </span>
          </div>
          {days.map((day) => (
            <div key={day.date}>
              <p className="mb-1.5 text-xs font-semibold">{formatDateLabel(day.date)}</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                {day.slots.map((s) => (
                  <SlotCell key={`${s.slot.date}-${s.slot.startM}`} cell={s} maxCount={maxCount} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SlotCell({ cell, maxCount }: { cell: SlotAvailability; maxCount: number }) {
  const [open, setOpen] = useState(false);
  const count = cell.names.length;
  const shortage = count <= SHORTAGE_THRESHOLD;
  const ratio = maxCount > 0 ? count / maxCount : 0;

  return (
    <button
      type="button"
      onClick={() => count > 0 && setOpen((v) => !v)}
      className={`rounded-lg border p-2 text-left transition-colors ${
        shortage
          ? "border-destructive/30 bg-destructive/5"
          : "border-success/20 bg-success/5"
      } ${count > 0 ? "hover:brightness-95" : "cursor-default opacity-70"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tabular-nums">
          {cell.slot.start}–{cell.slot.end}
        </span>
        <span
          className={`text-xs font-bold tabular-nums ${
            shortage ? "text-destructive" : "text-success"
          }`}
        >
          {count}명
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${shortage ? "bg-destructive" : "bg-success"}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      {open && count > 0 && (
        <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
          {cell.names.join(", ")}
        </p>
      )}
    </button>
  );
}
