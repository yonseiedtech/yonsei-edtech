"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays,
  Plus,
  Trash2,
  GraduationCap,
  PencilLine,
  FileCheck2,
  PartyPopper,
  Sun,
  ClipboardCheck,
  Gavel,
  type LucideIcon,
} from "lucide-react";
import {
  useAcademicCalendar,
  useUpdateAcademicCalendar,
  compareSemesterDesc,
  REVIEW_TYPE_LABEL,
  type AcademicCalendarEntry,
  type AcademicReview,
  type AcademicReviewType,
  pickActiveEntry,
  computeProgress,
} from "@/features/site-settings/useAcademicCalendar";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SEMANTIC, type SemanticTone } from "@/lib/design-tokens";
import { toast } from "sonner";

// ── 일정 행 정의 (핵심 마일스톤) ──
type CoreRow =
  | {
      kind: "single";
      key: "semesterStart" | "semesterEnd" | "breakEnd";
      label: string;
      icon: LucideIcon;
      tone: SemanticTone;
      required?: boolean;
    }
  | {
      kind: "period";
      startKey: "midtermStart" | "finalStart";
      endKey: "midtermEnd" | "finalEnd";
      label: string;
      icon: LucideIcon;
      tone: SemanticTone;
    };

const CORE_ROWS: CoreRow[] = [
  { kind: "single", key: "semesterStart", label: "개강", icon: GraduationCap, tone: "info", required: true },
  { kind: "period", startKey: "midtermStart", endKey: "midtermEnd", label: "중간고사", icon: PencilLine, tone: "warning" },
  { kind: "period", startKey: "finalStart", endKey: "finalEnd", label: "기말고사", icon: FileCheck2, tone: "danger" },
  { kind: "single", key: "semesterEnd", label: "종강", icon: PartyPopper, tone: "success", required: true },
  { kind: "single", key: "breakEnd", label: "방학 종료", icon: Sun, tone: "info" },
];

const REVIEW_META: Record<AcademicReviewType, { icon: LucideIcon; tone: SemanticTone }> = {
  preliminary: { icon: ClipboardCheck, tone: "warning" },
  final: { icon: Gavel, tone: "danger" },
};

// ── D-day 계산 ──
function kstToday(now: Date): Date {
  const kst = new Date(now.getTime() + 9 * 3600000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

function parseYmd(s: string | undefined | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** 시작일(+선택 종료일) 기준 D-day 라벨·톤. 진행 중이면 "진행 중", 지난 일정은 "종료". */
function computeDday(
  startStr: string | undefined,
  endStr?: string,
  now: Date = new Date(),
): { text: string; tone: SemanticTone } | null {
  const start = parseYmd(startStr);
  if (!start) return null;
  const end = parseYmd(endStr) ?? start;
  const today = kstToday(now);
  if (today < start) {
    const days = diffDays(today, start);
    return { text: `D-${days}`, tone: days <= 3 ? "danger" : days <= 7 ? "warning" : "default" };
  }
  if (today <= end) {
    // 단일일 당일이면 D-DAY, 기간 중이면 진행 중
    return start.getTime() === end.getTime()
      ? { text: "D-DAY", tone: "danger" }
      : { text: "진행 중", tone: "success" };
  }
  return { text: "종료", tone: "default" };
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function semesterLabel(e: Pick<AcademicCalendarEntry, "year" | "semester">): string {
  return `${e.year}년 ${e.semester === "first" ? "1학기 (전기)" : "2학기 (후기)"}`;
}

function semesterKey(e: Pick<AcademicCalendarEntry, "year" | "semester">): string {
  return `${e.year}-${e.semester}`;
}

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
    reviews: [],
    notes: "",
  };
}

// ── 배지·D-day 프리미티브 ──
function TypeBadge({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: SemanticTone }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        SEMANTIC[tone].chip,
      )}
    >
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

function DdayBadge({ start, end }: { start: string | undefined; end?: string }) {
  const dday = computeDday(start, end);
  if (!dday) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
        SEMANTIC[dday.tone].chip,
      )}
    >
      {dday.text}
    </span>
  );
}

