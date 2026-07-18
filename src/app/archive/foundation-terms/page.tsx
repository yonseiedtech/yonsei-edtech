"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
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
import { foundationTermsApi, archiveFavoritesApi } from "@/lib/bkend";
import {
  FOUNDATION_TERM_CATEGORY_COLORS,
  FOUNDATION_TERM_CATEGORY_LABELS,
  FOUNDATION_TERM_SUBCATEGORY_LABELS,
  FOUNDATION_TERM_SUBCATEGORY_ORDER,
  type FoundationTerm,
  type FoundationTermCategory,
  type ArchiveFavorite,
} from "@/types";
import { cn } from "@/lib/utils";
import ArchiveListToolbar, {
  type ArchiveListSortOption,
} from "@/components/archive/ArchiveListToolbar";
import ArchiveFavoriteStar from "@/components/archive/ArchiveFavoriteStar";
import { matchesArchiveSearch } from "@/lib/archive-search";
import { leadSentence } from "@/lib/archive-text";
import PageContainer from "@/components/ui/page-container";

const GUIDE_SORT_OPTIONS: ArchiveListSortOption[] = [
  { value: "name", label: "이름순 (가나다)" },
  { value: "recent", label: "최신 추가순" },
];

const FOUNDATION_TERM_SEARCH_FIELDS: (keyof FoundationTerm)[] = [
  "term",
  "englishName",
  "abbreviation",
  "summary",
  "accessibleSummary",
  "definition",
];

interface CategoryGuide {
  category: FoundationTermCategory;
  title: string;
  description: string;
  borderClass: string;
  iconBg: string;
  iconText: string;
}

const CATEGORY_GUIDES: CategoryGuide[] = [
  {
    category: "variables",
    title: "변인",
    description: "독립·종속·매개·조절 등 양적 연구의 기본 변인 용어.",
    borderClass: "border-l-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950/60",
    iconText: "text-blue-700 dark:text-blue-300",
  },
  {
    category: "research-design",
    title: "연구설계",
    description: "연구모형·처치·무선할당·사전-사후 등 설계의 기본 어휘.",
    borderClass: "border-l-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-950/60",
    iconText: "text-violet-700 dark:text-violet-300",
  },
  {
    category: "instructional-design",
    title: "교수설계",
    description: "ISD·ID·교육과정 등 교수설계 분야 핵심 용어와 그 차이.",
    borderClass: "border-l-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconText: "text-emerald-700 dark:text-emerald-300",
  },
  {
    category: "systems-theory",
    title: "체제이론",
    description: "체제·체계·체제적 분석 — 자주 혼동되는 시스템 이론 어휘.",
    borderClass: "border-l-indigo-400",
    iconBg: "bg-indigo-100 dark:bg-indigo-950/60",
    iconText: "text-indigo-700 dark:text-indigo-300",
  },
  {
    category: "measurement",
    title: "측정·평가",
    description: "모집단·표본·신뢰도·타당도·효과크기 등 측정 이론의 기본.",
    borderClass: "border-l-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconText: "text-amber-700 dark:text-amber-300",
  },
  {
    category: "learning-theory",
    title: "학습이론",
    description: "ZPD·인지부하 등 학습이론 핵심 용어.",
    borderClass: "border-l-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-950/60",
    iconText: "text-rose-700 dark:text-rose-300",
  },
];

/**
 * 카테고리 안 2차 그룹핑 (사이클 69) — subCategory 가 있으면 정의 순서대로 하위 그룹 분할,
 * 없으면 단일 평면 그룹(기존 동작). 측정·평가처럼 과밀 카테고리만 하위 헤더로 나뉜다.
 */
function groupBySubCategory(
  list: FoundationTerm[],
): { key: string; label: string | null; items: FoundationTerm[] }[] {
  if (!list.some((t) => t.subCategory)) {
    return [{ key: "_flat", label: null, items: list }];
  }
  const groups: { key: string; label: string | null; items: FoundationTerm[] }[] = [];
  for (const sub of FOUNDATION_TERM_SUBCATEGORY_ORDER) {
    const items = list.filter((t) => t.subCategory === sub);
    if (items.length > 0) {
      groups.push({ key: sub, label: FOUNDATION_TERM_SUBCATEGORY_LABELS[sub], items });
    }
  }
  const rest = list.filter((t) => !t.subCategory);
  if (rest.length > 0) groups.push({ key: "_rest", label: "기타", items: rest });
  return groups;
}

