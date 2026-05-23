"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { statisticalMethodsApi } from "@/lib/bkend";
import {
  STATISTICAL_METHOD_CATEGORY_COLORS,
  STATISTICAL_METHOD_CATEGORY_LABELS,
  type StatisticalMethod,
  type StatisticalMethodCategory,
} from "@/types";
import { cn } from "@/lib/utils";
import ArchiveSearchBar from "@/components/archive/ArchiveSearchBar";
import { matchesArchiveSearch } from "@/lib/archive-search";

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
    category: "other",
    title: "기타",
    description: "위 분류에 포함되지 않는 통계기법",
    borderClass: "border-l-slate-400",
    iconBg: "bg-slate-100 dark:bg-slate-900/60",
    iconText: "text-slate-700 dark:text-slate-300",
  },
];

export default function StatisticalMethodsLandingPage() {
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  const [methods, setMethods] = useState<StatisticalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // staff+ 는 draft 포함 전체, 일반 회원은 published 만 조회 (rules 와 일치)
        const res = canManage
          ? await statisticalMethodsApi.list()
          : await statisticalMethodsApi.listPublished();
        if (cancelled) return;
        setMethods(res.data);
      } catch (err) {
        console.error("[statistical-methods-landing] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  const visibleMethods = useMemo(
    () => methods.filter((m) => canManage || m.published),
    [methods, canManage],
  );

  const filteredMethods = useMemo(
    () =>
      visibleMethods.filter((m) =>
        matchesArchiveSearch(m, query, STATISTICAL_METHOD_SEARCH_FIELDS),
      ),
    [visibleMethods, query],
  );

  const grouped = useMemo(() => {
    const byCategory: Record<StatisticalMethodCategory, StatisticalMethod[]> = {
      anova_family: [],
      regression: [],
      factor: [],
      sem: [],
      nonparametric: [],
      mediation_moderation: [],
      multilevel: [],
      other: [],
    };
    for (const m of filteredMethods) {
      byCategory[m.category]?.push(m);
    }
    (Object.keys(byCategory) as StatisticalMethodCategory[]).forEach((k) => {
      byCategory[k].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    });
    return byCategory;
  }, [filteredMethods]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-5xl px-4">
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
          <ArchiveSearchBar
            value={query}
            onChange={setQuery}
            placeholder="통계방법 이름·요약·언제 사용하는가로 검색"
            resultCount={filteredMethods.length}
            totalCount={visibleMethods.length}
          />
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
    </div>
  );
}