export default function AcademicCalendarConsolePage() {
  const { value, recordId, isLoading } = useAcademicCalendar();
  const updateMutation = useUpdateAcademicCalendar();
  const [entries, setEntries] = useState<AcademicCalendarEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");

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
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [key]: val } : e)));
  }

  function addReview(idx: number, type: AcademicReviewType) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === idx
          ? {
              ...e,
              reviews: [
                ...(e.reviews ?? []),
                { id: newId(), type, startDate: "", endDate: "", notes: "" },
              ],
            }
          : e,
      ),
    );
  }

  function updateReview(idx: number, reviewId: string, patch: Partial<AcademicReview>) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === idx
          ? { ...e, reviews: (e.reviews ?? []).map((r) => (r.id === reviewId ? { ...r, ...patch } : r)) }
          : e,
      ),
    );
  }

  function removeReview(idx: number, reviewId: string) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === idx ? { ...e, reviews: (e.reviews ?? []).filter((r) => r.id !== reviewId) } : e,
      ),
    );
  }

  async function handleSave() {
    for (const e of entries) {
      const missing: string[] = [];
      if (!e.semesterStart) missing.push("개강일");
      if (!e.semesterEnd) missing.push("종강일");
      if (missing.length > 0) {
        toast.error(`${semesterLabel(e)}: 필수 항목 누락 (${missing.join(", ")})`);
        return;
      }
      for (const r of e.reviews ?? []) {
        if (!r.startDate) {
          toast.error(`${semesterLabel(e)}: ${REVIEW_TYPE_LABEL[r.type]} 시작일을 입력하세요.`);
          return;
        }
        if (r.endDate && r.endDate < r.startDate) {
          toast.error(`${semesterLabel(e)}: ${REVIEW_TYPE_LABEL[r.type]} 종료일이 시작일보다 빠릅니다.`);
          return;
        }
      }
    }
    // 저장 순서도 최신 학기 우선으로 정렬
    const sorted = [...entries].sort(compareSemesterDesc);
    try {
      await updateMutation.mutateAsync({ recordId, value: { entries: sorted } });
      setEntries(sorted);
      toast.success("학사일정을 저장했습니다.");
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    }
  }

  const activeEntry = entries.length > 0 ? pickActiveEntry(entries) : null;
  const activeProgress = activeEntry ? computeProgress(activeEntry) : null;

  // 화면 표시용: 최신 학기 우선 정렬 + 필터. 원본 인덱스를 보존해 편집이 올바른 항목에 반영되게 함.
  const displayList = entries
    .map((entry, idx) => ({ entry, idx }))
    .sort((a, b) => compareSemesterDesc(a.entry, b.entry))
    .filter(({ entry }) => filter === "all" || semesterKey(entry) === filter);

  // 필터 셀렉트 옵션 (최신순)
  const filterOptions = [...entries]
    .sort(compareSemesterDesc)
    .map((e) => ({ key: semesterKey(e), label: semesterLabel(e) }));

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={CalendarDays}
        title="학사일정 관리"
        description="학기별 개강·시험·심사·종강·방학 일정을 리스트로 관리하면 대시보드에 자동 반영됩니다."
      />

      {activeProgress && (
        <div className="rounded-2xl border bg-primary/5 p-4 text-sm">
          <p className="font-semibold">
            현재 적용 학기: {semesterLabel(activeProgress.entry)} · 진행도{" "}
            {activeProgress.percent.toFixed(1)}% ({activeProgress.phaseLabel})
          </p>
        </div>
      )}

      {/* 상단 툴바: 학기 필터 + 학기 추가 */}
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.length > 1 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">학기 필터</span>
            <select
              value={filter}
              onChange={(ev) => setFilter(ev.target.value)}
              className="rounded-md border bg-card px-3 py-1.5 text-sm"
            >
              <option value="all">전체 ({entries.length})</option>
              {filterOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button variant="outline" size="sm" onClick={addEntry} className="ml-auto">
          <Plus size={14} className="mr-1" /> 학기 추가
        </Button>
      </div>

      <div className="space-y-4">
        {entries.length === 0 && !isLoading && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            등록된 학기가 없습니다. &quot;학기 추가&quot; 버튼으로 첫 학기를 추가하세요.
          </div>
        )}

        {displayList.map(({ entry: e, idx }) => (
          <section key={idx} className="rounded-2xl border bg-card">
            {/* 학기 섹션 헤더 */}
            <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={e.year}
                  onChange={(ev) => updateField(idx, "year", Number(ev.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-sm">년</span>
                <select
                  value={e.semester}
                  onChange={(ev) =>
                    updateField(idx, "semester", ev.target.value as "first" | "second")
                  }
                  className="rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <option value="first">1학기 (전기)</option>
                  <option value="second">2학기 (후기)</option>
                </select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeEntry(idx)}
                className="ml-auto text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={14} className="mr-1" /> 학기 삭제
              </Button>
            </header>

            {/* 일정 리스트 */}
            <div className="divide-y">
              {/* 핵심 마일스톤 행 */}
              {CORE_ROWS.map((row) => {
                if (row.kind === "single") {
                  return (
                    <div key={row.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                      <TypeBadge icon={row.icon} label={row.label} tone={row.tone} />
                      {row.required && <span className="text-xs text-destructive">필수</span>}
                      <Input
                        type="date"
                        value={e[row.key] ?? ""}
                        onChange={(ev) => updateField(idx, row.key, ev.target.value)}
                        className="w-40"
                      />
                      <span className="ml-auto">
                        <DdayBadge start={e[row.key]} />
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={row.startKey} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <TypeBadge icon={row.icon} label={row.label} tone={row.tone} />
                    <span className="text-xs text-muted-foreground">기간</span>
                    <Input
                      type="date"
                      value={e[row.startKey] ?? ""}
                      onChange={(ev) => updateField(idx, row.startKey, ev.target.value)}
                      className="w-40"
                    />
                    <span className="text-muted-foreground">~</span>
                    <Input
                      type="date"
                      value={e[row.endKey] ?? ""}
                      onChange={(ev) => updateField(idx, row.endKey, ev.target.value)}
                      className="w-40"
                    />
                    <span className="ml-auto">
                      <DdayBadge start={e[row.startKey]} end={e[row.endKey]} />
                    </span>
                  </div>
                );
              })}

              {/* 심사 일정 행 (예비심사·본심사) */}
              {(e.reviews ?? []).map((r) => {
                const meta = REVIEW_META[r.type];
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <TypeBadge icon={meta.icon} label={REVIEW_TYPE_LABEL[r.type]} tone={meta.tone} />
                    <span className="text-xs text-muted-foreground">기간</span>
                    <Input
                      type="date"
                      value={r.startDate}
                      onChange={(ev) => updateReview(idx, r.id, { startDate: ev.target.value })}
                      className="w-40"
                    />
                    <span className="text-muted-foreground">~</span>
                    <Input
                      type="date"
                      value={r.endDate ?? ""}
                      onChange={(ev) => updateReview(idx, r.id, { endDate: ev.target.value })}
                      className="w-40"
                    />
                    <Input
                      value={r.notes ?? ""}
                      onChange={(ev) => updateReview(idx, r.id, { notes: ev.target.value })}
                      placeholder="메모 (예: 석사)"
                      className="w-32"
                    />
                    <span className="ml-auto flex items-center gap-2">
                      <DdayBadge start={r.startDate} end={r.endDate} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeReview(idx, r.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        aria-label="심사 일정 삭제"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 섹션 하단: 심사 추가 + 메모 */}
            <div className="space-y-3 border-t px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => addReview(idx, "preliminary")}>
                  <Plus size={14} className="mr-1" /> 예비심사 추가
                </Button>
                <Button variant="outline" size="sm" onClick={() => addReview(idx, "final")}>
                  <Plus size={14} className="mr-1" /> 본심사 추가
                </Button>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">메모 (선택)</span>
                <Input
                  value={e.notes ?? ""}
                  onChange={(ev) => updateField(idx, "notes", ev.target.value)}
                  placeholder="예: 추석 연휴 9/14~18, 임시휴강일 등"
                />
              </label>
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={addEntry}>
          <Plus size={14} className="mr-1" /> 학기 추가
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="ml-auto">
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}
