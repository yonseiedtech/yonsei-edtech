"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import {
  useAcademicCalendar,
  useUpdateAcademicCalendar,
  type AcademicCalendarEntry,
  pickActiveEntry,
  computeProgress,
} from "@/features/site-settings/useAcademicCalendar";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const FIELD_DEFS: { key: keyof AcademicCalendarEntry; label: string; required?: boolean }[] = [
  { key: "semesterStart", label: "개강일", required: true },
  { key: "midtermStart", label: "중간고사 시작" },
  { key: "midtermEnd", label: "중간고사 종료" },
  { key: "finalStart", label: "기말고사 시작" },
  { key: "finalEnd", label: "기말고사 종료" },
  { key: "semesterEnd", label: "종강일", required: true },
  { key: "breakEnd", label: "방학 종료" },
];

function blankEntry(year: number, semester: "first" | "second"): AcademicCalendarEntry {
  return {
    year,
    semester,
    semesterStart: "",
    midtermStart: "",
    midtermEnd: "",
    finalStart: "",
    finalEnd: "",
    semesterEnd: "",
    breakEnd: "",
    notes: "",
  };
}

export default function AcademicCalendarConsolePage() {
  const { value, recordId, isLoading } = useAcademicCalendar();
  const updateMutation = useUpdateAcademicCalendar();
  const [entries, setEntries] = useState<AcademicCalendarEntry[]>([]);

  useEffect(() => {
    if (!isLoading) setEntries(value.entries);
  }, [isLoading, value.entries]);

  function addEntry() {
    const now = new Date();
    const year = now.getFullYear();
    const semester: "first" | "second" = now.getMonth() + 1 >= 9 ? "second" : "first";
    setEntries((prev) => [...prev, blankEntry(year, semester)]);
  }

  function removeEntry(idx: number) {
    if (!confirm("이 학기 일정을 삭제하시겠습니까?")) return;
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateField<K extends keyof AcademicCalendarEntry>(
    idx: number,
    key: K,
    val: AcademicCalendarEntry[K],
  ) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [key]: val } : e)),
    );
  }

  async function handleSave() {
    // 필수 필드 검증 — 개강일/종강일 누락 시 대시보드 진행도 계산 불가
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const missing: string[] = [];
      if (!e.semesterStart) missing.push("개강일");
      if (!e.semesterEnd) missing.push("종강일");
      if (missing.length > 0) {
        const label = `${e.year}년 ${e.semester === "first" ? "1학기" : "2학기"}`;
        toast.error(`${label}: 필수 항목 누락 (${missing.join(", ")})`);
        return;
      }
    }
    // 정렬: year, semester (first → second)
    const sorted = [...entries].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.semester === "first" ? -1 : 1;
    });
    try {
      await updateMutation.mutateAsync({
        recordId,
        value: { entries: sorted },
      });
      setEntries(sorted);
      toast.success("학사일정을 저장했습니다.");
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    }
  }

  const activeEntry = entries.length > 0 ? pickActiveEntry(entries) : null;
  const activeProgress = activeEntry ? computeProgress(activeEntry) : null;

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={CalendarDays}
        title="학사일정 관리"
        description="학기별 개강·시험·종강·방학 일정을 입력하면 대시보드 진행바에 자동 반영됩니다."
      />

      {activeProgress && (
        <div className="rounded-xl border bg-primary/5 p-4 text-sm">
          <p className="font-semibold">
            현재 적용 학기: {activeProgress.entry.year}년{" "}
            {activeProgress.entry.semester === "first" ? "1학기" : "2학기"} · 진행도{" "}
            {activeProgress.percent.toFixed(1)}% ({activeProgress.phaseLabel})
          </p>
        </div>
      )}

      <div className="space-y-4">
        {entries.length === 0 && !isLoading && (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            등록된 학기가 없습니다. &quot;학기 추가&quot; 버튼으로 첫 학기를 추가하세요.
          </div>
        )}

        {entries.map((e, idx) => (
          <div key={idx} className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={e.year}
                  onChange={(ev) =>
                    updateField(idx, "year", Number(ev.target.value) || 0)
                  }
                  className="w-24"
                />
                <span className="text-sm">년</span>
                <select
                  value={e.semester}
                  onChange={(ev) =>
                    updateField(
                      idx,
                      "semester",
                      ev.target.value as "first" | "second",
                    )
                  }
                  className="rounded-md border bg-white px-3 py-2 text-sm"
                >
                  <option value="first">1학기 (전기)</option>
                  <option value="second">2학기 (후기)</option>
                </select>
              </div>
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeEntry(idx)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={14} className="mr-1" /> 삭제
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELD_DEFS.map((f) => (
                <label key={String(f.key)} className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </span>
                  <Input
                    type="date"
                    value={(e[f.key] as string) ?? ""}
                    onChange={(ev) =>
                      updateField(idx, f.key, ev.target.value as never)
                    }
                  />
                </label>
              ))}
            </div>

            <label className="mt-3 flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                메모 (선택)
              </span>
              <Input
                value={e.notes ?? ""}
                onChange={(ev) => updateField(idx, "notes", ev.target.value)}
                placeholder="예: 추석 연휴 9/14~18, 임시휴강일 등"
              />
            </label>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={addEntry}>
          <Plus size={14} className="mr-1" /> 학기 추가
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="ml-auto"
        >
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}
