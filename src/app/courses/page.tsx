"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Filter } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
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

export default function CoursesPage() {
  const [year, setYear] = useState<number>(nowYear());
  const [term, setTerm] = useState<SemesterTerm>(defaultTermForToday());
  const [rows, setRows] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<CourseCategory | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await courseOfferingsApi.listBySemester(year, term);
        if (!cancelled) {
          setRows(res.data.filter((r) => r.active !== false));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "불러오지 못했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, term]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (filterCategory !== "all" && r.category !== filterCategory) return false;
      if (!q) return true;
      const hay = [r.courseName, r.professor, r.courseCode, r.classroom, r.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    return [...filtered].sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return (a.courseName ?? "").localeCompare(b.courseName ?? "");
    });
  }, [rows, filterCategory, search]);

  const yearOptions: number[] = [];
  const cy = nowYear();
  for (let y = cy + 1; y >= cy - 8; y--) yearOptions.push(y);

  const groupedByCategory = useMemo(() => {
    const map = new Map<CourseCategory, CourseOffering[]>();
    for (const r of visibleRows) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibleRows]);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        {/* 헤더 */}
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">내 수강과목</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              학기별 개설된 전공·교직·타전공 과목을 한눈에 확인하세요. 강의계획서 링크가 있으면 함께 확인할 수 있습니다.
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

        {/* 카테고리 필터 */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
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

        {/* 목록 */}
        {loading ? (
          <LoadingSpinner className="mt-12" />
        ) : error ? (
          <p className="mt-12 text-sm text-destructive">⚠ {error}</p>
        ) : visibleRows.length === 0 ? (
          <div className="mt-12 rounded-lg border bg-muted/20 p-8 text-center">
            <BookOpen size={28} className="mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {rows.length === 0
                ? `${year}년 ${SEMESTER_TERM_LABELS[term]}에 등록된 과목이 없습니다.`
                : "조건에 맞는 과목이 없습니다."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              운영진에게 등록 요청을 하시려면{" "}
              <Link href="/contact" className="text-primary hover:underline">
                문의하기
              </Link>
              를 이용해 주세요.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {groupedByCategory.map(([cat, list]) => (
              <section key={cat}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                  {COURSE_CATEGORY_LABELS[cat]}
                  <span className="text-xs font-normal text-muted-foreground">{list.length}과목</span>
                </h2>
                <ul className="space-y-2">
                  {list.map((r) => (
                    <li key={r.id} className="rounded-lg border bg-white p-3 transition-shadow hover:shadow-sm">
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
                            {[
                              r.professor ? `👤 ${r.professor}` : null,
                              r.schedule ? `🗓 ${r.schedule}` : null,
                              r.classroom ? `📍 ${r.classroom}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
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
        )}

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          ※ 본 정보는 학과 공식 시간표가 아닌 참고용입니다. 정확한 개설 여부는 학과 공지를 확인해 주세요.
        </p>
      </div>
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
