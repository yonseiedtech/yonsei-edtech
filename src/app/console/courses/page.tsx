"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/features/auth/AuthGuard";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BookOpen,
  Plus,
  Trash2,
  Power,
  Save,
  Upload,
  Pencil,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  GraduationCap,
  Link2,
  Link2Off,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { courseOfferingsApi, courseEnrollmentsApi, profilesApi, comprehensiveExamsApi } from "@/lib/bkend";
import ScheduleEditor from "@/features/courses/ScheduleEditor";
import {
  COURSE_CATEGORY_LABELS,
  COMPREHENSIVE_EXAM_STATUS_LABELS,
  ENROLLMENT_ROLE_LABELS,
  SEMESTER_TERM_LABELS,
  type ComprehensiveExamRecord,
  type ComprehensiveExamStatus,
  type CourseCategory,
  type CourseEnrollment,
  type CourseOffering,
  type SemesterTerm,
  type User,
} from "@/types";

// 전기/후기 2학기 운영 (여름/겨울 학기 미사용)
const TERMS: SemesterTerm[] = ["spring", "fall"];
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

/**
 * Firestore/Firebase 에러를 한국어로 변환 + 운영자가 즉시 원인 파악 가능하게.
 * permission-denied 가 가장 흔한 케이스 (운영진/회장 role 누락) — 별도 안내.
 */
function formatFirestoreError(e: unknown, fallback: string): string {
  if (!e) return fallback;
  const err = e as { code?: string; message?: string };
  const code = err.code ?? "";
  const message = err.message ?? "";
  if (code === "permission-denied" || /Missing or insufficient permissions/i.test(message)) {
    return "권한이 없습니다 — 운영진(staff) 이상 권한이 필요합니다. 본인 계정 role 확인 필요.";
  }
  if (code === "unavailable" || /offline|network/i.test(message)) {
    return "네트워크 연결을 확인하세요";
  }
  if (code === "failed-precondition") {
    return "Firestore 인덱스 누락일 수 있습니다 (콘솔에서 인덱스 생성 필요)";
  }
  if (message) return `${fallback}: ${message}`;
  return fallback;
}

function defaultTermForToday(): SemesterTerm {
  const m = new Date().getMonth() + 1;
  // 3~8월 → 1학기, 9~2월 → 2학기 (여름/겨울 학기는 미운영)
  return m >= 3 && m <= 8 ? "spring" : "fall";
}

function categoryRank(c: CourseCategory): number {
  const i = CATEGORIES.indexOf(c);
  return i < 0 ? CATEGORIES.length : i;
}

