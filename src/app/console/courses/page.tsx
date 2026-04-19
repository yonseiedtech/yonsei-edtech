"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/features/auth/AuthGuard";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Trash2, Power, Save, Upload, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { courseOfferingsApi } from "@/lib/bkend";
import {
  COURSE_CATEGORY_LABELS,
  SEMESTER_TERM_LABELS,
  type CourseCategory,
  type CourseOffering,
  type SemesterTerm,
} from "@/types";

const TERMS: SemesterTerm[] = ["spring", "summer", "fall", "winter"];
const CATEGORIES: CourseCategory[] = [
  "major_required",
  "major_elective",
  "teaching_general",
  "other_major",
  "general",
  "research",
  "other",
];

interface NewRow {
  courseCode: string;
  courseName: string;
  professor: string;
  credits: string;
  category: CourseCategory;
  schedule: string;
  classroom: string;
  syllabusUrl: string;
  notes: string;
}

const EMPTY_NEW_ROW: NewRow = {
  courseCode: "",
  courseName: "",
  professor: "",
  credits: "",
  category: "major_elective",
  schedule: "",
  classroom: "",
  syllabusUrl: "",
  notes: "",
};

function nowYear() {
  return new Date().getFullYear();
}

function defaultTermForToday(): SemesterTerm {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 6) return "spring";
  if (m === 7 || m === 8) return "summer";
  if (m >= 9 && m <= 12) return "fall";
  return "winter";
}

