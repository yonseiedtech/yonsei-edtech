"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, Search, ExternalLink, BookOpen, User as UserIcon, Calendar } from "lucide-react";
import { alumniThesesApi } from "@/lib/bkend";
import type { AlumniThesis } from "@/types";

const PAGE_SIZE = 30;

function yearFrom(awardedYearMonth?: string): number | null {
  if (!awardedYearMonth) return null;
  const m = awardedYearMonth.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

export default function AlumniThesisListPage() {
  const [theses, setTheses] = useState<AlumniThesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await alumniThesesApi.list();
        if (!cancelled) setTheses(res.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "불러오지 못했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(() => {
    const set = new Set<number>();
    theses.forEach((t) => {
      const y = yearFrom(t.awardedYearMonth);
      if (y) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [theses]);

  const advisors = useMemo(() => {
    const set = new Set<string>();
    theses.forEach((t) => {
      if (t.advisorName) set.add(t.advisorName.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [theses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return theses.filter((t) => {
      if (yearFilter !== "all" && yearFrom(t.awardedYearMonth) !== yearFilter) return false;
      if (advisorFilter !== "all" && t.advisorName !== advisorFilter) return false;
      if (!q) return true;
      const hay = [
        t.title,
        t.titleEn,
        t.authorName,
        t.advisorName,
        t.abstract,
        ...(t.keywords ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [theses, search, yearFilter, advisorFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        (b.awardedYearMonth ?? "").localeCompare(a.awardedYearMonth ?? "")
      ),
    [filtered]
  );

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, yearFilter, advisorFilter]);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">졸업생 학위논문</h1>
            <p className="text-sm text-muted-foreground">
              연세대학교 교육대학원 교육공학전공 졸업생들의 학위논문 아카이브입니다.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목·저자·지도교수·키워드·초록 검색"
              className="pl-9"
            />
          </div>
          <select
            value={String(yearFilter)}
            onChange={(e) =>
              setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
            aria-label="졸업연도 필터"
          >
            <option value="all">전체 연도</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={advisorFilter}
            onChange={(e) => setAdvisorFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm max-w-[200px]"
            aria-label="지도교수 필터"
          >
            <option value="all">전체 지도교수</option>
            {advisors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingSpinner className="mt-12" />
        ) : error ? (
          <p className="mt-12 text-sm text-destructive">⚠ {error}</p>
        ) : (
          <>
            <p className="mt-6 text-xs text-muted-foreground">
              총 {sorted.length}건{search && ` · "${search}" 검색 결과`}
            </p>

            {sorted.length === 0 ? (
              <div className="mt-8 rounded-xl border bg-muted/20 p-10 text-center">
                <BookOpen size={40} className="mx-auto text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {pageItems.map((t) => {
                  const year = yearFrom(t.awardedYearMonth);
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/alumni/thesis/${t.id}`}
                        className="block rounded-xl border bg-white p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h2 className="text-base font-semibold leading-snug">
                            {t.title}
                          </h2>
                          <Badge variant="secondary" className="shrink-0 gap-1">
                            <Calendar size={11} />
                            {year ? `${year}년` : "—"}
                          </Badge>
                        </div>
                        {t.titleEn && (
                          <p className="mt-1 text-xs italic text-muted-foreground">
                            {t.titleEn}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <UserIcon size={11} />
                            {t.authorName}
                          </span>
                          {t.advisorName && (
                            <span>
                              지도: <span className="font-medium text-foreground/80">{t.advisorName}</span>
                            </span>
                          )}
                          {t.authorUserId && (
                            <Badge variant="outline" className="text-[10px]">
                              학회 회원 매핑됨
                            </Badge>
                          )}
                        </div>
                        {t.keywords && t.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {t.keywords.slice(0, 6).map((k, i) => (
                              <Badge key={`${k}-${i}`} variant="outline" className="text-[10px]">
                                {k}
                              </Badge>
                            ))}
                            {t.keywords.length > 6 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{t.keywords.length - 6}
                              </span>
                            )}
                          </div>
                        )}
                        {t.abstract && (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            {t.abstract}
                          </p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {pageCount > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  이전
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page} / {pageCount}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                >
                  다음
                </Button>
              </div>
            )}

            <p className="mt-8 text-[11px] text-muted-foreground">
              ※ 원문은 dCollection을 통해 열람할 수 있습니다.{" "}
              <a
                href="https://dcollection.yonsei.ac.kr/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                dCollection 바로가기 <ExternalLink size={10} />
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