function ConsoleCoursesContent() {
  const { user: viewer } = useAuthStore();
  const isStaff = isAtLeast(viewer, "staff");

  const [tab, setTab] = useState<string>("register");
  const [year, setYear] = useState<number>(nowYear());
  const [term, setTerm] = useState<SemesterTerm>(defaultTermForToday());
  const [rows, setRows] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<NewRow>(EMPTY_NEW_ROW);
  const [csvText, setCsvText] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);
  const xlsxFileRef = useRef<HTMLInputElement>(null);
  const [xlsxBusy, setXlsxBusy] = useState(false);
  const [xlsxResult, setXlsxResult] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<CourseCategory | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 회원 명단 — EnrollmentList 에서 회원 자동 매칭/연동에 사용. 첫 펼침 시점에 lazy fetch.
  const [members, setMembers] = useState<User[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);

  const ensureMembersLoaded = useCallback(async () => {
    if (membersLoaded || membersLoading) return;
    setMembersLoading(true);
    try {
      const res = await profilesApi.list({ limit: 1000 });
      setMembers(res.data);
      setMembersLoaded(true);
    } catch (e) {
      console.error("[courses/loadMembers] 실패", e);
      toast.error(formatFirestoreError(e, "회원 명단 로드 실패"), { duration: 6000 });
    } finally {
      setMembersLoading(false);
    }
  }, [membersLoaded, membersLoading]);

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
      const ra = categoryRank(a.category);
      const rb = categoryRank(b.category);
      if (ra !== rb) return ra - rb;
      return (a.courseName ?? "").localeCompare(b.courseName ?? "");
    });
  }, [rows, filterCategory]);

  async function handleAdd() {
    if (!newRow.courseName.trim()) {
      toast.error("과목명을 입력하세요");
      return;
    }
    if (!viewer?.id) {
      toast.error("로그인 상태를 확인하세요 (사용자 ID 없음)");
      return;
    }
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
      console.error("[courses/handleAdd] Firestore create 실패", e);
      toast.error(formatFirestoreError(e, "과목 추가 실패"), { duration: 8000 });
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
      console.error("[courses/handleToggleActive] 실패", e);
      toast.error(formatFirestoreError(e, "변경 실패"), { duration: 8000 });
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
      if (expandedId === row.id) setExpandedId(null);
      toast.success("삭제되었습니다");
    } catch (e) {
      console.error("[courses/handleDelete] 실패", e);
      toast.error(formatFirestoreError(e, "삭제 실패"), { duration: 8000 });
    } finally {
      setSavingId(null);
    }
  }

  /**
   * 인라인 편집 배치 저장 — 변경된 필드만 모아서 한 번의 update 호출.
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
      console.error("[courses/handleUpdateRow] 실패", { row: row.id, updates, e });
      toast.error(formatFirestoreError(e, "수정 실패"), { duration: 8000 });
      return false;
    } finally {
      setSavingId(null);
    }
  }

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

  /**
   * 연세 수강편람 .xlsx 일괄 등록/업데이트.
   *
   * 입력: 표준 수강편람 시트(헤더에 학기·과목종별·학정번호-분반-실습·교과목명·담당교수·강의시간·강의실 포함).
   * 동작:
   *  - 학기 셀("2026-1학기") → year/term 파싱(1→spring, 2→fall).
   *  - 과목종별: "전공"→major_required, "선택"→major_elective, 그 외 라벨도 시도(교직 등).
   *  - 강의시간 "목0/목3,4" → "/" 뒤("목3,4")만 schedule 로 저장.
   *  - 강의실 "동영상콘텐츠/교606" → "/" 뒤("교606")만 classroom 으로 저장.
   *  - 과목명이 같은 기존 행 있으면 update, 없으면 create.
   */
  async function handleImportXlsx(file: File) {
    if (!viewer?.id) {
      toast.error("로그인 상태를 확인하세요");
      return;
    }
    setXlsxBusy(true);
    setXlsxResult(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // header:1 로 헤더+행 모두 배열로 받음 — 헤더 셀에 줄바꿈("캠퍼\n스")이 섞여 있어 정규화 필요.
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
      });
      if (matrix.length < 2) {
        toast.error("데이터 행이 없습니다");
        setXlsxBusy(false);
        return;
      }
      const norm = (s: unknown) =>
        String(s ?? "")
          .replace(/\s+/g, "")
          .trim();
      const headers = (matrix[0] as unknown[]).map(norm);
      const findCol = (...candidates: string[]) => {
        for (const c of candidates) {
          const i = headers.findIndex((h) => h.includes(c));
          if (i >= 0) return i;
        }
        return -1;
      };
      const colSemester = findCol("학기");
      const colCategory = findCol("과목종별", "이수구분");
      const colCode = findCol("학정번호");
      const colCredits = findCol("학점");
      const colName = findCol("교과목명", "과목명");
      const colProf = findCol("담당교수", "교수");
      const colSchedule = findCol("강의시간");
      const colClassroom = findCol("강의실");
      const colNotes = findCol("기타유의사항", "비고");
      const colCanceled = findCol("폐강");

      if (colName < 0) {
        toast.error("교과목명 컬럼을 찾지 못했습니다");
        setXlsxBusy(false);
        return;
      }

      // "2026-1학기" → { year:2026, term:"spring" }
      const parseSemester = (raw: string): { year: number; term: SemesterTerm } | null => {
        const m = raw.match(/(\d{4})\s*-\s*([12])/);
        if (!m) return null;
        return { year: Number(m[1]), term: m[2] === "1" ? "spring" : "fall" };
      };
      // "전공"→major_required, "선택"→major_elective, "교직"→teaching_general, …
      const parseCategory = (raw: string): CourseCategory => {
        const t = raw.trim();
        if (t === "전공" || t === "전공필수") return "major_required";
        if (t === "선택" || t === "전공선택") return "major_elective";
        if (t.includes("교직")) return "teaching_general";
        if (t.includes("타전공")) return "other_major";
        if (t.includes("교양")) return "general";
        if (t.includes("연구")) return "research";
        return "major_elective";
      };
      // "목0/목3,4" → "목3,4" / 슬래시 없으면 그대로
      const parseAfterSlash = (raw: string): string | undefined => {
        const t = String(raw ?? "").trim();
        if (!t) return undefined;
        const idx = t.indexOf("/");
        return idx >= 0 ? t.slice(idx + 1).trim() : t;
      };

      // 같은 학기 기존 과목명 → row 룩업 (업데이트 판정용)
      const byName = new Map<string, CourseOffering>();
      for (const r of rows) {
        if (r.courseName) byName.set(r.courseName.trim(), r);
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const newOnes: CourseOffering[] = [];

      for (let i = 1; i < matrix.length; i++) {
        const row = matrix[i] as unknown[];
        const get = (idx: number) => (idx >= 0 ? String(row[idx] ?? "").trim() : "");
        const courseName = get(colName);
        if (!courseName) {
          skipped++;
          continue;
        }
        // 폐강 행은 active=false 로 표시(있으면), 새 데이터의 경우 등록 자체는 진행
        const isCanceled = colCanceled >= 0 && /[YyOo예]/.test(get(colCanceled));

        // 학기 파싱은 셀에 있으면 사용, 없으면 현재 선택된 year/term 으로 폴백
        let py = year;
        let pt: SemesterTerm = term;
        if (colSemester >= 0) {
          const parsed = parseSemester(get(colSemester));
          if (parsed) {
            py = parsed.year;
            pt = parsed.term;
          }
        }
        const cat = colCategory >= 0 ? parseCategory(get(colCategory)) : "major_elective";
        const credits = colCredits >= 0 ? Number(get(colCredits)) : NaN;
        const payload: Record<string, unknown> = {
          year: py,
          term: pt,
          courseCode: get(colCode) || undefined,
          courseName,
          professor: get(colProf) || undefined,
          credits: Number.isFinite(credits) ? credits : undefined,
          category: cat,
          schedule: parseAfterSlash(get(colSchedule)),
          classroom: parseAfterSlash(get(colClassroom)),
          notes: get(colNotes) || undefined,
          active: !isCanceled,
        };

        // 이미 같은 과목명이 등록돼 있으면 update, 아니면 create
        const exist = byName.get(courseName);
        try {
          if (exist) {
            const upd = await courseOfferingsApi.update(exist.id, payload);
            setRows((prev) => prev.map((x) => (x.id === exist.id ? { ...x, ...upd } : x)));
            updated++;
          } else {
            const c = await courseOfferingsApi.create({ ...payload, createdBy: viewer.id });
            newOnes.push(c);
            byName.set(courseName, c); // 같은 시트에 동일 과목명 중복 시에도 1건만 생성
            created++;
          }
        } catch (e) {
          console.error("[xlsx 행 처리 실패]", { courseName, payload, e });
          skipped++;
        }
      }
      if (newOnes.length > 0) setRows((prev) => [...prev, ...newOnes]);
      const msg = `완료: 신규 ${created}건 / 업데이트 ${updated}건 / 스킵 ${skipped}건`;
      setXlsxResult(msg);
      toast.success(msg, { duration: 8000 });
    } catch (e) {
      console.error("[xlsx 업로드 실패]", e);
      toast.error(e instanceof Error ? e.message : "엑셀 업로드 실패", { duration: 8000 });
    } finally {
      setXlsxBusy(false);
      if (xlsxFileRef.current) xlsxFileRef.current.value = "";
    }
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

  // 학기 선택 + 통계 위젯 — 등록/조회 탭에서 공유
  const semesterPicker = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
  );

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <ConsolePageHeader
          icon={BookOpen}
          title="수강과목 마스터"
          description="학기별 개설 전공/교직/타전공 과목과 수강생 명단을 관리합니다."
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as string)} className="mt-6">
          <TabsList>
            <TabsTrigger value="register">과목 등록</TabsTrigger>
            <TabsTrigger value="browse">과목 조회</TabsTrigger>
            <TabsTrigger value="exam">종합시험</TabsTrigger>
          </TabsList>

          {/* ───── 과목 등록 ───── */}
          <TabsContent value="register" className="mt-4 space-y-4">
            {semesterPicker}

            {/* 수강편람 .xlsx 일괄 등록/업데이트 */}
            <div className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Upload size={14} />
                    연세 수강편람 엑셀 업로드
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    표준 수강편람 .xlsx 형식.
                    학기·과목종별·교과목명·담당교수·강의시간·강의실 자동 인식.
                    과목명이 같으면 업데이트, 새 과목이면 등록합니다.
                  </p>
                </div>
                <input
                  ref={xlsxFileRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportXlsx(f);
                  }}
                  className="hidden"
                />
                <Button
                  size="sm"
                  onClick={() => xlsxFileRef.current?.click()}
                  disabled={xlsxBusy}
                >
                  <Upload size={14} className="mr-1" />
                  {xlsxBusy ? "업로드 중..." : "엑셀 파일 선택"}
                </Button>
              </div>
              {xlsxResult && (
                <p className="mt-2 text-xs text-emerald-700">✓ {xlsxResult}</p>
              )}
            </div>

            {/* CSV 일괄 등록 */}
            <div className="rounded-xl border bg-white">
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
            <div className="rounded-xl border bg-white p-4">
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
                <ScheduleEditor
                  value={newRow.schedule}
                  onChange={(v) => setNewRow({ ...newRow, schedule: v })}
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
          </TabsContent>

          {/* ───── 과목 조회 ───── */}
          <TabsContent value="browse" className="mt-4 space-y-4">
            {semesterPicker}

            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-1">
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

            {loading ? (
              <LoadingSpinner className="mt-12" />
            ) : error ? (
              <p className="mt-12 text-sm text-destructive">⚠ {error}</p>
            ) : visibleRows.length === 0 ? (
              <p className="mt-12 text-sm text-muted-foreground">
                등록된 과목이 없습니다. <strong>과목 등록</strong> 탭에서 추가하세요.
              </p>
            ) : (
              <ul className="space-y-2">
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
                          title="수강생 명단"
                          onClick={() => {
                            setExpandedId((cur) => (cur === r.id ? null : r.id));
                            void ensureMembersLoaded();
                          }}
                        >
                          <Users size={13} />
                          {expandedId === r.id ? (
                            <ChevronUp size={12} className="ml-0.5" />
                          ) : (
                            <ChevronDown size={12} className="ml-0.5" />
                          )}
                        </Button>
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
                    {expandedId === r.id && (
                      <EnrollmentList
                        course={r}
                        viewerId={viewer?.id}
                        members={members}
                        membersLoading={membersLoading}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* ───── 종합시험 ───── */}
          <TabsContent value="exam" className="mt-4 space-y-4">
            <ComprehensiveExamConsole year={year} term={term} setYear={setYear} setTerm={setTerm} />
          </TabsContent>
        </Tabs>
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

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

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
        <ScheduleEditor
          value={draft.schedule}
          onChange={(v) => setDraft({ ...draft, schedule: v })}
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

/**
 * 과목별 수강생 명단 — CRUD + 회원 계정 자동 연동.
 * 운영진 전용. 추가/편집/삭제 후 즉시 목록 반영.
 *
 * 회원 연동:
 * - MemberPicker 로 신규/편집 시 회원 검색·선택 → userId/name/studentId/email 자동 채움
 * - "이름 자동 매칭" 으로 userId 가 비어있는 기존 행을 회원 명단의 동명이인이 1명일 때만 일괄 연동
 * - 연동된 행: 이름 클릭 → /profile/{userId} 이동, "해제" 버튼으로 userId 만 비움
 */
type EnrollmentDraft = {
  userId?: string;
  studentName: string;
  studentId: string;
  email: string;
  role: NonNullable<CourseEnrollment["role"]>;
  notes: string;
};

const EMPTY_ENROLLMENT_DRAFT: EnrollmentDraft = {
  userId: undefined,
  studentName: "",
  studentId: "",
  email: "",
  role: "student",
  notes: "",
};

function EnrollmentList({
  course,
  viewerId,
  members,
  membersLoading,
}: {
  course: CourseOffering;
  viewerId?: string;
  members: User[];
  membersLoading: boolean;
}) {
  const [list, setList] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EnrollmentDraft>(EMPTY_ENROLLMENT_DRAFT);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<EnrollmentDraft>(EMPTY_ENROLLMENT_DRAFT);
  const [autoMatching, setAutoMatching] = useState(false);

  // userId → User 빠른 룩업 (행 표시용)
  const memberById = useMemo(() => {
    const m = new Map<string, User>();
    for (const u of members) m.set(u.id, u);
    return m;
  }, [members]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await courseEnrollmentsApi.listByCourse(course.id);
        if (!cancelled) {
          // 서버 sort 를 제거해 인덱스 요구를 회피했으므로 클라이언트에서 이름순 정렬.
          const sorted = [...res.data].sort((a, b) =>
            (a.studentName ?? "").localeCompare(b.studentName ?? "")
          );
          setList(sorted);
        }
      } catch (e) {
        console.error("[EnrollmentList/list] 실패", e);
        if (!cancelled) setErr(formatFirestoreError(e, "수강생 명단을 불러오지 못했습니다"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [course.id]);

  async function handleCreate() {
    if (!newDraft.studentName.trim()) {
      toast.error("이름을 입력하세요");
      return;
    }
    if (!viewerId) {
      toast.error("로그인 상태를 확인하세요");
      return;
    }
    setBusy("__new__");
    try {
      const created = await courseEnrollmentsApi.create({
        courseOfferingId: course.id,
        year: course.year,
        term: course.term,
        userId: newDraft.userId || undefined,
        studentName: newDraft.studentName.trim(),
        studentId: newDraft.studentId.trim() || undefined,
        email: newDraft.email.trim() || undefined,
        role: newDraft.role,
        notes: newDraft.notes.trim() || undefined,
        createdBy: viewerId,
      });
      setList((prev) =>
        [...prev, created].sort((a, b) =>
          (a.studentName ?? "").localeCompare(b.studentName ?? "")
        )
      );
      setNewDraft(EMPTY_ENROLLMENT_DRAFT);
      setAdding(false);
      toast.success(`"${created.studentName}" 추가됨`);
    } catch (e) {
      console.error("[EnrollmentList/create] 실패", e);
      toast.error(formatFirestoreError(e, "추가 실패"), { duration: 8000 });
    } finally {
      setBusy(null);
    }
  }

  function startEdit(row: CourseEnrollment) {
    setEditingId(row.id);
    setEditDraft({
      userId: row.userId,
      studentName: row.studentName ?? "",
      studentId: row.studentId ?? "",
      email: row.email ?? "",
      role: row.role ?? "student",
      notes: row.notes ?? "",
    });
  }

  async function handleSaveEdit(row: CourseEnrollment) {
    if (!editDraft.studentName.trim()) {
      toast.error("이름은 필수");
      return;
    }
    setBusy(row.id);
    try {
      // userId 는 명시적으로 변경된 경우만 patch (해제하려면 빈 문자열로 보냄 → undefined)
      const updates: Record<string, unknown> = {
        studentName: editDraft.studentName.trim(),
        studentId: editDraft.studentId.trim() || undefined,
        email: editDraft.email.trim() || undefined,
        role: editDraft.role,
        notes: editDraft.notes.trim() || undefined,
        userId: editDraft.userId || undefined,
      };
      await courseEnrollmentsApi.update(row.id, updates);
      setList((prev) =>
        prev
          .map((r) => (r.id === row.id ? { ...r, ...updates } as CourseEnrollment : r))
          .sort((a, b) => (a.studentName ?? "").localeCompare(b.studentName ?? ""))
      );
      setEditingId(null);
      toast.success("수정 완료");
    } catch (e) {
      console.error("[EnrollmentList/update] 실패", e);
      toast.error(formatFirestoreError(e, "수정 실패"), { duration: 8000 });
    } finally {
      setBusy(null);
    }
  }

  /**
   * 회원 자동 매칭 — userId 가 비어있는 모든 행에 대해 회원 명단에서 동명(정확 일치) 검색.
   * 동명이인이 1명일 때만 연동, 0명/2명 이상은 스킵.
   */
  async function handleAutoMatch() {
    if (members.length === 0) {
      toast.error("회원 명단이 아직 로드되지 않았습니다");
      return;
    }
    const candidates = list.filter((r) => !r.userId && r.studentName?.trim());
    if (candidates.length === 0) {
      toast.info("연동할 행이 없습니다 (이미 모두 연동되었거나 이름이 비어있음)");
      return;
    }
    const nameIndex = new Map<string, User[]>();
    for (const u of members) {
      const key = u.name?.trim();
      if (!key) continue;
      const arr = nameIndex.get(key);
      if (arr) arr.push(u);
      else nameIndex.set(key, [u]);
    }
    const plan: Array<{ row: CourseEnrollment; user: User }> = [];
    let ambiguous = 0;
    let unmatched = 0;
    for (const r of candidates) {
      const matches = nameIndex.get(r.studentName!.trim()) ?? [];
      if (matches.length === 1) plan.push({ row: r, user: matches[0] });
      else if (matches.length > 1) ambiguous++;
      else unmatched++;
    }
    if (plan.length === 0) {
      toast.info(
        `매칭 가능한 항목 없음 (모호 ${ambiguous}건, 미일치 ${unmatched}건)`,
        { duration: 6000 }
      );
      return;
    }
    if (
      !confirm(
        `${plan.length}건을 자동 연동합니다.\n` +
          `(모호 ${ambiguous}건, 미일치 ${unmatched}건은 수동 처리 필요)\n계속하시겠습니까?`
      )
    ) {
      return;
    }
    setAutoMatching(true);
    let succeeded = 0;
    const updatedRows: CourseEnrollment[] = [];
    for (const { row, user } of plan) {
      try {
        const patch: Record<string, unknown> = {
          userId: user.id,
          studentId: row.studentId || user.studentId || undefined,
          email: row.email || user.email || undefined,
        };
        await courseEnrollmentsApi.update(row.id, patch);
        updatedRows.push({ ...row, ...patch } as CourseEnrollment);
        succeeded++;
      } catch (e) {
        console.error("[EnrollmentList/autoMatch] 실패", { row: row.id, e });
      }
    }
    setList((prev) => {
      const map = new Map(updatedRows.map((r) => [r.id, r]));
      return prev.map((r) => map.get(r.id) ?? r);
    });
    setAutoMatching(false);
    toast.success(`${succeeded}/${plan.length} 건 자동 연동 완료`);
  }

  /** 단일 행 연동 해제 — userId 만 비움 */
  async function handleUnlink(row: CourseEnrollment) {
    if (!row.userId) return;
    setBusy(row.id);
    try {
      await courseEnrollmentsApi.update(row.id, { userId: undefined });
      setList((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, userId: undefined } : r))
      );
      toast.success("연동 해제됨");
    } catch (e) {
      console.error("[EnrollmentList/unlink] 실패", e);
      toast.error(formatFirestoreError(e, "해제 실패"), { duration: 8000 });
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(row: CourseEnrollment) {
    if (!confirm(`"${row.studentName}" 항목을 삭제하시겠습니까?`)) return;
    setBusy(row.id);
    try {
      await courseEnrollmentsApi.delete(row.id);
      setList((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("삭제됨");
    } catch (e) {
      console.error("[EnrollmentList/delete] 실패", e);
      toast.error(formatFirestoreError(e, "삭제 실패"), { duration: 8000 });
    } finally {
      setBusy(null);
    }
  }

  const linkedCount = list.filter((r) => !!r.userId).length;
  const unlinkedNamedCount = list.filter((r) => !r.userId && r.studentName?.trim()).length;

  return (
    <div className="mt-3 rounded-md border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <Users size={12} />
          수강생 명단
          <span className="text-[11px] font-normal text-muted-foreground">
            {loading
              ? "불러오는 중..."
              : `${list.length}명 · 회원 연동 ${linkedCount}/${list.length}`}
          </span>
        </p>
        <div className="flex items-center gap-1.5">
          {membersLoading && (
            <span className="text-[11px] text-muted-foreground">회원 명단 로드 중...</span>
          )}
          {!loading && unlinkedNamedCount > 0 && members.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAutoMatch}
              disabled={autoMatching}
              title="이름이 정확히 일치하는 회원만 자동 연동 (동명이인은 수동 처리)"
            >
              <Wand2 size={12} className="mr-1" />
              {autoMatching ? "매칭 중..." : `이름 자동 매칭 (${unlinkedNamedCount})`}
            </Button>
          )}
          {!adding && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus size={12} className="mr-1" /> 추가
            </Button>
          )}
        </div>
      </div>

      {err && <p className="mt-2 text-[11px] text-destructive">⚠ {err}</p>}

      {adding && (
        <div className="mt-3 rounded-md border bg-white p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <MemberPicker
                members={members}
                value={newDraft.userId}
                displayName={newDraft.studentName}
                onSelect={(u) =>
                  setNewDraft((d) => ({
                    ...d,
                    userId: u.id,
                    studentName: u.name,
                    studentId: d.studentId || u.studentId || "",
                    email: d.email || u.email || "",
                  }))
                }
                onUnlink={() => setNewDraft((d) => ({ ...d, userId: undefined }))}
                onTypeName={(name) =>
                  setNewDraft((d) => ({ ...d, studentName: name, userId: undefined }))
                }
                membersLoading={membersLoading}
              />
            </div>
            <Input
              placeholder="학번"
              value={newDraft.studentId}
              onChange={(e) => setNewDraft({ ...newDraft, studentId: e.target.value })}
            />
            <Input
              type="email"
              placeholder="이메일"
              value={newDraft.email}
              onChange={(e) => setNewDraft({ ...newDraft, email: e.target.value })}
            />
            <select
              value={newDraft.role}
              onChange={(e) =>
                setNewDraft({
                  ...newDraft,
                  role: e.target.value as NonNullable<CourseEnrollment["role"]>,
                })
              }
              className="rounded-md border bg-background px-2 py-2 text-sm"
            >
              {(Object.keys(ENROLLMENT_ROLE_LABELS) as Array<NonNullable<CourseEnrollment["role"]>>).map((k) => (
                <option key={k} value={k}>{ENROLLMENT_ROLE_LABELS[k]}</option>
              ))}
            </select>
            <Input
              placeholder="비고"
              value={newDraft.notes}
              onChange={(e) => setNewDraft({ ...newDraft, notes: e.target.value })}
              className="sm:col-span-3"
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setNewDraft(EMPTY_ENROLLMENT_DRAFT);
              }}
            >
              취소
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={busy === "__new__"}>
              {busy === "__new__" ? "추가 중..." : "추가"}
            </Button>
          </div>
        </div>
      )}

      {!loading && list.length === 0 && !adding && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          등록된 수강생이 없습니다. 우측 <strong>추가</strong> 버튼으로 등록하세요.
        </p>
      )}

      {list.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {list.map((r) => {
            const isEditing = editingId === r.id;
            if (isEditing) {
              return (
                <li key={r.id} className="rounded-md border bg-white p-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="sm:col-span-3">
                      <MemberPicker
                        members={members}
                        value={editDraft.userId}
                        displayName={editDraft.studentName}
                        onSelect={(u) =>
                          setEditDraft((d) => ({
                            ...d,
                            userId: u.id,
                            studentName: u.name,
                            studentId: d.studentId || u.studentId || "",
                            email: d.email || u.email || "",
                          }))
                        }
                        onUnlink={() => setEditDraft((d) => ({ ...d, userId: undefined }))}
                        onTypeName={(name) =>
                          setEditDraft((d) => ({ ...d, studentName: name, userId: undefined }))
                        }
                        membersLoading={membersLoading}
                      />
                    </div>
                    <Input
                      value={editDraft.studentId}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, studentId: e.target.value })
                      }
                      placeholder="학번"
                    />
                    <Input
                      type="email"
                      value={editDraft.email}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, email: e.target.value })
                      }
                      placeholder="이메일"
                    />
                    <select
                      value={editDraft.role}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          role: e.target.value as NonNullable<CourseEnrollment["role"]>,
                        })
                      }
                      className="rounded-md border bg-background px-2 py-2 text-sm"
                    >
                      {(Object.keys(ENROLLMENT_ROLE_LABELS) as Array<NonNullable<CourseEnrollment["role"]>>).map((k) => (
                        <option key={k} value={k}>{ENROLLMENT_ROLE_LABELS[k]}</option>
                      ))}
                    </select>
                    <Input
                      value={editDraft.notes}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, notes: e.target.value })
                      }
                      placeholder="비고"
                      className="sm:col-span-2"
                    />
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      disabled={busy === r.id}
                    >
                      <X size={12} className="mr-1" /> 취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(r)}
                      disabled={busy === r.id}
                    >
                      <Save size={12} className="mr-1" />
                      {busy === r.id ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </li>
              );
            }
            const linkedUser = r.userId ? memberById.get(r.userId) : undefined;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {r.userId ? (
                      <Link
                        href={`/profile/${r.userId}`}
                        className="text-sm font-medium text-primary hover:underline"
                        title={linkedUser ? `회원 프로필 — ${linkedUser.name}` : "회원 프로필"}
                      >
                        {r.studentName}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium">{r.studentName}</span>
                    )}
                    {r.userId && (
                      <Badge
                        variant="secondary"
                        className="border border-primary/20 bg-primary/10 text-[10px] text-primary"
                        title="회원 계정 연동됨"
                      >
                        <Link2 size={9} className="mr-0.5" />
                        회원 연동
                      </Badge>
                    )}
                    {r.role && r.role !== "student" && (
                      <Badge variant="outline" className="text-[10px]">
                        {ENROLLMENT_ROLE_LABELS[r.role]}
                      </Badge>
                    )}
                    {r.studentId && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {r.studentId}
                      </span>
                    )}
                  </div>
                  {(r.email || r.notes) && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {[r.email, r.notes].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {r.userId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="회원 연동 해제"
                      onClick={() => handleUnlink(r)}
                      disabled={busy === r.id}
                    >
                      <Link2Off size={12} />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    title="편집"
                    onClick={() => startEdit(r)}
                    disabled={busy === r.id}
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    title="삭제"
                    onClick={() => handleDelete(r)}
                    disabled={busy === r.id}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * 회원 검색 + 선택 위젯.
 * - 입력창에 이름/이메일/학번 일부 입력 → 매칭되는 회원 최대 8명 드롭다운
 * - 회원 선택 → onSelect 콜백으로 userId/name/studentId/email 자동 채움
 * - 외부 클릭 시 드롭다운 닫힘
 * - 회원 연동 없이 직접 입력도 가능 (그냥 이름 타이핑)
 */
function MemberPicker({
  members,
  value,
  displayName,
  onSelect,
  onUnlink,
  onTypeName,
  membersLoading,
}: {
  members: User[];
  value?: string;
  displayName: string;
  onSelect: (u: User) => void;
  onUnlink: () => void;
  onTypeName: (name: string) => void;
  membersLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const matches = useMemo(() => {
    const q = (query || displayName || "").trim().toLowerCase();
    if (!q) return [] as User[];
    return members
      .filter((u) => {
        if (u.id === value) return false;
        const haystack = `${u.name ?? ""} ${u.email ?? ""} ${u.studentId ?? ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [members, query, displayName, value]);

  // 회원이 이미 연동된 경우: 칩 + 해제 버튼만 표시
  if (value) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-primary/5 px-3 py-2">
        <Link2 size={14} className="text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-[11px] text-muted-foreground">
            회원 연동됨 — 학번/이메일이 비어있으면 회원 정보로 채워집니다
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onUnlink}
          title="연동 해제"
        >
          <Link2Off size={12} className="mr-1" /> 해제
        </Button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        placeholder={
          membersLoading
            ? "회원 명단 로드 중..."
            : "이름 * (회원 검색: 이름·이메일·학번 일부 입력)"
        }
        value={displayName}
        onChange={(e) => {
          onTypeName(e.target.value);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border bg-white shadow-lg">
          {matches.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted/30"
                onMouseDown={(e) => {
                  // mousedown — onBlur 가 먼저 발화하지 않도록
                  e.preventDefault();
                  onSelect(u);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {u.name}
                  {u.role && (
                    <Badge variant="outline" className="text-[9px]">
                      {u.role}
                    </Badge>
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {[u.studentId, u.email].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !membersLoading && matches.length === 0 && (displayName.trim() || query.trim()) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-white px-3 py-2 text-[11px] text-muted-foreground shadow-lg">
          매칭되는 회원이 없습니다 — 이대로 저장하면 회원 비연동 외부 수강생으로 등록됩니다
        </div>
      )}
    </div>
  );
}

/**
 * 종합시험 운영 콘솔 — 학기별로 응시자 명단을 모아 보고, status(예정/신청/합격/불합격) 변경.
 * 회원 self-input 은 /courses 의 종합시험 입력 폼에서 이루어짐.
 */
function ComprehensiveExamConsole({
  year,
  term,
  setYear,
  setTerm,
}: {
  year: number;
  term: SemesterTerm;
  setYear: (y: number) => void;
  setTerm: (t: SemesterTerm) => void;
}) {
  const [records, setRecords] = useState<ComprehensiveExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const yearOptions: number[] = [];
  const cy = nowYear();
  for (let y = cy + 1; y >= cy - 8; y--) yearOptions.push(y);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await comprehensiveExamsApi.listBySemester(year, term);
        if (!cancelled) setRecords(res.data);
      } catch (e) {
        console.error("[exam-console] 실패", e);
        if (!cancelled) toast.error(formatFirestoreError(e, "응시 기록 조회 실패"), { duration: 8000 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, term]);

  async function setStatus(row: ComprehensiveExamRecord, next: ComprehensiveExamStatus) {
    setBusy(row.id);
    try {
      await comprehensiveExamsApi.update(row.id, { status: next });
      setRecords((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
      toast.success(`${row.studentName} → ${COMPREHENSIVE_EXAM_STATUS_LABELS[next]}`);
    } catch (e) {
      toast.error(formatFirestoreError(e, "상태 변경 실패"), { duration: 6000 });
    } finally {
      setBusy(null);
    }
  }

  async function remove(row: ComprehensiveExamRecord) {
    if (!confirm(`${row.studentName}님의 ${row.plannedYear}년 ${SEMESTER_TERM_LABELS[row.plannedTerm]} 응시 기록을 삭제하시겠습니까?`)) return;
    setBusy(row.id);
    try {
      await comprehensiveExamsApi.delete(row.id);
      setRecords((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("삭제되었습니다");
    } catch (e) {
      toast.error(formatFirestoreError(e, "삭제 실패"), { duration: 6000 });
    } finally {
      setBusy(null);
    }
  }

  const counts = useMemo(() => {
    const by: Record<ComprehensiveExamStatus, number> = { planning: 0, applied: 0, passed: 0, failed: 0 };
    for (const r of records) by[r.status] = (by[r.status] ?? 0) + 1;
    return by;
  }, [records]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <StatCard label="응시 예정" value={counts.planning} />
        <StatCard label="신청 완료" value={counts.applied} tone="primary" />
        <StatCard label="합격" value={counts.passed} tone="primary" />
        <StatCard label="불합격" value={counts.failed} tone="muted" />
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-start gap-2">
          <GraduationCap size={18} className="text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{year}년 {SEMESTER_TERM_LABELS[term]} 응시 기록</p>
            <p className="text-[11px] text-muted-foreground">
              회원이 <Link href="/courses" className="text-primary hover:underline">수강과목 페이지 → 종합시험</Link>에서 직접 등록한 소요조사·신청 결과를 확인하고 상태를 변경합니다.
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner className="mt-6" />
        ) : records.length === 0 ? (
          <p className="mt-6 text-center text-xs text-muted-foreground">해당 학기에 등록된 응시 기록이 없습니다.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {records.map((r) => (
              <li key={r.id} className="rounded-lg border bg-muted/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                      {r.userId ? (
                        <Link href={`/profile/${r.userId}`} className="hover:text-primary hover:underline">
                          {r.studentName}
                        </Link>
                      ) : (
                        <span>{r.studentName}</span>
                      )}
                      {r.studentId && (
                        <span className="font-mono text-[11px] text-muted-foreground">{r.studentId}</span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {COMPREHENSIVE_EXAM_STATUS_LABELS[r.status]}
                      </Badge>
                    </p>
                    {r.notes && (
                      <p className="mt-1 text-[11px] text-foreground/70">📝 {r.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {(["planning", "applied", "passed", "failed"] as ComprehensiveExamStatus[]).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={r.status === s ? "default" : "outline"}
                        disabled={busy === r.id || r.status === s}
                        onClick={() => setStatus(r, s)}
                        className="h-7 px-2 text-[11px]"
                      >
                        {COMPREHENSIVE_EXAM_STATUS_LABELS[s]}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === r.id}
                      onClick={() => remove(r)}
                      className="h-7 px-2 text-destructive"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function ConsoleCoursesPage() {
  return (
    <AuthGuard>
      <ConsoleCoursesContent />
    </AuthGuard>
  );
}
