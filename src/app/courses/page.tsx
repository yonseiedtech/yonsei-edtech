"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

import { Skeleton } from "@/components/ui/skeleton";
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
import CourseReviewBlock from "@/features/courses/CourseReviewBlock";
import ElectiveReviewsByName from "@/features/courses/ElectiveReviewsByName";

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
  return (
    <Suspense
      fallback={
        <div className="mt-24" aria-busy="true" aria-label="강의 목록 불러오는 중">
          <div className="mx-auto max-w-6xl space-y-4 px-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <CoursesPageInner />
    </Suspense>
  );
}

const VALID_TABS = new Set(["major", "elective", "mine", "report"]);

function CoursesPageInner() {
  const { user } = useAuthStore();
  const isReportViewer = isAtLeast(user, "president"); // 관리자/학회장
  const qc = useQueryClient();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const initialTab =
    tabFromUrl && VALID_TABS.has(tabFromUrl) ? tabFromUrl : "major";
  const [tab, setTab] = useState<string>(initialTab);

  // URL ?tab= 변경 시 동기화 (브라우저 뒤로가기/내부 링크 대응)
  useEffect(() => {
    if (tabFromUrl && VALID_TABS.has(tabFromUrl) && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);
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

  // 동시 클릭으로 인한 중복 enrollment 생성 방지용 in-flight lock
  const [pendingCourse, setPendingCourse] = useState<string | null>(null);

  // ── 본인 수강 토글 ──────────────────────────────────────
  async function toggleEnrollment(course: CourseOffering, next: EnrollMode) {
    if (!user) {
      toast.error("로그인 후 이용 가능합니다");
      return;
    }
    if (pendingCourse) return; // 다른 과목이 저장 중이면 무시
    setPendingCourse(course.id);
    try {
      // 중복 방지: 서버에서 본인 해당 학기 기록을 재조회해서
      // 모든 기존 row 를 수집 (cache 신뢰하지 않음)
      const latest = await courseEnrollmentsApi.listByUser(user.id);
      const dupes = latest.data.filter(
        (e) =>
          e.courseOfferingId === course.id &&
          e.year === course.year &&
          e.term === course.term,
      );

      if (next === "none") {
        if (dupes.length === 0) return;
        for (const d of dupes) await courseEnrollmentsApi.delete(d.id);
        toast.success(`"${course.courseName}" 표시 해제`);
      } else {
        const role = next === "student" ? "student" : "auditor";
        const [head, ...rest] = dupes;
        // 중복 제거: 첫 행만 남기고 나머지 삭제
        for (const d of rest) await courseEnrollmentsApi.delete(d.id);

        if (head) {
          if (head.role !== role) {
            await courseEnrollmentsApi.update(head.id, { role });
          }
        } else {
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
        }
        toast.success(`"${course.courseName}" → ${role === "student" ? "수강" : "청강"}`);
      }
      await qc.invalidateQueries({ queryKey: ["my-enrollments", user.id] });
      await qc.invalidateQueries({ queryKey: ["profile-courses-enrollments", user.id] });
      await qc.invalidateQueries({ queryKey: ["ta-report-enrollments"] });
    } catch (e) {
      console.error("[toggleEnrollment] 실패", e);
      const msg = (e as Error).message ?? "변경 실패";
      toast.error(
        msg.includes("permission") || msg.includes("Missing")
          ? "권한이 없습니다 (관리자에게 문의)"
          : `변경 실패: ${msg}`,
      );
    } finally {
      setPendingCourse(null);
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

          {/* 교양·타전공 강의후기 — 강의명별 학기별 모아보기 */}
          <TabsContent value="elective" className="mt-4">
            <ElectiveReviewsByName />
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
  if (loading) {
    return (
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="강의 불러오는 중">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) return <p className="mt-12 text-sm text-destructive" role="alert">⚠ {error}</p>;
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
    selectedCourseIds: string[];
  }>({
    plannedYear: nowYear(),
    plannedTerm: defaultTermForToday(),
    status: "planning",
    notes: "",
    selectedCourseIds: [],
  });
  const [saving, setSaving] = useState(false);

  // 누적학기 3학기 이상만 소요 등록 가능 (정책)
  const accumulated = (user?.accumulatedSemesters as number | undefined) ?? 0;
  const isEligible = accumulated >= 3;

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

  // 본인 전체 수강 이력 (student/ta 역할만) — 과목 2개 선택 풀
  const { data: myEnrollmentsAll = [] } = useQuery({
    queryKey: ["my-enrollments-all", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as CourseEnrollment[];
      const res = await courseEnrollmentsApi.listByUser(user.id);
      return res.data.filter((e) => e.role !== "auditor");
    },
    enabled: !!user?.id && open,
    staleTime: 30_000,
  });

  const courseIdsForLookup = useMemo(
    () =>
      Array.from(
        new Set(myEnrollmentsAll.map((e) => e.courseOfferingId).filter(Boolean)),
      ),
    [myEnrollmentsAll],
  );

  const { data: myCourseMap = new Map<string, CourseOffering>() } = useQuery({
    queryKey: ["my-courses-for-comp-exam", courseIdsForLookup.sort().join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        courseIdsForLookup.map(async (id) => {
          try {
            const c = (await courseOfferingsApi.get(id)) as unknown as CourseOffering;
            return [id, c] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      const m = new Map<string, CourseOffering>();
      for (const [id, c] of entries) if (c) m.set(id, c);
      return m;
    },
    enabled: courseIdsForLookup.length > 0,
    staleTime: 5 * 60_000,
  });

  const courseOptions = useMemo(() => {
    // 중복된 courseOfferingId 제거 + 과목명 + 학기 정렬
    const seen = new Set<string>();
    const list: Array<{ id: string; course: CourseOffering }> = [];
    for (const e of myEnrollmentsAll) {
      if (seen.has(e.courseOfferingId)) continue;
      const c = myCourseMap.get(e.courseOfferingId);
      if (!c) continue;
      seen.add(e.courseOfferingId);
      list.push({ id: e.courseOfferingId, course: c });
    }
    return list.sort((a, b) => {
      if (a.course.year !== b.course.year) return b.course.year - a.course.year;
      return (a.course.courseName ?? "").localeCompare(b.course.courseName ?? "");
    });
  }, [myEnrollmentsAll, myCourseMap]);

  if (!user) return null;

  const yearOptions: number[] = [];
  const cy = nowYear();
  for (let y = cy + 1; y >= cy - 4; y--) yearOptions.push(y);

  function toggleCourseSelection(courseId: string) {
    setDraft((d) => {
      const exists = d.selectedCourseIds.includes(courseId);
      if (exists) {
        return { ...d, selectedCourseIds: d.selectedCourseIds.filter((x) => x !== courseId) };
      }
      if (d.selectedCourseIds.length >= 2) {
        toast.error("응시 과목은 2개까지만 선택 가능합니다");
        return d;
      }
      return { ...d, selectedCourseIds: [...d.selectedCourseIds, courseId] };
    });
  }

  async function save() {
    if (!user) return;
    if (!isEligible) {
      toast.error("누적학기 3학기 이상 회원만 소요 등록 가능합니다");
      return;
    }
    if (draft.selectedCourseIds.length !== 2) {
      toast.error("본인 수강 과목 중 정확히 2개를 선택해 주세요");
      return;
    }
    setSaving(true);
    try {
      const selectedNames = draft.selectedCourseIds
        .map((id) => myCourseMap.get(id)?.courseName)
        .filter((n): n is string => !!n);
      await comprehensiveExamsApi.create({
        userId: user.id,
        studentName: user.name ?? "",
        studentId: user.studentId ?? undefined,
        plannedYear: draft.plannedYear,
        plannedTerm: draft.plannedTerm,
        status: draft.status,
        selectedCourseIds: draft.selectedCourseIds,
        selectedCourseNames: selectedNames,
        notes: draft.notes.trim() || undefined,
        createdBy: user.id,
      });
      await qc.invalidateQueries({ queryKey: ["my-comp-exams", user.id] });
      toast.success("종합시험 소요가 등록되었습니다");
      setOpen(false);
      setDraft({
        plannedYear: nowYear(),
        plannedTerm: defaultTermForToday(),
        status: "planning",
        notes: "",
        selectedCourseIds: [],
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
    if (!confirm("이 소요 등록을 삭제하시겠습니까?")) return;
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
          <h2 className="text-sm font-semibold">종합시험 소요 등록</h2>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} disabled={!isEligible}>
          <Plus size={13} className="mr-1" /> 소요 등록
        </Button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        응시 예정 학기를 미리 등록(소요조사)하고, 본인 수강 과목 중 2과목을 선택해 주세요. 신청·결과는 나중에 직접 갱신 가능합니다. 등록한 정보는 운영진(전공대표·학회장)이 학기별로 모아 확인합니다.
      </p>
      {!isEligible && (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50/70 px-2 py-1.5 text-[11px] text-amber-800">
          ⓘ 종합시험 소요 등록은 <b>누적학기 3학기 이상</b> 회원만 가능합니다. (현재: {accumulated}학기)
        </p>
      )}

      {myExams.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted-foreground">아직 등록된 소요 이력이 없습니다.</p>
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
                {r.selectedCourseNames && r.selectedCourseNames.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    📚 {r.selectedCourseNames.join(" / ")}
                  </span>
                )}
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
            <DialogTitle>종합시험 소요 등록</DialogTitle>
            <DialogDescription>
              응시 예정 학기와 본인 수강 과목 중 2개를 선택하세요. 상태(신청·결과)는 추후 갱신 가능합니다.
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

            {/* 응시 과목 2개 선택 */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                응시 과목 선택 (정확히 2개 · 본인 수강 이력 중) — 현재 {draft.selectedCourseIds.length}/2
              </p>
              {courseOptions.length === 0 ? (
                <p className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-[11px] text-muted-foreground">
                  본인 수강 이력에 수강(student)/조교(ta) 과목이 없습니다. 먼저 "수강과목" 에서 내 수강 표시를 해주세요.
                </p>
              ) : (
                <ul className="max-h-56 overflow-auto rounded-md border divide-y">
                  {courseOptions.map(({ id, course }) => {
                    const checked = draft.selectedCourseIds.includes(id);
                    return (
                      <li
                        key={id}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm ${
                          checked ? "bg-primary/5" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCourseSelection(id)}
                          className="h-3.5 w-3.5 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{course.courseName}</span>
                          <span className="ml-2 text-[11px] text-muted-foreground">
                            {course.year}년 {SEMESTER_TERM_LABELS[course.term]}
                            {course.professor ? ` · ${course.professor}` : ""}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

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
            <Button onClick={save} disabled={saving || draft.selectedCourseIds.length !== 2}>
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
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailCourse, setDetailCourse] = useState<CourseOffering | null>(null);
  // 학기별 enrollment 전체 + offering 매핑
  const { data: enrollmentsRes, isLoading: loadingEnrollments } = useQuery({
    queryKey: ["ta-report-enrollments", year, term],
    queryFn: () => courseEnrollmentsApi.listBySemester(year, term),
    staleTime: 60_000,
  });

  async function handleDelete(e: CourseEnrollment) {
    if (deletingId) return;
    if (!confirm(`${e.studentName} 학생의 수강 등록을 삭제하시겠습니까?`)) return;
    setDeletingId(e.id);
    try {
      await courseEnrollmentsApi.delete(e.id);
      await qc.invalidateQueries({ queryKey: ["ta-report-enrollments", year, term] });
      if (e.userId) {
        await qc.invalidateQueries({ queryKey: ["my-enrollments", e.userId] });
        await qc.invalidateQueries({ queryKey: ["profile-courses-enrollments", e.userId] });
      }
      toast.success("삭제되었습니다");
    } catch (err) {
      toast.error(`삭제 실패: ${(err as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  }
  const { data: offeringsRes, isLoading: loadingOfferings } = useQuery({
    queryKey: ["ta-report-offerings", year, term],
    queryFn: () => courseOfferingsApi.listBySemester(year, term),
    staleTime: 60_000,
  });

  const isLoading = loadingEnrollments || loadingOfferings;

  const { courseGroups, orphanEnrollments } = useMemo(() => {
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
    const orphans: CourseEnrollment[] = [];
    for (const e of enrollments) {
      const course = offeringMap.get(e.courseOfferingId);
      if (!course) {
        orphans.push(e);
        continue;
      }
      let bucket = grouped.get(course.id);
      if (!bucket) {
        bucket = { course, students: [], auditors: [], tas: [] };
        grouped.set(course.id, bucket);
      }
      if (e.role === "auditor") bucket.auditors.push(e);
      else if (e.role === "ta") bucket.tas.push(e);
      else bucket.students.push(e);
    }
    return {
      courseGroups: Array.from(grouped.values()).sort((a, b) => {
        const ra = categoryRank(a.course.category);
        const rb = categoryRank(b.course.category);
        if (ra !== rb) return ra - rb;
        return (a.course.courseName ?? "").localeCompare(b.course.courseName ?? "");
      }),
      orphanEnrollments: orphans,
    };
  }, [enrollmentsRes, offeringsRes]);

  if (isLoading) {
    return (
      <div className="mt-12 space-y-4" aria-busy="true" aria-label="수강 정보 불러오는 중">
        <Skeleton className="h-6 w-1/4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const totalEnrollments = (enrollmentsRes?.data ?? []).length;
  const totalStudents = courseGroups.reduce((acc, g) => acc + g.students.length, 0);
  const totalAuditors = courseGroups.reduce((acc, g) => acc + g.auditors.length, 0);
  const totalTAs = courseGroups.reduce((acc, g) => acc + g.tas.length, 0);
  const totalOrphans = orphanEnrollments.length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
          <ShieldCheck size={14} /> 조교 리포트 — 운영진 전용
        </div>
        <p className="mt-1 text-[11px] text-blue-800/80">
          {year}년 {SEMESTER_TERM_LABELS[term]} · 등록 {totalEnrollments}건
          (수강 {totalStudents} · 청강 {totalAuditors} · TA {totalTAs}
          {totalOrphans > 0 ? ` · 과목 매칭 실패 ${totalOrphans}` : ""})
        </p>
      </div>

      {totalOrphans > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-semibold text-amber-900">
            ⚠ 등록되었으나 과목 정보가 없는 수강생 {totalOrphans}명
          </p>
          <p className="mt-1 text-[11px] text-amber-900/80">
            등록 시점에는 존재했으나 이후 과목이 삭제되었거나 학기/연도 정보가 다른 데이터입니다. 운영콘솔의 수강과목에서 정리해 주세요.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {orphanEnrollments.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white pl-2 pr-0.5 py-0.5 text-[11px] text-amber-900"
              >
                <Link
                  href={e.userId ? `/profile/${e.userId}` : "#"}
                  className={e.userId ? "hover:underline" : "cursor-default"}
                >
                  {e.studentName}
                  {e.role && e.role !== "student" && (
                    <span className="ml-1 text-[10px] text-amber-900/70">
                      · {ENROLLMENT_ROLE_LABELS[e.role]}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(e)}
                  disabled={deletingId === e.id}
                  aria-label="수강 등록 삭제"
                  className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-amber-900/70 hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                >
                  <Trash2 size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

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
                  <button
                    type="button"
                    onClick={() => setDetailCourse(g.course)}
                    className="group min-w-0 flex-1 text-left"
                    title="이 과목의 전체 학기 이력 보기"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {COURSE_CATEGORY_LABELS[g.course.category]}
                      </Badge>
                      {g.course.courseCode && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {g.course.courseCode}
                        </span>
                      )}
                      <span className="text-sm font-semibold group-hover:underline">
                        {g.course.courseName}
                      </span>
                      {g.course.professor && (
                        <span className="text-[11px] text-muted-foreground">· {g.course.professor}</span>
                      )}
                      <ExternalLink
                        size={11}
                        className="text-muted-foreground opacity-0 transition group-hover:opacity-100"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      총 {total}명 · 수강 {g.students.length} · 청강 {g.auditors.length} · TA {g.tas.length}
                    </p>
                  </button>
                </div>
                {total > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t pt-2">
                    {[...g.students, ...g.auditors, ...g.tas].map((e) => (
                      <span
                        key={e.id}
                        className={`inline-flex items-center gap-1 rounded-full border pl-2 pr-0.5 py-0.5 text-[11px] ${
                          e.userId
                            ? "border-primary/30 bg-primary/5 text-primary"
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        <Link
                          href={e.userId ? `/profile/${e.userId}` : "#"}
                          className={e.userId ? "hover:underline" : "cursor-default"}
                        >
                          {e.studentName}
                          {e.role && e.role !== "student" && (
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              · {ENROLLMENT_ROLE_LABELS[e.role]}
                            </span>
                          )}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(e)}
                          disabled={deletingId === e.id}
                          aria-label="수강 등록 삭제"
                          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                        >
                          <Trash2 size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <CourseDetailDialog
        course={detailCourse}
        onClose={() => setDetailCourse(null)}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * CourseDetailDialog
 * 조교 리포트에서 과목을 클릭하면 열리는 상세 팝업.
 * 동일 과목(courseCode 또는 courseName)의 여러 학기 이력을 수집하고,
 * 학기별 보기 / 여러 학기 선택 종합 보기를 지원한다.
 * ────────────────────────────────────────────────────────── */
function CourseDetailDialog({
  course,
  onClose,
}: {
  course: CourseOffering | null;
  onClose: () => void;
}) {
  const open = !!course;
  const normKey = (c: CourseOffering) =>
    (c.courseCode ?? "").trim() || (c.courseName ?? "").trim();
  const key = course ? normKey(course) : "";

  // 전체 offering 중 같은 과목(코드/이름 일치) 모두 수집
  const { data: allOfferingsRes, isLoading: offeringsLoading } = useQuery({
    queryKey: ["course-detail-offerings", key],
    queryFn: () => courseOfferingsApi.list({ limit: 2000 }),
    enabled: open && !!key,
    staleTime: 60_000,
  });

  const matchingOfferings = useMemo(() => {
    if (!course) return [] as CourseOffering[];
    const rows = allOfferingsRes?.data ?? [];
    const ck = (course.courseCode ?? "").trim();
    const nk = (course.courseName ?? "").trim();
    const matched = rows.filter((o) => {
      if (ck && (o.courseCode ?? "").trim() === ck) return true;
      if (!ck && nk && (o.courseName ?? "").trim() === nk) return true;
      return false;
    });
    return matched.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return (a.term ?? "").localeCompare(b.term ?? "");
    });
  }, [allOfferingsRes, course]);

  // 매칭된 offering들의 수강생 수집
  const { data: enrollmentsByOffering, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["course-detail-enrollments", matchingOfferings.map((o) => o.id).join("|")],
    queryFn: async () => {
      const result = new Map<string, CourseEnrollment[]>();
      await Promise.all(
        matchingOfferings.map(async (o) => {
          const res = await courseEnrollmentsApi.listByCourse(o.id);
          result.set(o.id, res.data);
        }),
      );
      return result;
    },
    enabled: open && matchingOfferings.length > 0,
    staleTime: 30_000,
  });

  // 학기 키: "year-term" 형태
  const semesterKeys = useMemo(
    () => matchingOfferings.map((o) => `${o.year}-${o.term}`),
    [matchingOfferings],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 열릴 때마다 초기 선택: 클릭한 학기만 선택
  useEffect(() => {
    if (course) {
      setSelected(new Set([`${course.year}-${course.term}`]));
    } else {
      setSelected(new Set());
    }
  }, [course]);

  function toggleSemester(k: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }
  function selectAll() {
    setSelected(new Set(semesterKeys));
  }
  function selectNone() {
    setSelected(new Set());
  }

  // 선택된 학기의 offering + enrollment 수집
  const aggregated = useMemo(() => {
    type Row = {
      enrollment: CourseEnrollment;
      offering: CourseOffering;
      semesterKey: string;
    };
    const rows: Row[] = [];
    for (const o of matchingOfferings) {
      const k = `${o.year}-${o.term}`;
      if (!selected.has(k)) continue;
      const list = enrollmentsByOffering?.get(o.id) ?? [];
      for (const e of list) rows.push({ enrollment: e, offering: o, semesterKey: k });
    }
    return rows;
  }, [matchingOfferings, enrollmentsByOffering, selected]);

  // 종합 보기 시 userId 기준 dedupe 카운트
  const uniqueStudentCount = useMemo(() => {
    const ids = new Set<string>();
    let anonCount = 0;
    for (const r of aggregated) {
      if (r.enrollment.role === "ta") continue;
      if (r.enrollment.userId) ids.add(r.enrollment.userId);
      else anonCount += 1; // userId 미매칭은 개별 카운트
    }
    return ids.size + anonCount;
  }, [aggregated]);

  // 학기별 그룹핑
  const bySemester = useMemo(() => {
    const groups = new Map<
      string,
      {
        offering: CourseOffering;
        students: CourseEnrollment[];
        auditors: CourseEnrollment[];
        tas: CourseEnrollment[];
      }
    >();
    for (const o of matchingOfferings) {
      const k = `${o.year}-${o.term}`;
      if (!selected.has(k)) continue;
      const list = enrollmentsByOffering?.get(o.id) ?? [];
      const bucket = {
        offering: o,
        students: list.filter((e) => e.role !== "auditor" && e.role !== "ta"),
        auditors: list.filter((e) => e.role === "auditor"),
        tas: list.filter((e) => e.role === "ta"),
      };
      groups.set(k, bucket);
    }
    return Array.from(groups.entries()).sort(([, a], [, b]) => {
      if (a.offering.year !== b.offering.year) return b.offering.year - a.offering.year;
      return (a.offering.term ?? "").localeCompare(b.offering.term ?? "");
    });
  }, [matchingOfferings, enrollmentsByOffering, selected]);

  const loading = offeringsLoading || enrollmentsLoading;

  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {COURSE_CATEGORY_LABELS[course.category]}
            </Badge>
            {course.courseCode && (
              <span className="font-mono text-xs text-muted-foreground">
                {course.courseCode}
              </span>
            )}
            <span>{course.courseName}</span>
          </DialogTitle>
          <DialogDescription>
            {course.professor && <span>{course.professor} · </span>}
            동일 과목의 학기 이력을 선택해 학기별/종합 수강생을 확인합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 학기 선택 영역 */}
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold">학기 선택 ({selected.size}/{semesterKeys.length})</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={selectAll}
                  className="rounded border px-2 py-0.5 text-[11px] hover:bg-muted"
                >
                  모두 선택
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="rounded border px-2 py-0.5 text-[11px] hover:bg-muted"
                >
                  선택 해제
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {matchingOfferings.length === 0 ? (
                <span className="text-[11px] text-muted-foreground">
                  이력 없음
                </span>
              ) : (
                matchingOfferings.map((o) => {
                  const k = `${o.year}-${o.term}`;
                  const isOn = selected.has(k);
                  const count = (enrollmentsByOffering?.get(o.id) ?? []).length;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleSemester(k)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                        isOn
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-white text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{o.year}년 {SEMESTER_TERM_LABELS[o.term]}</span>
                      {count > 0 && <span className="tabular-nums">· {count}명</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 요약 */}
          <div className="grid grid-cols-3 gap-2 rounded-lg border bg-white p-3 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground">선택 학기</p>
              <p className="text-sm font-semibold">{selected.size}개</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">누적 등록(행)</p>
              <p className="text-sm font-semibold">{aggregated.length}건</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">고유 수강생</p>
              <p className="text-sm font-semibold">{uniqueStudentCount}명</p>
            </div>
          </div>

          {/* 학기별 수강생 리스트 */}
          {loading ? (
            <div className="mt-6 space-y-3" aria-busy="true" aria-label="학기별 수강생 불러오는 중">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : selected.size === 0 ? (
            <p className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              학기를 하나 이상 선택해 주세요.
            </p>
          ) : (
            <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
              {bySemester.map(([k, group]) => {
                const total =
                  group.students.length + group.auditors.length + group.tas.length;
                return (
                  <div key={k} className="rounded-lg border bg-white p-3">
                    <p className="text-xs font-semibold text-primary">
                      {group.offering.year}년 {SEMESTER_TERM_LABELS[group.offering.term]}
                      <span className="ml-2 font-normal text-muted-foreground">
                        · 총 {total}명 · 수강 {group.students.length} · 청강 {group.auditors.length} · TA {group.tas.length}
                      </span>
                    </p>
                    {total > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[...group.students, ...group.auditors, ...group.tas].map((e) => (
                          <Link
                            key={e.id}
                            href={e.userId ? `/profile/${e.userId}` : "#"}
                            onClick={(ev) => {
                              if (!e.userId) ev.preventDefault();
                            }}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                              e.userId
                                ? "border-primary/30 bg-primary/5 text-primary hover:underline"
                                : "cursor-default border-border bg-muted text-muted-foreground"
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
