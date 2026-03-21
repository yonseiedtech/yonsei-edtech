"use client";

import { useState } from "react";
import { useSeminars, useUpdateSeminar } from "@/features/seminar/useSeminar";
import { createTimeline } from "./timeline-template";
import { resolveDate, isOverdue, formatDDay } from "./timeline-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Seminar, TimelinePhase } from "@/types";

export default function TimelineTab() {
  const { seminars } = useSeminars();
  const { updateSeminar } = useUpdateSeminar();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const seminar = seminars.find((s) => s.id === selectedId);
  const timeline: TimelinePhase[] = seminar?.timeline ?? [];

  function handleInit() {
    if (!seminar) return;
    const tl = createTimeline();
    updateSeminar({ id: seminar.id, data: { timeline: tl } as Partial<Seminar> });
    toast.success("타임라인이 초기화되었습니다.");
  }

  function handleToggle(phaseId: string) {
    if (!seminar) return;
    const updated = timeline.map((p) =>
      p.id === phaseId
        ? { ...p, done: !p.done, doneAt: !p.done ? new Date().toISOString() : undefined }
        : p,
    );
    updateSeminar({ id: seminar.id, data: { timeline: updated } as Partial<Seminar> });
  }

  function handleMemoChange(phaseId: string, memo: string) {
    if (!seminar) return;
    const updated = timeline.map((p) =>
      p.id === phaseId ? { ...p, memo } : p,
    );
    updateSeminar({ id: seminar.id, data: { timeline: updated } as Partial<Seminar> });
  }

  return (
    <div className="space-y-6">
      {/* 세미나 선택 */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium">세미나 선택</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">-- 세미나를 선택하세요 --</option>
            {seminars.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.date})
              </option>
            ))}
          </select>
        </div>
        {seminar && timeline.length === 0 && (
          <Button onClick={handleInit} size="sm">
            <RotateCcw size={14} className="mr-1" />
            타임라인 초기화
          </Button>
        )}
      </div>

      {/* 타임라인 체크리스트 */}
      {seminar && timeline.length > 0 && (
        <div className="rounded-xl border bg-white">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                세미나 날짜: {seminar.date} | 완료: {timeline.filter((p) => p.done).length}/{timeline.length}
              </span>
              <Button variant="outline" size="sm" onClick={handleInit}>
                <RotateCcw size={14} className="mr-1" />
                초기화
              </Button>
            </div>
          </div>

          <div className="divide-y">
            {timeline
              .sort((a, b) => a.dDay - b.dDay)
              .map((phase) => {
                const overdue = isOverdue(seminar.date, phase);
                const targetDate = resolveDate(seminar.date, phase.dDay);

                return (
                  <div
                    key={phase.id}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3",
                      overdue && "bg-red-50",
                    )}
                  >
                    {/* 체크박스 */}
                    <button
                      onClick={() => handleToggle(phase.id)}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        phase.done
                          ? "border-green-500 bg-green-500 text-white"
                          : overdue
                            ? "border-red-400"
                            : "border-muted-foreground/30",
                      )}
                    >
                      {phase.done && <Check size={14} />}
                    </button>

                    {/* D-day 배지 */}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "w-14 justify-center text-xs",
                        overdue && !phase.done && "bg-red-100 text-red-700",
                      )}
                    >
                      {formatDDay(phase.dDay)}
                    </Badge>

                    {/* 라벨 + 날짜 */}
                    <div className="flex-1">
                      <span className={cn("text-sm", phase.done && "text-muted-foreground line-through")}>
                        {phase.label}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">{targetDate}</span>
                    </div>

                    {/* 경고 아이콘 */}
                    {overdue && !phase.done && (
                      <AlertTriangle size={16} className="shrink-0 text-red-500" />
                    )}

                    {/* 메모 */}
                    <Input
                      placeholder="메모"
                      value={phase.memo ?? ""}
                      onChange={(e) => handleMemoChange(phase.id, e.target.value)}
                      className="w-40 text-xs"
                    />
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {seminar && timeline.length === 0 && (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">
          아직 타임라인이 설정되지 않았습니다. &quot;타임라인 초기화&quot; 버튼을 클릭하세요.
        </div>
      )}
    </div>
  );
}
