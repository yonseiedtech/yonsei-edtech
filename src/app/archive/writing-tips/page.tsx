"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  PenLine,
  Languages,
  Link2,
  Clock,
  SpellCheck2,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/ui/page-header";
import InlineNotification from "@/components/ui/inline-notification";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { writingTipsApi } from "@/lib/bkend";
import {
  WRITING_TIP_CATEGORY_COLORS,
  WRITING_TIP_CATEGORY_LABELS,
  type WritingTip,
  type WritingTipCategory,
} from "@/types";
import { cn } from "@/lib/utils";
import ArchiveSearchBar from "@/components/archive/ArchiveSearchBar";
import { matchesArchiveSearch } from "@/lib/archive-search";

const WRITING_TIP_SEARCH_FIELDS: (keyof WritingTip)[] = [
  "title",
  "wrongExample",
  "correctExample",
  "explanation",
  "accessibleSummary",
  "tags",
];

type CategoryFilter = "all" | WritingTipCategory;

interface CategoryGuide {
  category: WritingTipCategory;
  title: string;
  description: string;
  icon: typeof PenLine;
  borderClass: string;
  iconBg: string;
  iconText: string;
}

const CATEGORY_GUIDES: CategoryGuide[] = [
  {
    category: "translationese",
    title: "번역투",
    description: "영어·일본어 직역에서 비롯된 어색한 한국어 표현과 권장 대체 표현.",
    icon: Languages,
    borderClass: "border-l-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-950/60",
    iconText: "text-rose-700 dark:text-rose-300",
  },
  {
    category: "subject-predicate",
    title: "주술호응",
    description: "주어와 서술어가 맞지 않거나, 긴 문장에서 주어가 길을 잃는 경우.",
    icon: Link2,
    borderClass: "border-l-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-950/60",
    iconText: "text-violet-700 dark:text-violet-300",
  },
  {
    category: "tense-voice",
    title: "시제·태",
    description: "결과는 과거시제, 이론·정의는 현재시제 — 능동·피동의 적절한 사용.",
    icon: Clock,
    borderClass: "border-l-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950/60",
    iconText: "text-blue-700 dark:text-blue-300",
  },
  {
    category: "spelling-spacing",
    title: "맞춤법·표기",
    description: "띄어쓰기·외래어 표기·되/돼 구분 등 자주 틀리는 한글 표기.",
    icon: SpellCheck2,
    borderClass: "border-l-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconText: "text-amber-700 dark:text-amber-300",
  },
  {
    category: "academic-convention",
    title: "학술 관례",
    description: "'본 연구는' 일관 사용, 1인칭 회피, 인용 패턴 등 한국 학위논문 관례.",
    icon: GraduationCap,
    borderClass: "border-l-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconText: "text-emerald-700 dark:text-emerald-300",
  },
];

