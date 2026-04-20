"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ExternalLink,
  Filter,
  GraduationCap,
  Headphones,
  Megaphone,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import LoadingSpinner from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import {
  comprehensiveExamsApi,
  courseEnrollmentsApi,
  courseOfferingsApi,
} from "@/lib/bkend";
import {
  COMPREHENSIVE_EXAM_STATUS_LABELS,
  COURSE_CATEGORY_LABELS,
  ENROLLMENT_ROLE_LABELS,
  SEMESTER_TERM_LABELS,
  type ComprehensiveExamRecord,
  type ComprehensiveExamStatus,
  type CourseCategory,
  type CourseEnrollment,
  type CourseOffering,
  type SemesterTerm,
} from "@/types";
import ProfileCourses from "@/components/profile/ProfileCourses";

// 전기/후기만 운영
const TERMS: SemesterTerm[] = ["spring", "fall"];

// 커리큘럼 표시 순서
const CATEGORIES: CourseCategory[] = [
  "major_required",
  "major_elective",
  "teaching_general",
  "other_major",
  "general",
  "research",
  "other",
];
const MAJOR_CATS = new Set<CourseCategory>(["major_required", "major_elective"]);
const ELECTIVE_CATS = new Set<CourseCategory>([
  "teaching_general",
  "other_major",
  "general",
]);

function categoryRank(c: CourseCategory): number {
  const i = CATEGORIES.indexOf(c);
  return i < 0 ? CATEGORIES.length : i;
}

function nowYear() {
  return new Date().getFullYear();
}

function defaultTermForToday(): SemesterTerm {
  const m = new Date().getMonth() + 1;
  return m >= 3 && m <= 8 ? "spring" : "fall";
}

type EnrollMode = "none" | "student" | "auditor";

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

