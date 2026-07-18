"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import InlineNotification from "@/components/ui/inline-notification";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { statisticalMethodsApi, archiveFavoritesApi } from "@/lib/bkend";
import {
  STATISTICAL_METHOD_CATEGORY_COLORS,
  STATISTICAL_METHOD_CATEGORY_LABELS,
  type StatisticalMethod,
  type StatisticalMethodCategory,
  type ArchiveFavorite,
} from "@/types";
import { cn } from "@/lib/utils";
import ArchiveListToolbar, {
  type ArchiveListSortOption,
} from "@/components/archive/ArchiveListToolbar";
import ArchiveFavoriteStar from "@/components/archive/ArchiveFavoriteStar";
import { matchesArchiveSearch } from "@/lib/archive-search";
import PageContainer from "@/components/ui/page-container";

const GUIDE_SORT_OPTIONS: ArchiveListSortOption[] = [
  { value: "name", label: "이름순 (가나다)" },
  { value: "recent", label: "최신 추가순" },
];

const STATISTICAL_METHOD_SEARCH_FIELDS: (keyof StatisticalMethod)[] = [
  "name",
  "summary",
  "accessibleSummary",
  "whenToUse",
  "description",
];

interface CategoryGuide {
  category: StatisticalMethodCategory;
  title: string;
  description: string;
  borderClass: string;
  iconBg: string;
  iconText: string;
}

const CATEGORY_GUIDES: CategoryGuide[] = [
  {
    category: "basic",
    title: "기초·상관",
    description: "분석의 출발점 — 정규성·중심극한정리·상관분석(r)",
    borderClass: "border-l-teal-400",
    iconBg: "bg-teal-100 dark:bg-teal-950/60",
    iconText: "text-teal-700 dark:text-teal-300",
  },
  {
    category: "anova_family",
    title: "ANOVA 계열",
    description: "집단 간 평균 차이 검정 — t-test · ANOVA · ANCOVA · MANOVA · MANCOVA",
    borderClass: "border-l-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950/60",
    iconText: "text-blue-700 dark:text-blue-300",
  },
  {
    category: "regression",
    title: "회귀분석",
    description: "독립변수가 종속변수를 어떻게 예측·설명하는지 — 다중회귀·로지스틱회귀",
    borderClass: "border-l-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-950/60",
    iconText: "text-violet-700 dark:text-violet-300",
  },
  {
    category: "factor",
    title: "요인분석",
    description: "관측 변수 사이의 잠재 구조 — EFA(탐색) · CFA(확인)",
    borderClass: "border-l-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconText: "text-emerald-700 dark:text-emerald-300",
  },
  {
    category: "sem",
    title: "구조방정식(SEM)",
    description: "잠재변인을 포함한 다중 인과 관계 동시 추정",
    borderClass: "border-l-indigo-400",
    iconBg: "bg-indigo-100 dark:bg-indigo-950/60",
    iconText: "text-indigo-700 dark:text-indigo-300",
  },
  {
    category: "mediation_moderation",
    title: "매개·조절",
    description: "변수 사이의 메커니즘 — 매개효과·조절효과·조건부 분석",
    borderClass: "border-l-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-950/60",
    iconText: "text-rose-700 dark:text-rose-300",
  },
  {
    category: "multilevel",
    title: "다층모형",
    description: "위계 구조(학교·학급·개인) 데이터를 위한 HLM·MLM",
    borderClass: "border-l-cyan-400",
    iconBg: "bg-cyan-100 dark:bg-cyan-950/60",
    iconText: "text-cyan-700 dark:text-cyan-300",
  },
  {
    category: "nonparametric",
    title: "비모수",
    description: "정규성 가정이 어려운 경우 — Mann-Whitney·Wilcoxon·Kruskal-Wallis",
    borderClass: "border-l-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconText: "text-amber-700 dark:text-amber-300",
  },
  {
    category: "measurement",
    title: "측정·타당도",
    description: "도구의 품질 — 내용타당도(CVI)·신뢰도(Cronbach α)",
    borderClass: "border-l-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-950/60",
    iconText: "text-purple-700 dark:text-purple-300",
  },
  {
    category: "other",
    title: "기타",
    description: "위 분류에 포함되지 않는 통계기법",
    borderClass: "border-l-slate-400",
    iconBg: "bg-slate-100 dark:bg-slate-900/60",
    iconText: "text-slate-700 dark:text-slate-300",
  },
];