export default function WritingTipsLandingPage() {
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  const [tips, setTips] = useState<WritingTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // staff+ 는 draft 포함 전체, 일반 회원은 published 만 조회 (rules 와 일치)
        const res = canManage
          ? await writingTipsApi.list()
          : await writingTipsApi.listPublished();
        if (cancelled) return;
        setTips(res.data);
      } catch (err) {
        console.error("[writing-tips-landing] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  const visibleTips = useMemo(
    () => tips.filter((t) => canManage || t.published),
    [tips, canManage],
  );

  const filteredTips = useMemo(
    () =>
      visibleTips.filter((t) =>
        matchesArchiveSearch(t, query, WRITING_TIP_SEARCH_FIELDS),
      ),
    [visibleTips, query],
  );

  const grouped = useMemo(() => {
    const byCategory: Record<WritingTipCategory, WritingTip[]> = {
      translationese: [],
      "subject-predicate": [],
      "tense-voice": [],
      "spelling-spacing": [],
      "academic-convention": [],
    };
    for (const t of filteredTips) {
      byCategory[t.category]?.push(t);
    }
    (Object.keys(byCategory) as WritingTipCategory[]).forEach((k) => {
      byCategory[k].sort((a, b) => a.title.localeCompare(b.title, "ko"));
    });
    return byCategory;
  }, [filteredTips]);

  const counts = useMemo(() => {
    // 탭별 카운트는 검색 결과 기준으로 갱신 (검색어가 비어 있으면 전체)
    const c: Record<CategoryFilter, number> = {
      all: 0,
      translationese: 0,
      "subject-predicate": 0,
      "tense-voice": 0,
      "spelling-spacing": 0,
      "academic-convention": 0,
    };
    for (const t of filteredTips) {
      c.all += 1;
      c[t.category] += 1;
    }
    return c;
  }, [filteredTips]);

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
          icon={PenLine}
          title="학술 글쓰기 가이드"
          description="번역투·주술호응·시제·맞춤법·학술 관례 — ❌ 잘못된 예와 ✅ 권장 예를 짝지어 정리합니다."
        />

        <div className="mt-6">
          <InlineNotification
            kind="info"
            title="❌ 잘못된 예 ↔ ✅ 권장 예로 한눈에 비교"
            description={
              <span>
                각 항목 상세 페이지에는 <strong>잘못된 예</strong> 와{" "}
                <strong>권장 예</strong> 를 색상 대비 카드로 함께 보여 줍니다. 왜
                그렇게 쓰면 좋은지 짧은 설명과 한 줄 비유를 곁들였습니다.
              </span>
            }
          />
        </div>

        <div className="mt-6">
          <ArchiveSearchBar
            value={query}
            onChange={setQuery}
            placeholder="제목·예시·설명·태그(피동·시제·인용)로 검색"
            resultCount={filteredTips.length}
            totalCount={visibleTips.length}
          />
        </div>

        {!loading && query.trim() && filteredTips.length === 0 && (
          <Card className="mt-6 rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              &ldquo;{query.trim()}&rdquo; 검색 결과가 없습니다.
            </CardContent>
          </Card>
        )}

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as CategoryFilter)}
          className="mt-8"
        >
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="all">전체 ({counts.all})</TabsTrigger>
            {CATEGORY_GUIDES.map((g) => (
              <TabsTrigger key={g.category} value={g.category}>
                {WRITING_TIP_CATEGORY_LABELS[g.category]} ({counts[g.category]})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="mt-6 space-y-8">
            {CATEGORY_GUIDES.filter((g) => tab === "all" || tab === g.category).map(
              (guide) => {
                const list = grouped[guide.category];
                const Icon = guide.icon;
                return (
                  <section key={guide.category}>
                    <div className="mb-3 flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                          guide.iconBg,
                          guide.iconText,
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight">
                          {guide.title}
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            {loading ? "" : `(${list.length})`}
                          </span>
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {guide.description}
                        </p>
                      </div>
                    </div>

                    {loading ? (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                        ))}
                      </div>
                    ) : list.length === 0 ? (
                      <Card
                        className={cn("rounded-2xl border-l-4", guide.borderClass)}
                      >
                        <CardContent className="py-6 text-center text-sm text-muted-foreground">
                          아직 등록된 {guide.title} 항목이 없습니다.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {list.map((t) => (
                          <Link
                            key={t.id}
                            href={`/archive/writing-tips/${t.id}`}
                            className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-2xl"
                          >
                            <article
                              className={cn(
                                "h-full rounded-2xl border-l-4 bg-card p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md",
                                guide.borderClass,
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-base font-semibold leading-snug">
                                  {t.title}
                                </h3>
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
                                      WRITING_TIP_CATEGORY_COLORS[t.category],
                                    )}
                                  >
                                    {WRITING_TIP_CATEGORY_LABELS[t.category]}
                                  </Badge>
                                </div>
                              </div>
                              {t.accessibleSummary && (
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                                  {t.accessibleSummary}
                                </p>
                              )}
                              <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-2">
                                <div className="rounded-md border border-rose-200 bg-rose-50/60 px-2 py-1 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                                  <span className="mr-1 font-semibold">❌</span>
                                  <span className="line-clamp-1">{t.wrongExample}</span>
                                </div>
                                <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                                  <span className="mr-1 font-semibold">✅</span>
                                  <span className="line-clamp-1">{t.correctExample}</span>
                                </div>
                              </div>
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
              },
            )}
          </TabsContent>
        </Tabs>

        {/* 학술 책임 고지 */}
        <div className="mt-10 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            본 가이드는 참고용입니다. 최종 표기·문체·인용 형식은 지도교수·해당 학술지
            지침을 우선 따르시기 바랍니다.
          </p>
        </div>
      </div>
    </div>
  );
}
