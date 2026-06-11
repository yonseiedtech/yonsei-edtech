"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { foundationTermsApi } from "@/lib/bkend";
import {
  FOUNDATION_TERM_CATEGORY_COLORS,
  FOUNDATION_TERM_CATEGORY_LABELS,
  type FoundationTerm,
  type FoundationTermCategory,
} from "@/types";
import { cn } from "@/lib/utils";
import ArchiveSearchBar from "@/components/archive/ArchiveSearchBar";
import { matchesArchiveSearch } from "@/lib/archive-search";
import PageContainer from "@/components/ui/page-container";

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

export default function FoundationTermsLandingPage() {
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  const [terms, setTerms] = useState<FoundationTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // staff+ 는 draft 포함 전체, 일반 회원은 published 만 조회 (rules 와 일치)
        const res = canManage
          ? await foundationTermsApi.list()
          : await foundationTermsApi.listPublished();
        if (cancelled) return;
        setTerms(res.data);
      } catch (err) {
        console.error("[foundation-terms-landing] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  const visibleTerms = useMemo(
    () => terms.filter((t) => canManage || t.published),
    [terms, canManage],
  );

  const filteredTerms = useMemo(
    () =>
      visibleTerms.filter((t) =>
        matchesArchiveSearch(t, query, FOUNDATION_TERM_SEARCH_FIELDS),
      ),
    [visibleTerms, query],
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
      byCategory[k].sort((a, b) => a.term.localeCompare(b.term, "ko"));
    });
    return byCategory;
  }, [filteredTerms]);

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
          <ArchiveSearchBar
            value={query}
            onChange={setQuery}
            placeholder="용어·영문·약어·정의로 검색"
            resultCount={filteredTerms.length}
            totalCount={visibleTerms.length}
          />
        </div>

        {!loading && query.trim() && filteredTerms.length === 0 && (
          <Card className="mt-6 rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              &ldquo;{query.trim()}&rdquo; 검색 결과가 없습니다.
            </CardContent>
          </Card>
        )}

        {CATEGORY_GUIDES.map((guide) => {
          const list = grouped[guide.category];
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
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {list.map((t) => (
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
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {t.summary}
                        </p>
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