function StatisticalMethodsLandingPageInner() {
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");
  const queryClient = useQueryClient();
  const favoritesKey = ["archive_favorites", user?.id ?? "guest"];

  // M4: 목록 읽기 캐시 — 아카이브 가이드(정적 성격) 10분, 사용자 즐겨찾기 2분.
  const { data: methods = [], isLoading: loading } = useQuery({
    queryKey: ["statistical_methods", canManage],
    queryFn: async () => {
      // staff+ 는 draft 포함 전체, 일반 회원은 published 만 조회 (rules 와 일치)
      const res = canManage
        ? await statisticalMethodsApi.list()
        : await statisticalMethodsApi.listPublished();
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: favoritesKey,
    queryFn: async () => {
      if (!user) return [] as ArchiveFavorite[];
      const res = await archiveFavoritesApi.listByUser(user.id);
      return res.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  const [query, setQuery] = useState("");
  // H4: 동적 리스트와 정합화 — 정렬·즐겨찾기만·카테고리 칩 필터
  const [sortMode, setSortMode] = useState<"name" | "recent">("name");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<StatisticalMethodCategory | "all">("all");
  // UX(2026-07-04): soft navigation(뒤로가기·칩 재클릭)에도 ?q= 를 반영
  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setQuery(q);
  }, [searchParams]);

  const favIdSet = useMemo(
    () =>
      new Set(
        favorites.filter((f) => f.itemType === "statistical-method").map((f) => f.itemId),
      ),
    [favorites],
  );

  const handleToggleFav = async (m: StatisticalMethod) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    const favId = archiveFavoritesApi.makeId(user.id, "statistical-method", m.id);
    const isFav = favIdSet.has(m.id);
    try {
      if (isFav) {
        await archiveFavoritesApi.delete(favId);
        queryClient.setQueryData<ArchiveFavorite[]>(favoritesKey, (prev = []) =>
          prev.filter((f) => f.id !== favId),
        );
        toast.success("관심 해제");
      } else {
        const created = await archiveFavoritesApi.upsert(favId, {
          userId: user.id,
          itemType: "statistical-method",
          itemId: m.id,
          itemName: m.name,
        });
        queryClient.setQueryData<ArchiveFavorite[]>(favoritesKey, (prev = []) => [
          ...prev,
          created,
        ]);
        toast.success("관심 저장");
      }
    } catch (err) {
      console.error("[statistical-methods-landing] favorite toggle failed", err);
      toast.error("관심 저장 실패");
    }
  };

  const visibleMethods = useMemo(
    () => methods.filter((m) => canManage || m.published),
    [methods, canManage],
  );

  const filteredMethods = useMemo(
    () =>
      visibleMethods.filter((m) => {
        if (!matchesArchiveSearch(m, query, STATISTICAL_METHOD_SEARCH_FIELDS)) return false;
        if (favoritesOnly && !favIdSet.has(m.id)) return false;
        if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
        return true;
      }),
    [visibleMethods, query, favoritesOnly, favIdSet, categoryFilter],
  );

  // 실제 존재하는 카테고리만 칩으로 노출 (10종 전부 나열 방지)
  const availableCategories = useMemo(
    () => new Set(visibleMethods.map((m) => m.category)),
    [visibleMethods],
  );

  const grouped = useMemo(() => {
    const byCategory: Record<StatisticalMethodCategory, StatisticalMethod[]> = {
      basic: [],
      anova_family: [],
      regression: [],
      factor: [],
      sem: [],
      nonparametric: [],
      mediation_moderation: [],
      multilevel: [],
      measurement: [],
      other: [],
    };
    for (const m of filteredMethods) {
      // QA-v2: 레거시/미지 카테고리 문서가 어떤 섹션에도 안 뜨던 무음 드롭 — other 로 폴백
      (byCategory[m.category] ?? byCategory.other).push(m);
    }
    (Object.keys(byCategory) as StatisticalMethodCategory[]).forEach((k) => {
      byCategory[k].sort((a, b) =>
        sortMode === "recent"
          ? (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
          : a.name.localeCompare(b.name, "ko"),
      );
    });
    return byCategory;
  }, [filteredMethods, sortMode]);

  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Link href="/archive">
          <Button variant="ghost" size="sm" className="mb-3">
            <ArrowLeft className="mr-1 h-4 w-4" />
            아카이브
          </Button>
        </Link>

        <PageHeader
          icon={BarChart3}
          title="교육공학 통계방법 가이드"
          description="ANOVA · 회귀 · 요인분석 · SEM 등 통계기법을 가정·절차·SPSS/AMOS/R 구문·대안 비교표와 함께 정리합니다. 동일한 통계방법을 사용한 졸업생 학위논문도 함께 확인할 수 있습니다."
        />

        {/* RT-3(2026-07-04): 파인더 크로스링크 */}
        <Link
          href="/archive/method-finder"
          className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm transition-colors hover:bg-primary/10"
        >
          <span className="text-foreground/85">
            어떤 통계방법을 골라야 할지 모르겠다면 — <span className="font-semibold text-primary">몇 가지 질문으로 추천받기</span>
          </span>
          <span aria-hidden className="shrink-0 text-primary">→</span>
        </Link>

        <div className="mt-6">
          <InlineNotification
            kind="info"
            title="동일 데이터로 시도해볼 수 있는 다른 통계방법 비교"
            description={
              <span>
                각 통계방법 상세 페이지에는 <strong>비교 프로파일</strong>(종속·독립변수·표본·가정·강점·한계)이
                정리되어 있어, 동일 데이터를 다른 통계기법으로 분석했을 때의 트레이드오프를
                한눈에 비교할 수 있습니다.
              </span>
            }
          />
        </div>

        <div className="mt-6">
          <ArchiveListToolbar
            query={query}
            onQueryChange={setQuery}
            placeholder="통계방법 이름·요약·언제 사용하는가로 검색"
            resultCount={filteredMethods.length}
            totalCount={visibleMethods.length}
            sortMode={sortMode}
            onSortChange={(v) => setSortMode(v as typeof sortMode)}
            sortOptions={GUIDE_SORT_OPTIONS}
            showFavoritesToggle={!!user}
            favoritesOnly={favoritesOnly}
            onFavoritesToggle={() => setFavoritesOnly((v) => !v)}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-muted-foreground">
                분류
              </span>
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                aria-pressed={categoryFilter === "all"}
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  categoryFilter === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40",
                )}
              >
                전체
              </button>
              {CATEGORY_GUIDES.filter((g) => availableCategories.has(g.category)).map((g) => {
                const selected = categoryFilter === g.category;
                return (
                  <button
                    key={g.category}
                    type="button"
                    onClick={() => setCategoryFilter(g.category)}
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {g.title}
                  </button>
                );
              })}
            </div>
          </ArchiveListToolbar>
        </div>

        {!loading && query.trim() && filteredMethods.length === 0 && (
          <Card className="mt-6 rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              &ldquo;{query.trim()}&rdquo; 검색 결과가 없습니다.
            </CardContent>
          </Card>
        )}

        {CATEGORY_GUIDES.map((guide) => {
          const list = grouped[guide.category];
          if (!loading && list.length === 0) return null;
          return (
            <section key={guide.category} className="mt-8">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                    guide.iconBg,
                    guide.iconText,
                  )}
                >
                  <BarChart3 className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {guide.title}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {loading ? "" : `(${list.length})`}
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground">{guide.description}</p>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {list.map((m) => (
                    <Link
                      key={m.id}
                      href={`/archive/statistical-methods/${m.id}`}
                      className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-2xl"
                    >
                      <article
                        className={cn(
                          "h-full rounded-2xl border-l-4 bg-card p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md",
                          guide.borderClass,
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-semibold leading-snug">{m.name}</h3>
                          <div className="flex shrink-0 items-center gap-1">
                            {!m.published && canManage && (
                              <Badge
                                variant="outline"
                                className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]"
                              >
                                draft
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                STATISTICAL_METHOD_CATEGORY_COLORS[m.category],
                              )}
                            >
                              {STATISTICAL_METHOD_CATEGORY_LABELS[m.category]}
                            </Badge>
                            {user && (
                              <ArchiveFavoriteStar
                                isFav={favIdSet.has(m.id)}
                                onToggle={() => handleToggleFav(m)}
                              />
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {m.summary}
                        </p>
                        <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
                          자세히 보기
                          <ArrowRight
                            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {!loading && methods.length === 0 && (
          <Card className="mt-8 rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              아직 등록된 통계방법 가이드가 없습니다.
            </CardContent>
          </Card>
        )}

        {/* 학술 책임 고지 */}
        <div className="mt-10 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            본 가이드는 참고용입니다. 최종 통계 분석 설계는 지도교수와 상의하시기 바랍니다.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}


// UX(2026-07-04): useSearchParams 는 Suspense 경계 필요 — 래퍼로 충족.
// (기존 window 1회 읽기는 soft navigation 시 ?q= 변경을 못 따라가던 문제)
export default function StatisticalMethodsLandingPage() {
  return (
    <Suspense fallback={null}>
      <StatisticalMethodsLandingPageInner />
    </Suspense>
  );
}
