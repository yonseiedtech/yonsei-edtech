"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { courseEnrollmentsApi, courseOfferingsApi } from "@/lib/bkend";
import { cn } from "@/lib/utils";
import {
  COURSE_CATEGORY_LABELS,
  ENROLLMENT_ROLE_LABELS,
  SEMESTER_TERM_LABELS,
  type CourseCategory,
  type CourseEnrollment,
  type CourseOffering,
  type SemesterTerm,
} from "@/types";

const CATEGORY_ORDER: CourseCategory[] = [
  "major_required",
  "major_elective",
  "teaching_general",
  "other_major",
  "general",
  "research",
  "other",
];

function categoryRank(c: CourseCategory | undefined): number {
  if (!c) return CATEGORY_ORDER.length;
  const i = CATEGORY_ORDER.indexOf(c);
  return i < 0 ? CATEGORY_ORDER.length : i;
}
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen } from "lucide-react";

interface Props {
  ownerId: string;
  /** 학번/이메일 등 민감 정보를 보여줄 수 있는지 — 본인 또는 운영진만 true */
  canSeeSensitive: boolean;
}

const TERM_ORDER: Record<SemesterTerm, number> = {
  spring: 1,
  summer: 2,
  fall: 3,
  winter: 4,
};

interface SemesterGroup {
  year: number;
  term: SemesterTerm;
  items: Array<CourseEnrollment & { course?: CourseOffering }>;
}

export default function ProfileCourses({ ownerId, canSeeSensitive }: Props) {
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["profile-courses-enrollments", ownerId],
    queryFn: async () => {
      const res = await courseEnrollmentsApi.listByUser(ownerId);
      return res.data as unknown as CourseEnrollment[];
    },
    enabled: !!ownerId,
    staleTime: 60_000,
  });

  // 각 enrollment에 연결된 과목 정보 조회 (병렬 fetch — 과목수가 많지 않다고 가정)
  const courseIds = useMemo(
    () => Array.from(new Set(enrollments.map((e) => e.courseOfferingId).filter(Boolean))),
    [enrollments]
  );

  const { data: courseMap = {} } = useQuery({
    queryKey: ["profile-courses-offerings", courseIds.sort().join(",")],
    queryFn: async () => {
      const map: Record<string, CourseOffering> = {};
      const results = await Promise.all(
        courseIds.map(async (id) => {
          try {
            const c = (await courseOfferingsApi.get(id)) as unknown as CourseOffering;
            return [id, c] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      for (const [id, c] of results) {
        if (c) map[id] = c;
      }
      return map;
    },
    enabled: courseIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const groups: SemesterGroup[] = useMemo(() => {
    const buckets = new Map<string, SemesterGroup>();
    for (const e of enrollments) {
      const key = `${e.year}-${e.term}`;
      let g = buckets.get(key);
      if (!g) {
        g = { year: e.year, term: e.term, items: [] };
        buckets.set(key, g);
      }
      g.items.push({ ...e, course: courseMap[e.courseOfferingId] });
    }
    // 항목별 정렬 (커리큘럼 순서: 전공필수→전공선택→교직→타전공→교양→연구→기타 → 과목명)
    for (const g of buckets.values()) {
      g.items.sort((a, b) => {
        const ra = categoryRank(a.course?.category);
        const rb = categoryRank(b.course?.category);
        if (ra !== rb) return ra - rb;
        return (a.course?.courseName ?? "").localeCompare(b.course?.courseName ?? "");
      });
    }
    // 학기 정렬: 최신 학기가 위로
    return Array.from(buckets.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return TERM_ORDER[b.term] - TERM_ORDER[a.term];
    });
  }, [enrollments, courseMap]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border bg-white p-5">
        <header className="flex items-center gap-2">
          <GraduationCap size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">수강 내역</h2>
        </header>
        <p className="mt-3 text-xs text-muted-foreground">불러오는 중…</p>
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="rounded-2xl border bg-white p-5">
        <header className="flex items-center gap-2">
          <GraduationCap size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">수강 내역</h2>
        </header>
        <p className="mt-3 text-xs text-muted-foreground">
          등록된 수강 내역이 없습니다.
        </p>
      </section>
    );
  }

  const total = enrollments.length;
  const semesterCount = groups.length;

  return (
    <ProfileCoursesView
      groups={groups}
      total={total}
      semesterCount={semesterCount}
      canSeeSensitive={canSeeSensitive}
    />
  );
}

interface ViewProps {
  groups: SemesterGroup[];
  total: number;
  semesterCount: number;
  canSeeSensitive: boolean;
}

function ProfileCoursesView({
  groups,
  total,
  semesterCount,
  canSeeSensitive,
}: ViewProps) {
  const tabs = useMemo(
    () => [
      { key: "all" as const, label: "전체", count: total },
      ...groups.map((g) => ({
        key: `${g.year}-${g.term}` as const,
        label: `${g.year}년 ${SEMESTER_TERM_LABELS[g.term]}`,
        count: g.items.length,
      })),
    ],
    [groups, total],
  );

  const [activeTab, setActiveTab] = useState<string>("all");

  // tabs 변경 시 활성 탭이 사라졌다면 첫 번째로 fallback
  useEffect(() => {
    if (!tabs.find((t) => t.key === activeTab)) {
      setActiveTab(tabs[0]?.key ?? "all");
    }
  }, [tabs, activeTab]);

  const visibleGroups =
    activeTab === "all"
      ? groups
      : groups.filter((g) => `${g.year}-${g.term}` === activeTab);

  return (
    <section className="rounded-2xl border bg-white p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">수강 내역</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {semesterCount}학기 · {total}과목
        </p>
      </header>

      <nav
        className="mt-3 flex gap-1 overflow-x-auto border-b"
        aria-label="학기별 수강 내역"
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-none items-center gap-1 border-b-2 px-3 py-1.5 text-[11px] font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                {t.count}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-4 space-y-4">
        {visibleGroups.map((g) => (
          <div key={`${g.year}-${g.term}`} className="space-y-2">
            {activeTab === "all" && (
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-xs font-semibold">
                  {g.year}년 {SEMESTER_TERM_LABELS[g.term]}
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {g.items.length}과목
                </span>
              </div>
            )}
            <ul className="space-y-1.5">
              {g.items.map((it) => {
                const course = it.course;
                return (
                  <li key={it.id} className="rounded-md border bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {course?.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {COURSE_CATEGORY_LABELS[course.category]}
                        </Badge>
                      )}
                      {course?.courseCode && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {course.courseCode}
                        </span>
                      )}
                      <span className="text-sm font-medium">
                        {course?.courseName ?? "(폐강·삭제된 과목)"}
                      </span>
                      {it.role && it.role !== "student" && (
                        <Badge variant="outline" className="text-[10px]">
                          {ENROLLMENT_ROLE_LABELS[it.role]}
                        </Badge>
                      )}
                      {course?.credits != null && (
                        <span className="text-[11px] text-muted-foreground">
                          · {course.credits}학점
                        </span>
                      )}
                    </div>
                    {course && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {[course.professor, course.schedule, course.classroom]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {canSeeSensitive && (it.studentId || it.email || it.notes) && (
                      <p className="mt-0.5 text-[11px] text-foreground/70">
                        {[
                          it.studentId ? `학번 ${it.studentId}` : null,
                          it.email,
                          it.notes,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {!canSeeSensitive && (
        <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <BookOpen size={11} />
          개인 식별 정보(학번·이메일)는 본인과 운영진에게만 보입니다.
        </p>
      )}
    </section>
  );
}