function ConsoleCoursesContent() {
  const { user: viewer } = useAuthStore();
  const isStaff = isAtLeast(viewer, "staff");

  const [year, setYear] = useState<number>(nowYear());
  const [term, setTerm] = useState<SemesterTerm>(defaultTermForToday());
  const [rows, setRows] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<NewRow>(EMPTY_NEW_ROW);
  const [csvText, setCsvText] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<CourseCategory | "all">("all");

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await courseOfferingsApi.listBySemester(year, term);
        if (!cancelled) setRows(res.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "불러오지 못했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isStaff, year, term]);

  const stats = useMemo(() => {
    const total = rows.length;
    const inactive = rows.filter((r) => !r.active).length;
    return { total, active: total - inactive, inactive };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const filtered = filterCategory === "all"
      ? rows
      : rows.filter((r) => r.category === filterCategory);
    return [...filtered].sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return (a.courseName ?? "").localeCompare(b.courseName ?? "");
    });
  }, [rows, filterCategory]);

  async function handleAdd() {
    if (!newRow.courseName.trim()) {
      alert("과목명을 입력하세요");
      return;
    }
    if (!viewer?.id) return;
    setSavingId("__new__");
    try {
      const created = await courseOfferingsApi.create({
        year,
        term,
        courseCode: newRow.courseCode.trim() || undefined,
        courseName: newRow.courseName.trim(),
        professor: newRow.professor.trim() || undefined,
        credits: newRow.credits ? Number(newRow.credits) : undefined,
        category: newRow.category,
        schedule: newRow.schedule.trim() || undefined,
        classroom: newRow.classroom.trim() || undefined,
        syllabusUrl: newRow.syllabusUrl.trim() || undefined,
        notes: newRow.notes.trim() || undefined,
        active: true,
        createdBy: viewer.id,
      });
      setRows((prev) => [...prev, created]);
      setNewRow(EMPTY_NEW_ROW);
      toast.success(`"${created.courseName}" 과목이 저장되었습니다`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "추가 실패");
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleActive(row: CourseOffering) {
    if (savingId) return;
    setSavingId(row.id);
    try {
      const next = !row.active;
      await courseOfferingsApi.update(row.id, { active: next });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: next } : r)));
      toast.success(next ? "재활성화되었습니다" : "폐강 처리되었습니다");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "변경 실패");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(row: CourseOffering) {
    if (savingId) return;
    if (!confirm(`"${row.courseName}" 과목을 삭제하시겠습니까?`)) return;
    setSavingId(row.id);
    try {
      await courseOfferingsApi.delete(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("삭제되었습니다");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setSavingId(null);
    }
  }

  /**
   * 인라인 편집 배치 저장 — 변경된 필드만 모아서 한 번의 update 호출.
   * 필드별 N번 호출하던 기존 방식 폐기 (부분 실패 시 데이터 정합성 깨지는 문제 해결).
   */
  async function handleUpdateRow(
    row: CourseOffering,
    updates: Partial<CourseOffering>
  ) {
    if (savingId) return false;
    if (Object.keys(updates).length === 0) {
      toast.info("변경사항이 없습니다");
      return true;
    }
    setSavingId(row.id);
    try {
      await courseOfferingsApi.update(row.id, updates);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...updates } : r)));
      toast.success(`"${row.courseName}" 저장 완료`);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "수정 실패");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  /**
   * CSV 일괄 등록.
   * 헤더 또는 행 형식: 과목코드,과목명,교수,학점,분류,요일/시간,강의실,비고
   * 분류는 한글 라벨(전공필수/전공선택/...) 또는 영문 키 모두 허용.
   */
  async function handleImportCsv() {
    if (!viewer?.id) return;
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      alert("입력된 내용이 없습니다");
      return;
    }
    const labelToKey: Record<string, CourseCategory> = Object.entries(COURSE_CATEGORY_LABELS).reduce(
      (acc, [k, v]) => {
        acc[v] = k as CourseCategory;
        return acc;
      },
      {} as Record<string, CourseCategory>
    );
    const validKeys = new Set<CourseCategory>(CATEGORIES);

    const parsed = lines.map((line) => {
      const cols = line.split(/[\t,]/).map((c) => c.trim());
      // 헤더 라인 스킵 (과목명 또는 과목코드 헤더)
      if (cols[0] === "과목코드" || cols[1] === "과목명") return null;
      const rawCat = cols[4] ?? "";
      const cat: CourseCategory =
        validKeys.has(rawCat as CourseCategory)
          ? (rawCat as CourseCategory)
          : (labelToKey[rawCat] ?? "major_elective");
      const creditsNum = cols[3] ? Number(cols[3]) : undefined;
      return {
        year,
        term,
        courseCode: cols[0] || undefined,
        courseName: cols[1] || "",
        professor: cols[2] || undefined,
        credits: Number.isFinite(creditsNum) ? creditsNum : undefined,
        category: cat,
        schedule: cols[5] || undefined,
        classroom: cols[6] || undefined,
        notes: cols[7] || undefined,
        active: true,
        createdBy: viewer.id,
      };
    }).filter((r): r is NonNullable<typeof r> => !!r && !!r.courseName);

    if (parsed.length === 0) {
      alert("등록할 행이 없습니다 (과목명 컬럼 확인)");
      return;
    }
    if (!confirm(`${parsed.length}건을 등록하시겠습니까?`)) return;

    setSavingId("__csv__");
    let succeeded = 0;
    const created: CourseOffering[] = [];
    for (const p of parsed) {
      try {
        const c = await courseOfferingsApi.create(p);
        created.push(c);
        succeeded++;
      } catch (e) {
        console.error("CSV 행 등록 실패", p, e);
      }
    }
    setRows((prev) => [...prev, ...created]);
    setSavingId(null);
    setCsvText("");
    setCsvOpen(false);
    alert(`${succeeded}/${parsed.length} 건 등록 완료`);
  }

  if (!isStaff) {
    return (
      <div className="py-16">
        <p className="text-sm text-destructive">⚠ 운영진 권한이 필요합니다.</p>
      </div>
    );
  }

  const yearOptions: number[] = [];
  const cy = nowYear();
  for (let y = cy + 1; y >= cy - 8; y--) yearOptions.push(y);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <ConsolePageHeader
          icon={BookOpen}
          title="수강과목 마스터"
          description="학기별 개설 전공/교직/타전공 과목 리스트를 관리합니다. 폐강 처리 시 카탈로그에서 숨겨집니다."
        />

        {/* 학기 선택 + 통계 */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-muted-foreground">학기</p>
            <div className="mt-1 flex gap-2">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value as SemesterTerm)}
                className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>{SEMESTER_TERM_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <StatCard label="등록 과목" value={stats.total} />
          <StatCard label="개설 중" value={stats.active} tone="primary" />
          <StatCard label="폐강" value={stats.inactive} tone="muted" />
        </div>

        {/* 카테고리 필터 */}
        <div className="mt-4 flex flex-wrap gap-1">
          <FilterPill active={filterCategory === "all"} onClick={() => setFilterCategory("all")}>
            전체 ({rows.length})
          </FilterPill>
          {CATEGORIES.map((c) => {
            const cnt = rows.filter((r) => r.category === c).length;
            return (
              <FilterPill
                key={c}
                active={filterCategory === c}
                onClick={() => setFilterCategory(c)}
              >
                {COURSE_CATEGORY_LABELS[c]} ({cnt})
              </FilterPill>
            );
          })}
        </div>

        {/* CSV 일괄 등록 */}
        <div className="mt-4 rounded-xl border bg-white">
          <button
            type="button"
            onClick={() => setCsvOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-semibold hover:bg-muted/30"
          >
            <span className="flex items-center gap-2">
              <Upload size={14} />
              CSV·표 붙여넣기로 일괄 등록
            </span>
            <span className="text-xs text-muted-foreground">{csvOpen ? "닫기" : "열기"}</span>
          </button>
          {csvOpen && (
            <div className="border-t p-4">
              <p className="text-xs text-muted-foreground">
                컬럼 순서: <code>과목코드, 과목명, 교수, 학점, 분류, 요일/시간, 강의실, 비고</code>
                {" "}— 첫 줄이 헤더라면 자동 스킵. 분류는 한글 라벨(예: 전공필수)로 입력 가능.
              </p>
              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="EDU5001, 교수설계, 홍길동, 3, 전공필수, 월 18:30-21:00, 외솔관 401, 비고"
                rows={6}
                className="mt-2 font-mono text-xs"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setCsvText("")}>지우기</Button>
                <Button size="sm" onClick={handleImportCsv} disabled={savingId === "__csv__"}>
                  {savingId === "__csv__" ? "등록 중..." : "일괄 등록"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 새 과목 추가 폼 */}
        <div className="mt-4 rounded-xl border bg-white p-4">
          <p className="text-sm font-semibold">새 과목 추가</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Input
              placeholder="과목코드 (선택)"
              value={newRow.courseCode}
              onChange={(e) => setNewRow({ ...newRow, courseCode: e.target.value })}
            />
            <Input
              placeholder="과목명 *"
              value={newRow.courseName}
              onChange={(e) => setNewRow({ ...newRow, courseName: e.target.value })}
              className="sm:col-span-2"
            />
            <Input
              placeholder="교수"
              value={newRow.professor}
              onChange={(e) => setNewRow({ ...newRow, professor: e.target.value })}
            />
            <Input
              type="number"
              placeholder="학점"
              value={newRow.credits}
              onChange={(e) => setNewRow({ ...newRow, credits: e.target.value })}
            />
            <select
              value={newRow.category}
              onChange={(e) => setNewRow({ ...newRow, category: e.target.value as CourseCategory })}
              className="rounded-md border bg-background px-2 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{COURSE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <Input
              placeholder="요일/시간"
              value={newRow.schedule}
              onChange={(e) => setNewRow({ ...newRow, schedule: e.target.value })}
            />
            <Input
              placeholder="강의실"
              value={newRow.classroom}
              onChange={(e) => setNewRow({ ...newRow, classroom: e.target.value })}
            />
            <Input
              placeholder="강의계획서 URL (선택)"
              value={newRow.syllabusUrl}
              onChange={(e) => setNewRow({ ...newRow, syllabusUrl: e.target.value })}
            />
            <Input
              placeholder="비고"
              value={newRow.notes}
              onChange={(e) => setNewRow({ ...newRow, notes: e.target.value })}
              className="sm:col-span-3"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              * 과목명은 필수. 저장 시 즉시 목록에 반영됩니다.
            </span>
            <Button size="sm" onClick={handleAdd} disabled={savingId === "__new__"}>
              <Plus size={14} className="mr-1" />
              {savingId === "__new__" ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>

        {/* 목록 */}
        {loading ? (
          <LoadingSpinner className="mt-12" />
        ) : error ? (
          <p className="mt-12 text-sm text-destructive">⚠ {error}</p>
        ) : visibleRows.length === 0 ? (
          <p className="mt-12 text-sm text-muted-foreground">
            등록된 과목이 없습니다. 위에서 새 과목을 추가하거나 CSV를 붙여넣어 일괄 등록하세요.
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {visibleRows.map((r) => (
              <li
                key={r.id}
                className={`rounded-lg border bg-white p-3 ${r.active ? "" : "opacity-60"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {COURSE_CATEGORY_LABELS[r.category]}
                      </Badge>
                      {r.courseCode && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {r.courseCode}
                        </span>
                      )}
                      <span className="text-sm font-semibold">{r.courseName}</span>
                      {!r.active && (
                        <Badge variant="destructive" className="text-[10px]">폐강</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[r.professor, r.credits ? `${r.credits}학점` : null, r.schedule, r.classroom]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {r.notes && (
                      <p className="mt-1 text-[11px] text-foreground/70">📝 {r.notes}</p>
                    )}
                    {r.syllabusUrl && (
                      <a
                        href={r.syllabusUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-[11px] text-primary hover:underline"
                      >
                        강의계획서 →
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title={r.active ? "폐강 처리" : "재활성화"}
                      disabled={savingId === r.id}
                      onClick={() => handleToggleActive(r)}
                    >
                      <Power size={13} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={savingId === r.id}
                      onClick={() => handleDelete(r)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
                <InlineEditor row={r} onSaveRow={handleUpdateRow} disabled={savingId === r.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "primary" | "muted";
}) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          tone === "primary" ? "text-primary" : tone === "muted" ? "text-muted-foreground" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
    >
      {children}
    </button>
  );
}

function InlineEditor({
  row,
  onSaveRow,
  disabled,
}: {
  row: CourseOffering;
  onSaveRow: (row: CourseOffering, updates: Partial<CourseOffering>) => Promise<boolean>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const initial = useMemo(
    () => ({
      courseName: row.courseName,
      professor: row.professor ?? "",
      credits: row.credits != null ? String(row.credits) : "",
      schedule: row.schedule ?? "",
      classroom: row.classroom ?? "",
      syllabusUrl: row.syllabusUrl ?? "",
      notes: row.notes ?? "",
    }),
    [row]
  );
  const [draft, setDraft] = useState(initial);

  // row 가 외부에서 갱신되면(저장 후 setRows) draft 동기화
  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  // 변경사항 계산 — 저장 버튼 활성/비활성 판단에 사용
  const updates = useMemo(() => {
    const u: Partial<CourseOffering> = {};
    const trimmedName = draft.courseName.trim();
    if (trimmedName && trimmedName !== row.courseName) u.courseName = trimmedName;
    const profNew = draft.professor.trim() || undefined;
    if (profNew !== row.professor) u.professor = profNew;
    const creditsNew = draft.credits ? Number(draft.credits) : undefined;
    if (creditsNew !== row.credits) u.credits = creditsNew;
    const schedNew = draft.schedule.trim() || undefined;
    if (schedNew !== row.schedule) u.schedule = schedNew;
    const classNew = draft.classroom.trim() || undefined;
    if (classNew !== row.classroom) u.classroom = classNew;
    const sylNew = draft.syllabusUrl.trim() || undefined;
    if (sylNew !== row.syllabusUrl) u.syllabusUrl = sylNew;
    const notesNew = draft.notes.trim() || undefined;
    if (notesNew !== row.notes) u.notes = notesNew;
    return u;
  }, [draft, row]);

  const dirty = Object.keys(updates).length > 0;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/30 hover:text-primary"
      >
        <Pencil size={11} /> 편집
      </button>
    );
  }

  async function handleSave() {
    const ok = await onSaveRow(row, updates);
    if (ok) setOpen(false);
  }

  return (
    <div className="mt-3 rounded-md border bg-muted/20 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          value={draft.courseName}
          onChange={(e) => setDraft({ ...draft, courseName: e.target.value })}
          placeholder="과목명 *"
          className="sm:col-span-2"
        />
        <Input
          value={draft.professor}
          onChange={(e) => setDraft({ ...draft, professor: e.target.value })}
          placeholder="교수"
        />
        <Input
          type="number"
          value={draft.credits}
          onChange={(e) => setDraft({ ...draft, credits: e.target.value })}
          placeholder="학점"
        />
        <Input
          value={draft.schedule}
          onChange={(e) => setDraft({ ...draft, schedule: e.target.value })}
          placeholder="요일/시간"
        />
        <Input
          value={draft.classroom}
          onChange={(e) => setDraft({ ...draft, classroom: e.target.value })}
          placeholder="강의실"
        />
        <Input
          value={draft.syllabusUrl}
          onChange={(e) => setDraft({ ...draft, syllabusUrl: e.target.value })}
          placeholder="강의계획서 URL (선택)"
          className="sm:col-span-3"
        />
        <Input
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="비고"
          className="sm:col-span-3"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {dirty ? `변경된 항목: ${Object.keys(updates).length}개` : "변경사항 없음"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(initial);
              setOpen(false);
            }}
            disabled={disabled}
          >
            취소
          </Button>
          <Button size="sm" disabled={disabled || !dirty} onClick={handleSave}>
            <Save size={13} className="mr-1" />
            {disabled ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ConsoleCoursesPage() {
  return (
    <AuthGuard>
      <ConsoleCoursesContent />
    </AuthGuard>
  );
}