function FoundationTermsLandingPageInner() {
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");
  const queryClient = useQueryClient();
  const favoritesKey = ["archive_favorites", user?.id ?? "guest"];

  // M4: 목록 읽기 캐시 — 아카이브 가이드(정적 성격) 10분, 사용자 즐겨찾기 2분.
  const { data: terms = [], isLoading: loading } = useQuery({
    queryKey: ["foundation_terms", canManage],
    queryFn: async () => {
      // staff+ 는 draft 포함 전체, 일반 회원은 published 만 조회 (rules 와 일치)
      const res = canManage
        ? await foundationTermsApi.list()
        : await foundationTermsApi.listPublished();
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
  const [categoryFilter, setCategoryFilter] = useState<FoundationTermCategory | "all">("all");
  // UX(2026-07-04): soft navigation(뒤로가기·칩 재클릭)에도 ?q= 를 반영
  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setQuery(q);
  }, [searchParams]);

  const favIdSet = useMemo(
    () =>
      new Set(
        favorites.filter((f) => f.itemType === "foundation-term").map((f) => f.itemId),
      ),
    [favorites],
  );

  const handleToggleFav = async (t: FoundationTerm) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    const favId = archiveFavoritesApi.makeId(user.id, "foundation-term", t.id);
    const isFav = favIdSet.has(t.id);
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
          itemType: "foundation-term",
          itemId: t.id,
          itemName: t.term,
        });
        queryClient.setQueryData<ArchiveFavorite[]>(favoritesKey, (prev = []) => [
          ...prev,
          created,
        ]);
        toast.success("관심 저장");
      }
    } catch (err) {
      console.error("[foundation-terms-landing] favorite toggle failed", err);
      toast.error("관심 저장 실패");
    }
  };

  const visibleTerms = useMemo(
    () => terms.filter((t) => canManage || t.published),
    [terms, canManage],
  );

  const filteredTerms = useMemo(
    () =>
      visibleTerms.filter((t) => {
        if (!matchesArchiveSearch(t, query, FOUNDATION_TERM_SEARCH_FIELDS)) return false;
        if (favoritesOnly && !favIdSet.has(t.id)) return false;
        if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
        return true;
      }),
    [visibleTerms, query, favoritesOnly, favIdSet, categoryFilter],
  );

  const grouped = useMemo(() => {
    const byCategory: Record<FoundationTermCategory, FoundationTerm[]> = {
      variables: [],
      "research-design": [],
      "instructional-design": [],
      "systems-theory": [],
      measurement: [],
      "learning-theory": [],
    };
    for (const t of filteredTerms) {
      byCategory[t.category]?.push(t);
    }
    (Object.keys(byCategory) as FoundationTermCategory[]).forEach((k) => {
      byCategory[k].sort((a, b) =>
        sortMode === "recent"
          ? (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
          : a.term.localeCompare(b.term, "ko"),
      );
    });
    return byCategory;
  }, [filteredTerms, sortMode]);

  // 칩 라벨용 카테고리별 건수 — 현재 필터와 무관하게 전체 기준(칩이 사라지지 않도록)
  const categoryCounts = useMemo(() => {
    const counts = {} as Record<FoundationTermCategory, number>;
    for (const t of visibleTerms) {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }
    return counts;
  }, [visibleTerms]);

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
          icon={BookOpen}
          title="교육공학 기초 용어 가이드"
          description="변인·연구설계·교수설계·체제이론·측정·학습이론 분야의 기초 용어를 정의·예시·헷갈리기 쉬운 페어와 함께 정리합니다."
        />

        <div className="mt-6">
          <InlineNotification
            kind="info"
            title="비슷하지만 다른 용어를 한눈에 비교"
            description={
              <span>
                각 용어 상세 페이지에는{" "}
                <strong>&ldquo;비슷하지만 다른&rdquo; 용어 페어</strong> 가 별도 카드로
                제공됩니다. 신뢰도 vs 타당도, 체제 vs 체계, 매개변인 vs 조절변인처럼
                자주 혼동되는 용어들의 차이점을 비교해 보세요.
              </span>
            }
          />
        </div>

        <div className="mt-6">
          <ArchiveListToolbar
            query={query}
            onQueryChange={setQuery}
            placeholder="용어·영문·약어·정의로 검색"
            resultCount={filteredTerms.length}
            totalCount={visibleTerms.length}
            sortMode={sortMode}
            onSortChange={(v) => setSortMode(v as typeof sortMode)}
            sortOptions={GUIDE_SORT_OPTIONS}
            showFavoritesToggle={!!user}
            favoritesOnly={favoritesOnly}
            onFavoritesToggle={() => setFavoritesOnly((v) => !v)}
          >
            {/* 카테고리 칩 필터 — 용어 45종+ 좁히기 (기존 점프 내비를 필터로 통합) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-muted-foreground">
                분야
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
              {CATEGORY_GUIDES.map((guide) => {
                const count = categoryCounts[guide.category] ?? 0;
                if (count === 0) return null;
                const selected = categoryFilter === guide.category;
                return (
                  <button
                    key={guide.category}
                    type="button"
                    onClick={() => setCategoryFilter(guide.category)}
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {guide.title}
                    <span className="tabular-nums opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </ArchiveListToolbar>
        </div>

        {!loading && query.trim() && filteredTerms.length === 0 && (
          <Card className="mt-6 rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              &ldquo;{query.trim()}&rdquo; 검색 결과가 없습니다.
            </CardContent>
          </Card>
        )}

        {CATEGORY_GUIDES.map((guide) => {
          if (categoryFilter !== "all" && categoryFilter !== guide.category) return null;
          const list = grouped[guide.category];
          // 필터 활성 시 빈 분야는 오해 방지 위해 숨김
          const filterActive =
            !!query.trim() || favoritesOnly || categoryFilter !== "all";
          if (!loading && list.length === 0 && filterActive) return null;
          return (
            <section key={guide.category} id={guide.category} className="mt-8 scroll-mt-24">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                    guide.iconBg,
                    guide.iconText,
                  )}
                >
                  <BookOpen className="h-5 w-5" aria-hidden />
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
              ) : list.length === 0 ? (
                <Card className={cn("rounded-2xl border-l-4", guide.borderClass)}>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    아직 등록된 {guide.title} 용어가 없습니다.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-5">
                  {groupBySubCategory(list).map((sub) => (
                    <div key={sub.key}>
                      {sub.label && (
                        <div className="mb-2 flex items-center gap-1.5 border-b pb-1.5">
                          <span className="text-sm font-semibold text-foreground/80">
                            {sub.label}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            ({sub.items.length})
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {sub.items.map((t) => (
                          <Link
                            key={t.id}
                            href={`/archive/foundation-terms/${t.id}`}
                            className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-2xl"
                          >
                      <article
                        className={cn(
                          "h-full rounded-2xl border-l-4 bg-card p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md",
                          guide.borderClass,
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold leading-snug">
                              {t.term}
                              {t.abbreviation && (
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                  ({t.abbreviation})
                                </span>
                              )}
                            </h3>
                            {t.englishName && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {t.englishName}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {!t.published && canManage && (
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
                                FOUNDATION_TERM_CATEGORY_COLORS[t.category],
                              )}
                            >
                              {FOUNDATION_TERM_CATEGORY_LABELS[t.category]}
                            </Badge>
                            {user && (
                              <ArchiveFavoriteStar
                                isFav={favIdSet.has(t.id)}
                                onToggle={() => handleToggleFav(t)}
                              />
                            )}
                          </div>
                        </div>
                        {(() => {
                          const { lead, truncated } = leadSentence(t.summary ?? "");
                          return (
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                              {lead}
                              {truncated && (
                                <span className="ml-1 whitespace-nowrap font-medium text-primary">
                                  … 더보기
                                </span>
                              )}
                            </p>
                          );
                        })()}
                        {t.confusedWith && t.confusedWith.length > 0 && (
                          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" aria-hidden />
                            비슷하지만 다른 용어 {t.confusedWith.length}건
                          </p>
                        )}
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
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* 학술 책임 고지 */}
        <div className="mt-10 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            본 가이드는 참고용입니다. 최종 학술 정의·연구설계는 지도교수와 상의하시기
            바랍니다.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}


// UX(2026-07-04): useSearchParams 는 Suspense 경계 필요 — 래퍼로 충족.
// (기존 window 1회 읽기는 soft navigation 시 ?q= 변경을 못 따라가던 문제)
export default function FoundationTermsLandingPage() {
  return (
    <Suspense fallback={null}>
      <FoundationTermsLandingPageInner />
    </Suspense>
  );
}
