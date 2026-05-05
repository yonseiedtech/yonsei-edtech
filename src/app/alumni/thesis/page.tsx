"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, Search, ExternalLink, BookOpen, User as UserIcon, Calendar, Lock, BarChart3, AlertTriangle, ShieldCheck } from "lucide-react";
import { alumniThesesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffUser } from "@/features/research-analytics/shared";
import { thesisAnalysisRestriction } from "@/features/research-analytics/title-analysis";
import type { AlumniThesis } from "@/types";

const PAGE_SIZE = 30;

function yearFrom(awardedYearMonth?: string): number | null {
  if (!awardedYearMonth) return null;
  const m = awardedYearMonth.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

/** YYYY-MM 을 "YYYY년 전기/후기" 라벨로 변환. 2월=전기, 8월=후기, 그 외는 월만 표시. */
function semesterLabel(awardedYearMonth?: string): string | null {
  if (!awardedYearMonth) return null;
  const m = awardedYearMonth.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const y = m[1];
  const mo = Number(m[2]);
  if (mo === 2) return `${y}년 전기`;
  if (mo === 8) return `${y}년 후기`;
  return `${y}년 ${mo}월`;
}

export default function AlumniThesisListPage() {
  const { user, initialized } = useAuthStore();
  const [theses, setTheses] = useState<AlumniThesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const [showOnlyRestricted, setShowOnlyRestricted] = useState(false);
  const [page, setPage] = useState(1);

  const staffMode = isStaffUser(user);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      setLoading(false);
      return;
    }
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
  }, [initialized, user]);

  if (initialized && !user) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock size={26} />
            </div>
            <h1 className="mt-4 text-xl font-bold">회원 전용 콘텐츠</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              졸업생 학위논문 134건의 상세 정보(저자·지도교수·초록·원문 링크)는<br />
              연세교육공학회 회원에게만 공개됩니다.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-10 items-center rounded-md border border-primary px-5 text-sm font-medium text-primary hover:bg-primary/5"
              >
                회원가입
              </Link>
              <Link
                href="/research"
                className="inline-flex h-10 items-center rounded-md border bg-card px-5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                <BarChart3 size={14} className="mr-1.5" />
                연구 분석 페이지로
              </Link>
            </div>
            <p className="mt-5 text-[11px] text-muted-foreground">
              비회원은 연구 키워드 분석·연구 계보·시대별 흐름을{" "}
              <Link href="/research" className="text-primary hover:underline">
                /research
              </Link>{" "}
              에서 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

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

  const restrictionByThesis = useMemo(() => {
    const map = new Map<string, ReturnType<typeof thesisAnalysisRestriction>>();
    theses.forEach((t) => {
      map.set(t.id, thesisAnalysisRestriction(t));
    });
    return map;
  }, [theses]);

  const restrictedCount = useMemo(() => {
    let n = 0;
    restrictionByThesis.forEach((r) => {
      if (r.restricted) n++;
    });
    return n;
  }, [restrictionByThesis]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return theses.filter((t) => {
      if (yearFilter !== "all" && yearFrom(t.awardedYearMonth) !== yearFilter) return false;
      if (advisorFilter !== "all" && t.advisorName !== advisorFilter) return false;
      if (staffMode && showOnlyRestricted && !restrictionByThesis.get(t.id)?.restricted) return false;
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
  }, [theses, search, yearFilter, advisorFilter, staffMode, showOnlyRestricted, restrictionByThesis]);

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
  }, [search, yearFilter, advisorFilter, showOnlyRestricted]);

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
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
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
            className="h-9 rounded-md border border-input bg-card px-3 text-sm max-w-[200px]"
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

        {staffMode && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
            <div className="flex items-center gap-2 text-[12px]">
              <ShieldCheck size={14} className="text-amber-700" />
              <span className="font-semibold text-amber-900">운영진 전용</span>
              <span className="text-amber-800">
                분석 제한 논문 <span className="font-bold">{restrictedCount}</span>건
                <span className="ml-1 text-amber-700/80">
                  (전체 {theses.length}건 중 {Math.round((restrictedCount / Math.max(1, theses.length)) * 100)}%)
                </span>
              </span>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-amber-900">
              <input
                type="checkbox"
                checked={showOnlyRestricted}
                onChange={(e) => setShowOnlyRestricted(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-amber-400 accent-amber-700"
              />
              분석 제한 논문만 보기
            </label>
          </div>
        )}

        {loading ? (
          <ul className="mt-8 space-y-3" aria-busy="true" aria-label="졸업 논문 불러오는 중">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="rounded-xl border bg-card p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-5 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <p className="mt-12 text-sm text-destructive" role="alert">⚠ {error}</p>
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
                  const semester = semesterLabel(t.awardedYearMonth);
                  const restriction = staffMode ? restrictionByThesis.get(t.id) : null;
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/alumni/thesis/${t.id}`}
                        className={`block rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 ${
                          restriction?.restricted ? "border-amber-300/70 bg-amber-50/30" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                            <Calendar size={11} />
                            {semester ?? "졸업시점 미상"}
                          </p>
                          {restriction?.restricted && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                              title={`분석 제한 사유: ${restriction.reasons.join(", ")}`}
                            >
                              <AlertTriangle size={10} />
                              분석 제한
                            </span>
                          )}
                        </div>
                        <h2 className="mt-1 text-base font-semibold leading-snug">
                          {t.title}
                        </h2>
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
