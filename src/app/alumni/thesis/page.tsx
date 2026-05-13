"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import InlineNotification from "@/components/ui/inline-notification";
import {
  GraduationCap,
  Search,
  ExternalLink,
  BookOpen,
  User as UserIcon,
  Calendar,
  Lock,
  BarChart3,
  AlertTriangle,
  ShieldCheck,
  AlertCircle,
  X,
} from "lucide-react";
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

  /* ── 비로그인 게이트 ── */
  if (initialized && !user) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock size={26} />
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight">회원 전용 콘텐츠</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              졸업생 학위논문 아카이브(저자·지도교수·초록·원문 링크)는
              <br />
              연세교육공학회 회원에게만 공개됩니다.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Link href="/login">
                <Button>로그인</Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline">회원가입</Button>
              </Link>
              <Link href="/research">
                <Button variant="ghost" className="text-muted-foreground">
                  <BarChart3 size={14} className="mr-1.5" />
                  연구 분석 페이지로
                </Button>
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

  const hasActiveFilter =
    search.trim() !== "" || yearFilter !== "all" || advisorFilter !== "all";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-4xl px-4">

        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={GraduationCap}
          title="졸업생 학위논문"
          description="연세대학교 교육대학원 교육공학전공 졸업생들의 학위논문 아카이브입니다."
        />

        <Separator className="mt-6" />

        {/* ── 검색 + 필터 바 ── */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* 검색 */}
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목·저자·지도교수·키워드·초록 검색"
              className="pl-9 pr-8 text-sm"
              aria-label="논문 검색"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="검색어 지우기"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* 연도 필터 */}
          <select
            value={String(yearFilter)}
            onChange={(e) =>
              setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="h-9 rounded-md border border-input bg-card px-3 text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[130px]"
            aria-label="졸업연도 필터"
          >
            <option value="all">전체 연도</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>

          {/* 지도교수 필터 */}
          <select
            value={advisorFilter}
            onChange={(e) => setAdvisorFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[180px]"
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

        {/* ── 운영진 전용 패널 ── */}
        {staffMode && (
          <div className="mt-3">
            <InlineNotification
              kind="warning"
              title={`운영진 전용 — 분석 제한 논문 ${restrictedCount}건 (전체 ${theses.length}건 중 ${Math.round((restrictedCount / Math.max(1, theses.length)) * 100)}%)`}
              description={
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium">
                  <input
                    type="checkbox"
                    checked={showOnlyRestricted}
                    onChange={(e) => setShowOnlyRestricted(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-amber-400 accent-amber-700"
                  />
                  분석 제한 논문만 보기
                </label>
              }
            />
          </div>
        )}

        {/* ── 본문 ── */}
        {loading ? (
          <ul
            className="mt-8 space-y-3"
            aria-busy="true"
            aria-label="졸업 논문 불러오는 중"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="rounded-2xl border bg-card p-5 shadow-sm">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="mt-3 h-5 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="mt-8">
            <EmptyState
              icon={AlertCircle}
              title="논문 목록을 불러오는 중 오류가 발생했습니다"
              description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
              actionLabel="다시 시도"
              onAction={() => window.location.reload()}
            />
          </div>
        ) : (
          <>
            {/* 결과 카운트 */}
            <p className="mt-5 text-xs text-muted-foreground" aria-live="polite">
              총{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {sorted.length}
              </span>
              건
              {search.trim() && (
                <span>
                  {" "}
                  · &ldquo;{search}&rdquo; 검색 결과
                </span>
              )}
            </p>

            {/* 빈 상태 */}
            {sorted.length === 0 ? (
              <div className="mt-4">
                {hasActiveFilter ? (
                  <EmptyState
                    icon={Search}
                    title="검색 결과가 없습니다"
                    description="키워드를 다시 확인하거나 필터를 초기화해 보세요."
                    actionLabel="필터 초기화"
                    onAction={() => {
                      setSearch("");
                      setYearFilter("all");
                      setAdvisorFilter("all");
                    }}
                  />
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title="아직 등록된 학위논문이 없습니다"
                    description="운영진이 논문을 등록하면 이곳에 표시됩니다."
                  />
                )}
              </div>
            ) : (
              <ul className="mt-4 space-y-3" aria-label="학위논문 목록">
                {pageItems.map((t) => {
                  const semester = semesterLabel(t.awardedYearMonth);
                  const restriction = staffMode ? restrictionByThesis.get(t.id) : null;
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/alumni/thesis/${t.id}`}
                        aria-label={`${t.title} — ${t.authorName}${t.advisorName ? `, 지도 ${t.advisorName}` : ""}`}
                        className={[
                          "group block rounded-2xl border bg-card p-5 shadow-sm",
                          "transition-shadow hover:shadow-md",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          restriction?.restricted
                            ? "border-amber-300/70 bg-amber-50/30 dark:bg-amber-950/10"
                            : "hover:border-primary/30",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {/* 메타 헤더 */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                            <Calendar size={11} aria-hidden />
                            {semester ?? "졸업시점 미상"}
                          </p>
                          {restriction?.restricted && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              title={`분석 제한 사유: ${restriction.reasons.join(", ")}`}
                              aria-label={`분석 제한: ${restriction.reasons.join(", ")}`}
                            >
                              <AlertTriangle size={10} aria-hidden />
                              분석 제한
                            </span>
                          )}
                        </div>

                        {/* 제목 */}
                        <h2 className="mt-1.5 text-base font-semibold leading-snug tracking-tight group-hover:text-primary transition-colors">
                          {t.title}
                        </h2>

                        {/* 영문 제목 */}
                        {t.titleEn && (
                          <p className="mt-1 text-xs italic text-muted-foreground line-clamp-1">
                            {t.titleEn}
                          </p>
                        )}

                        {/* 저자·지도교수·매핑 */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <UserIcon size={11} aria-hidden />
                            <span className="font-medium text-foreground/80">
                              {t.authorName}
                            </span>
                          </span>
                          {t.advisorName && (
                            <span>
                              지도:{" "}
                              <span className="font-medium text-foreground/80">
                                {t.advisorName}
                              </span>
                            </span>
                          )}
                          {t.authorUserId && (
                            <Badge variant="outline" className="text-[10px]">
                              학회 회원 매핑됨
                            </Badge>
                          )}
                        </div>

                        {/* 키워드 */}
                        {t.keywords && t.keywords.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {t.keywords.slice(0, 6).map((k, i) => (
                              <Badge
                                key={`${k}-${i}`}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {k}
                              </Badge>
                            ))}
                            {t.keywords.length > 6 && (
                              <span className="self-center text-[10px] text-muted-foreground">
                                +{t.keywords.length - 6}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 초록 미리보기 */}
                        {t.abstract && (
                          <p className="mt-2.5 line-clamp-2 text-xs text-muted-foreground">
                            {t.abstract}
                          </p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* ── 페이지네이션 ── */}
            {pageCount > 1 && (
              <nav
                className="mt-6 flex items-center justify-center gap-2"
                aria-label="페이지 탐색"
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="이전 페이지"
                >
                  이전
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {page} / {pageCount}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                  aria-label="다음 페이지"
                >
                  다음
                </Button>
              </nav>
            )}

            {/* ── 푸터 안내 ── */}
            <p className="mt-8 text-[11px] text-muted-foreground">
              ※ 원문은 dCollection을 통해 열람할 수 있습니다.{" "}
              <a
                href="https://dcollection.yonsei.ac.kr/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                dCollection 바로가기 <ExternalLink size={10} aria-hidden />
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