export default function CoursesPage() {
  const { user } = useAuthStore();
  const isReportViewer = isAtLeast(user, "president"); // 관리자/학회장
  const qc = useQueryClient();

  const [tab, setTab] = useState<string>("major");
  const [year, setYear] = useState<number>(nowYear());
  const [term, setTerm] = useState<SemesterTerm>(defaultTermForToday());
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<CourseCategory | "all">("all");

  const yearOptions: number[] = [];
  const cy = nowYear();
  for (let y = cy + 1; y >= cy - 8; y--) yearOptions.push(y);

  // ── 학기 과목 목록 ──────────────────────────────────────
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["courses-public", year, term],
    queryFn: async () => {
      const res = await courseOfferingsApi.listBySemester(year, term);
      return res.data.filter((r) => r.active !== false);
    },
    staleTime: 60_000,
  });

  // ── 본인 수강 이력 (전체) — 해당 학기 row 가 있는지 빠른 조회용 ──
  const { data: myEnrollments = [] } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as CourseEnrollment[];
      const res = await courseEnrollmentsApi.listByUser(user.id);
      return res.data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  /** courseOfferingId → 본인 enrollment 매핑 (해당 학기 한정) */
  const myMap = useMemo(() => {
    const m = new Map<string, CourseEnrollment>();
    for (const e of myEnrollments) {
      if (e.year === year && e.term === term) m.set(e.courseOfferingId, e);
    }
    return m;
  }, [myEnrollments, year, term]);

  function classify(catSet: Set<CourseCategory>) {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => catSet.has(r.category))
      .filter((r) => {
        if (filterCategory !== "all" && r.category !== filterCategory) return false;
        if (!q) return true;
        const hay = [r.courseName, r.professor, r.courseCode, r.classroom, r.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const ra = categoryRank(a.category);
        const rb = categoryRank(b.category);
        if (ra !== rb) return ra - rb;
        return (a.courseName ?? "").localeCompare(b.courseName ?? "");
      });
  }

  const majorRows = useMemo(() => classify(MAJOR_CATS), [rows, search, filterCategory]);
  const electiveRows = useMemo(() => classify(ELECTIVE_CATS), [rows, search, filterCategory]);

  function groupByCategory(list: CourseOffering[]) {
    const buckets = new Map<CourseCategory, CourseOffering[]>();
    for (const r of list) {
      const arr = buckets.get(r.category) ?? [];
      arr.push(r);
      buckets.set(r.category, arr);
    }
    return Array.from(buckets.entries()).sort(
      (a, b) => categoryRank(a[0]) - categoryRank(b[0])
    );
  }

  // ── 본인 수강 토글 ──────────────────────────────────────
  async function toggleEnrollment(course: CourseOffering, next: EnrollMode) {
    if (!user) {
      toast.error("로그인 후 이용 가능합니다");
      return;
    }
    const existing = myMap.get(course.id);
    try {
      if (next === "none") {
        if (!existing) return;
        await courseEnrollmentsApi.delete(existing.id);
        toast.success(`"${course.courseName}" 표시 해제`);
      } else if (existing) {
        const role = next === "student" ? "student" : "auditor";
        if (existing.role === role) return;
        await courseEnrollmentsApi.update(existing.id, { role });
        toast.success(`"${course.courseName}" → ${role === "student" ? "수강" : "청강"}`);
      } else {
        const role = next === "student" ? "student" : "auditor";
        await courseEnrollmentsApi.create({
          courseOfferingId: course.id,
          year: course.year,
          term: course.term,
          userId: user.id,
          studentName: user.name ?? "",
          studentId: user.studentId ?? undefined,
          email: user.email ?? undefined,
          role,
          createdBy: user.id,
        });
        toast.success(`"${course.courseName}" → ${role === "student" ? "수강" : "청강"}`);
      }
      await qc.invalidateQueries({ queryKey: ["my-enrollments", user.id] });
      await qc.invalidateQueries({ queryKey: ["profile-courses-enrollments", user.id] });
    } catch (e) {
      console.error("[toggleEnrollment] 실패", e);
      const msg = (e as Error).message ?? "변경 실패";
      toast.error(msg.includes("permission") ? "권한이 없습니다" : `변경 실패: ${msg}`);
    }
  }

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        {/* 헤더 */}
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">수강과목</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              학기별 개설 전공·교직·타전공 과목을 한눈에 보고, 본인 수강 여부를 표시하세요.
            </p>
          </div>
        </div>

        {/* 학기 선택 + 검색 */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
          <div className="rounded-lg border bg-white p-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground">검색</p>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="과목명·교수·강의실로 검색"
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* 종합시험 입력 (검색창 하단) */}
        <ComprehensiveExamPanel />

        {/* 카테고리 필터 */}
        <div className="mt-6 flex flex-wrap items-center gap-1.5">
          <Filter size={13} className="text-muted-foreground" />
          <FilterPill active={filterCategory === "all"} onClick={() => setFilterCategory("all")}>
            전체 ({rows.length})
          </FilterPill>
          {CATEGORIES.map((c) => {
            const cnt = rows.filter((r) => r.category === c).length;
            if (cnt === 0) return null;
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

        {/* 4-탭 구성 */}
        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="flex w-full flex-wrap gap-1">
            <TabsTrigger value="major">교육공학전공</TabsTrigger>
            <TabsTrigger value="elective">교양·타전공 강의후기</TabsTrigger>
            <TabsTrigger value="mine" disabled={!user}>
              내 수강기록
            </TabsTrigger>
            {isReportViewer && (
              <TabsTrigger value="report">조교 리포트</TabsTrigger>
            )}
          </TabsList>

          {/* 교육공학전공 — 본인 수강·청강 토글 */}
          <TabsContent value="major" className="mt-4">
            <CourseListSection
              loading={isLoading}
              error={error ? (error as Error).message : null}
              groups={groupByCategory(majorRows)}
              year={year}
              term={term}
              total={rows.length}
              myMap={myMap}
              showEnrollmentToggle={!!user}
              onToggle={toggleEnrollment}
            />
          </TabsContent>

          {/* 교양·타전공 강의후기 */}
          <TabsContent value="elective" className="mt-4">
            <ElectiveSection
              loading={isLoading}
              error={error ? (error as Error).message : null}
              groups={groupByCategory(electiveRows)}
              year={year}
              term={term}
            />
          </TabsContent>

          {/* 내 수강기록 */}
          <TabsContent value="mine" className="mt-4">
            {user ? (
              <ProfileCourses ownerId={user.id} canSeeSensitive />
            ) : (
              <p className="rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                로그인 후 이용 가능합니다.
              </p>
            )}
          </TabsContent>

          {/* 조교 리포트 (관리자·학회장 전용) */}
          {isReportViewer && (
            <TabsContent value="report" className="mt-4">
              <TaReportSection year={year} term={term} />
            </TabsContent>
          )}
        </Tabs>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          ※ 본 정보는 학과 공식 시간표가 아닌 참고용입니다. 정확한 개설 여부는 학과 공지를 확인해 주세요.
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * 과목 목록 섹션 (전공)
 * ──────────────────────────────────────────────────────────── */

function CourseListSection({
  loading,
  error,
  groups,
  year,
  term,
  total,
  myMap,
  showEnrollmentToggle,
  onToggle,
}: {
  loading: boolean;
  error: string | null;
  groups: [CourseCategory, CourseOffering[]][];
  year: number;
  term: SemesterTerm;
  total: number;
  myMap: Map<string, CourseEnrollment>;
  showEnrollmentToggle: boolean;
  onToggle: (course: CourseOffering, next: EnrollMode) => Promise<void>;
}) {
  if (loading) return <LoadingSpinner className="mt-12" />;
  if (error) return <p className="mt-12 text-sm text-destructive">⚠ {error}</p>;
  if (groups.length === 0) {
    return (
      <div className="mt-6 rounded-lg border bg-muted/20 p-8 text-center">
        <BookOpen size={28} className="mx-auto text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          {total === 0
            ? `${year}년 ${SEMESTER_TERM_LABELS[term]}에 등록된 전공 과목이 없습니다.`
            : "조건에 맞는 전공 과목이 없습니다."}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          운영진 등록 요청은{" "}
          <Link href="/contact" className="text-primary hover:underline">
            문의하기
          </Link>
          를 이용해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(([cat, list]) => (
        <section key={cat}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            {COURSE_CATEGORY_LABELS[cat]}
            <span className="text-xs font-normal text-muted-foreground">{list.length}과목</span>
          </h2>
          <ul className="space-y-2">
            {list.map((r) => (
              <CourseRow
                key={r.id}
                course={r}
                mine={myMap.get(r.id)}
                showToggle={showEnrollmentToggle}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CourseRow({
  course,
  mine,
  showToggle,
  onToggle,
}: {
  course: CourseOffering;
  mine?: CourseEnrollment;
  showToggle: boolean;
  onToggle: (course: CourseOffering, next: EnrollMode) => Promise<void>;
}) {
  const current: EnrollMode =
    mine?.role === "auditor" ? "auditor" : mine ? "student" : "none";

  return (
    <li className="rounded-lg border bg-white p-3 transition-shadow hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {course.courseCode && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {course.courseCode}
              </span>
            )}
            <span className="text-sm font-semibold">{course.courseName}</span>
            {course.credits != null && (
              <Badge variant="secondary" className="text-[10px]">
                {course.credits}학점
              </Badge>
            )}
            {current === "student" && (
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">수강 중</Badge>
            )}
            {current === "auditor" && (
              <Badge className="bg-amber-100 text-amber-700 text-[10px]">청강 중</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {[
              course.professor ? `👤 ${course.professor}` : null,
              course.schedule ? `🗓 ${course.schedule}` : null,
              course.classroom ? `📍 ${course.classroom}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {course.notes && (
            <p className="mt-1 text-[11px] text-foreground/70">📝 {course.notes}</p>
          )}
        </div>
        {course.syllabusUrl && (
          <a
            href={course.syllabusUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            강의계획서 <ExternalLink size={11} />
          </a>
        )}
      </div>

      {showToggle && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-2">
          <span className="text-[11px] text-muted-foreground">내 수강 표시:</span>
          <ToggleChip
            active={current === "student"}
            onClick={() => onToggle(course, current === "student" ? "none" : "student")}
            icon={CheckCircle2}
            label="수강"
            color="emerald"
          />
          <ToggleChip
            active={current === "auditor"}
            onClick={() => onToggle(course, current === "auditor" ? "none" : "auditor")}
            icon={Headphones}
            label="청강"
            color="amber"
          />
          {current !== "none" && (
            <button
              type="button"
              onClick={() => onToggle(course, "none")}
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              해제
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function ToggleChip({
  active,
  onClick,
  icon: Icon,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  color: "emerald" | "amber";
}) {
  const palette =
    color === "emerald"
      ? active
        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
        : "bg-white text-muted-foreground border-border hover:bg-emerald-50"
      : active
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-white text-muted-foreground border-border hover:bg-amber-50";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${palette}`}
    >
      {active ? <Icon size={12} /> : <Circle size={12} />}
      {label}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────
 * 교양·타전공 강의후기 섹션
 * 후기 등록 기능은 추후 별도 사이클로. 현재는 조회 + Empty 안내.
 * ──────────────────────────────────────────────────────────── */

function ElectiveSection({
  loading,
  error,
  groups,
  year,
  term,
}: {
  loading: boolean;
  error: string | null;
  groups: [CourseCategory, CourseOffering[]][];
  year: number;
  term: SemesterTerm;
}) {
  if (loading) return <LoadingSpinner className="mt-12" />;
  if (error) return <p className="mt-12 text-sm text-destructive">⚠ {error}</p>;
  if (groups.length === 0) {
    return (
      <div className="mt-6 rounded-lg border bg-muted/20 p-8 text-center">
        <Megaphone size={28} className="mx-auto text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          {year}년 {SEMESTER_TERM_LABELS[term]}에 등록된 교양·타전공 과목이 없습니다.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-[11px] text-amber-800">
        💡 강의 선택에 도움이 될 후기·팁을 비고/메모 칸에 남겨주세요. 정식 강의평 시스템은 곧 도입 예정입니다.
      </div>
      {groups.map(([cat, list]) => (
        <section key={cat}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            {COURSE_CATEGORY_LABELS[cat]}
            <span className="text-xs font-normal text-muted-foreground">{list.length}과목</span>
          </h2>
          <ul className="space-y-2">
            {list.map((r) => (
              <li key={r.id} className="rounded-lg border bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.courseCode && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {r.courseCode}
                        </span>
                      )}
                      <span className="text-sm font-semibold">{r.courseName}</span>
                      {r.credits != null && (
                        <Badge variant="secondary" className="text-[10px]">
                          {r.credits}학점
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[r.professor, r.schedule, r.classroom].filter(Boolean).join(" · ")}
                    </p>
                    {r.notes && (
                      <p className="mt-1 text-[11px] text-foreground/70">📝 {r.notes}</p>
                    )}
                  </div>
                  {r.syllabusUrl && (
                    <a
                      href={r.syllabusUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                    >
                      강의계획서 <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * 종합시험 입력 패널 (회원 본인) — 검색창 하단
 * ──────────────────────────────────────────────────────────── */

function ComprehensiveExamPanel() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{
    plannedYear: number;
    plannedTerm: SemesterTerm;
    status: ComprehensiveExamStatus;
    notes: string;
  }>({
    plannedYear: nowYear(),
    plannedTerm: defaultTermForToday(),
    status: "planning",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: myExams = [] } = useQuery({
    queryKey: ["my-comp-exams", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ComprehensiveExamRecord[];
      const res = await comprehensiveExamsApi.listByUser(user.id);
      return res.data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (!user) return null;

  const yearOptions: number[] = [];
  const cy = nowYear();
  for (let y = cy + 1; y >= cy - 4; y--) yearOptions.push(y);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await comprehensiveExamsApi.create({
        userId: user.id,
        studentName: user.name ?? "",
        studentId: user.studentId ?? undefined,
        plannedYear: draft.plannedYear,
        plannedTerm: draft.plannedTerm,
        status: draft.status,
        notes: draft.notes.trim() || undefined,
        createdBy: user.id,
      });
      await qc.invalidateQueries({ queryKey: ["my-comp-exams", user.id] });
      toast.success("종합시험 응시 정보가 저장되었습니다");
      setOpen(false);
      setDraft({
        plannedYear: nowYear(),
        plannedTerm: defaultTermForToday(),
        status: "planning",
        notes: "",
      });
    } catch (e) {
      const msg = (e as Error).message ?? "저장 실패";
      toast.error(msg.includes("permission") ? "권한이 없습니다" : `저장 실패: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!user) return;
    if (!confirm("이 응시 기록을 삭제하시겠습니까?")) return;
    try {
      await comprehensiveExamsApi.delete(id);
      await qc.invalidateQueries({ queryKey: ["my-comp-exams", user.id] });
      toast.success("삭제되었습니다");
    } catch (e) {
      toast.error(`삭제 실패: ${(e as Error).message}`);
    }
  }

  return (
    <div className="mt-3 rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">종합시험 소요조사 / 신청·결과</h2>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={13} className="mr-1" /> 등록
        </Button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        응시 예정 학기를 미리 등록(소요조사)하고, 신청·결과까지 직접 갱신할 수 있습니다. 등록한 정보는 운영진(전공대표·학회장)이 학기별로 모아 확인합니다.
      </p>

      {myExams.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted-foreground">아직 등록된 응시 기록이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {myExams.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/10 px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">
                  {r.plannedYear}년 {SEMESTER_TERM_LABELS[r.plannedTerm]}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {COMPREHENSIVE_EXAM_STATUS_LABELS[r.status]}
                </Badge>
                {r.notes && (
                  <span className="text-[11px] text-muted-foreground">📝 {r.notes}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(r.id)}
                className="text-[11px] text-muted-foreground hover:text-destructive"
                aria-label="삭제"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>종합시험 응시 등록</DialogTitle>
            <DialogDescription>
              응시 예정 학기와 현재 진행 상태를 입력하세요. 결과가 나오면 다시 들어와 상태를 변경할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-muted-foreground">응시 예정 연도</span>
                <select
                  value={draft.plannedYear}
                  onChange={(e) => setDraft({ ...draft, plannedYear: Number(e.target.value) })}
                  className="rounded-md border bg-white px-3 py-2 text-sm"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-muted-foreground">학기</span>
                <select
                  value={draft.plannedTerm}
                  onChange={(e) => setDraft({ ...draft, plannedTerm: e.target.value as SemesterTerm })}
                  className="rounded-md border bg-white px-3 py-2 text-sm"
                >
                  {TERMS.map((t) => (
                    <option key={t} value={t}>{SEMESTER_TERM_LABELS[t]}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-muted-foreground">상태</span>
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as ComprehensiveExamStatus })}
                className="rounded-md border bg-white px-3 py-2 text-sm"
              >
                {(["planning", "applied", "passed", "failed"] as ComprehensiveExamStatus[]).map((s) => (
                  <option key={s} value={s}>{COMPREHENSIVE_EXAM_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-muted-foreground">메모 (응시 영역, 결과 상세 등)</span>
              <Input
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="예: 교수설계·학습이론 영역 응시"
              />
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * 조교 리포트 섹션 — 과목별 역대 수강생 현황
 * 권한: president 이상
 * ──────────────────────────────────────────────────────────── */

function TaReportSection({
  year,
  term,
}: {
  year: number;
  term: SemesterTerm;
}) {
  // 학기별 enrollment 전체 + offering 매핑
  const { data: enrollmentsRes, isLoading: loadingEnrollments } = useQuery({
    queryKey: ["ta-report-enrollments", year, term],
    queryFn: () => courseEnrollmentsApi.listBySemester(year, term),
    staleTime: 60_000,
  });
  const { data: offeringsRes, isLoading: loadingOfferings } = useQuery({
    queryKey: ["ta-report-offerings", year, term],
    queryFn: () => courseOfferingsApi.listBySemester(year, term),
    staleTime: 60_000,
  });

  const isLoading = loadingEnrollments || loadingOfferings;

  const courseGroups = useMemo(() => {
    const enrollments = enrollmentsRes?.data ?? [];
    const offerings = offeringsRes?.data ?? [];
    const offeringMap = new Map<string, CourseOffering>();
    for (const o of offerings) offeringMap.set(o.id, o);

    const grouped = new Map<
      string,
      {
        course: CourseOffering;
        students: CourseEnrollment[];
        auditors: CourseEnrollment[];
        tas: CourseEnrollment[];
      }
    >();
    for (const e of enrollments) {
      const course = offeringMap.get(e.courseOfferingId);
      if (!course) continue;
      let bucket = grouped.get(course.id);
      if (!bucket) {
        bucket = { course, students: [], auditors: [], tas: [] };
        grouped.set(course.id, bucket);
      }
      if (e.role === "auditor") bucket.auditors.push(e);
      else if (e.role === "ta") bucket.tas.push(e);
      else bucket.students.push(e);
    }
    return Array.from(grouped.values()).sort((a, b) => {
      const ra = categoryRank(a.course.category);
      const rb = categoryRank(b.course.category);
      if (ra !== rb) return ra - rb;
      return (a.course.courseName ?? "").localeCompare(b.course.courseName ?? "");
    });
  }, [enrollmentsRes, offeringsRes]);

  if (isLoading) return <LoadingSpinner className="mt-12" />;

  const totalEnrollments =
    (enrollmentsRes?.data ?? []).length;
  const totalStudents = courseGroups.reduce((acc, g) => acc + g.students.length, 0);
  const totalAuditors = courseGroups.reduce((acc, g) => acc + g.auditors.length, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
          <ShieldCheck size={14} /> 조교 리포트 — 운영진 전용
        </div>
        <p className="mt-1 text-[11px] text-blue-800/80">
          {year}년 {SEMESTER_TERM_LABELS[term]} · 등록 {totalEnrollments}건 (수강 {totalStudents}, 청강 {totalAuditors})
        </p>
      </div>

      {courseGroups.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <Users size={28} className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            해당 학기에 등록된 수강생 정보가 없습니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {courseGroups.map((g) => {
            const total = g.students.length + g.auditors.length + g.tas.length;
            return (
              <li key={g.course.id} className="rounded-lg border bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {COURSE_CATEGORY_LABELS[g.course.category]}
                      </Badge>
                      {g.course.courseCode && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {g.course.courseCode}
                        </span>
                      )}
                      <span className="text-sm font-semibold">{g.course.courseName}</span>
                      {g.course.professor && (
                        <span className="text-[11px] text-muted-foreground">· {g.course.professor}</span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      총 {total}명 · 수강 {g.students.length} · 청강 {g.auditors.length} · TA {g.tas.length}
                    </p>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t pt-2">
                    {[...g.students, ...g.auditors, ...g.tas].map((e) => (
                      <Link
                        key={e.id}
                        href={e.userId ? `/profile/${e.userId}` : "#"}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                          e.userId
                            ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {e.studentName}
                        {e.role && e.role !== "student" && (
                          <span className="text-[10px] text-muted-foreground">
                            · {ENROLLMENT_ROLE_LABELS[e.role]}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
