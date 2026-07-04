"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  AlertTriangle,
  BarChart3,
  MessageCircle,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import InlineNotification from "@/components/ui/inline-notification";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { researchMethodsApi } from "@/lib/bkend";
import {
  RESEARCH_METHOD_KIND_COLORS,
  RESEARCH_METHOD_KIND_LABELS,
  type ResearchMethod,
  type ResearchMethodKind,
} from "@/types";
import { cn } from "@/lib/utils";
import ArchiveSearchBar from "@/components/archive/ArchiveSearchBar";
import { matchesArchiveSearch } from "@/lib/archive-search";
import PageContainer from "@/components/ui/page-container";

const RESEARCH_METHOD_SEARCH_FIELDS: (keyof ResearchMethod)[] = [
  "name",
  "summary",
  "accessibleSummary",
  "description",
  "educationalTechExamples",
];

interface KindGuide {
  kind: ResearchMethodKind;
  title: string;
  description: string;
  icon: typeof BarChart3;
  borderClass: string;
  iconBg: string;
  iconText: string;
}

const KIND_GUIDES: KindGuide[] = [
  {
    kind: "quantitative",
    title: "양적 연구",
    description: "변인 간 관계·차이·예측을 수치 데이터로 검증합니다. 설문조사·실험·구조방정식 등.",
    icon: BarChart3,
    borderClass: "border-l-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950/60",
    iconText: "text-blue-700 dark:text-blue-300",
  },
  {
    kind: "qualitative",
    title: "질적 연구",
    description: "맥락·의미·과정을 깊이 있게 이해합니다. 사례연구·근거이론·액션리서치 등.",
    icon: MessageCircle,
    borderClass: "border-l-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconText: "text-amber-700 dark:text-amber-300",
  },
  {
    kind: "mixed",
    title: "혼합 연구",
    description: "양적·질적 자료를 통합해 보완적으로 활용합니다. 순차적 설명·동시 삼각화 등.",
    icon: Layers,
    borderClass: "border-l-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconText: "text-emerald-700 dark:text-emerald-300",
  },
];

/** 연구질문 유형 → 방법론 매핑 (진입 가이드) */
const QUESTION_MAPPING: {
  kind: ResearchMethodKind;
  heading: string;
  lead: string;
  example: string;
  borderClass: string;
}[] = [
  {
    kind: "quantitative",
    heading: "영향력을 본다 (숫자로 답)",
    lead: "변인 간 영향·차이·관계를 수치로 검증하고 싶을 때.",
    example: "스마트폰 과의존이 학업태도에 미치는 영향은?",
    borderClass: "border-l-blue-400",
  },
  {
    kind: "qualitative",
    heading: "경험을 이해한다 (이야기로 답)",
    lead: "맥락·의미·과정을 깊이 있게 이해하고 싶을 때.",
    example: "과의존 청소년은 학교생활을 어떻게 경험하는가?",
    borderClass: "border-l-amber-400",
  },
  {
    kind: "mixed",
    heading: "둘 다 본다 (수치 + 이야기)",
    lead: "양적·질적 자료를 통합해 보완적으로 답하고 싶을 때(시간·자원 多).",
    example: "영향의 크기와 그 경험의 의미를 함께 살펴보려면?",
    borderClass: "border-l-emerald-400",
  },
];

function ResearchMethodsLandingPageInner() {
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  const [methods, setMethods] = useState<ResearchMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  // UX(2026-07-04): soft navigation(뒤로가기·칩 재클릭)에도 ?q= 를 반영
  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // staff+ 는 draft 포함 전체, 일반 회원은 published 만 조회 (rules 와 일치)
        const res = canManage
          ? await researchMethodsApi.list()
          : await researchMethodsApi.listPublished();
        if (cancelled) return;
        setMethods(res.data);
      } catch (err) {
        console.error("[research-methods-landing] load failed", err);
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
        matchesArchiveSearch(m, query, RESEARCH_METHOD_SEARCH_FIELDS),
      ),
    [visibleMethods, query],
  );

  const grouped = useMemo(() => {
    const byKind: Record<ResearchMethodKind, ResearchMethod[]> = {
      quantitative: [],
      qualitative: [],
      mixed: [],
    };
    for (const m of filteredMethods) {
      byKind[m.kind]?.push(m);
    }
    // 이름 가나다 정렬
    (Object.keys(byKind) as ResearchMethodKind[]).forEach((k) => {
      byKind[k].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    });
    return byKind;
  }, [filteredMethods]);

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
          icon={FlaskConical}
          title="교육공학 연구방법 가이드"
          description="양적·질적·혼합 연구방법론을 절차·기본 가정·강점·약점과 함께 정리합니다. 동일한 방법을 사용한 학회 졸업생 학위논문도 함께 확인할 수 있습니다."
        />

        {/* RT-3(2026-07-04): 파인더 크로스링크 */}
        <Link
          href="/archive/research-finder"
          className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm transition-colors hover:bg-primary/10"
        >
          <span className="text-foreground/85">
            어떤 연구방법을 골라야 할지 모르겠다면 — <span className="font-semibold text-primary">몇 가지 질문으로 추천받기</span>
          </span>
          <span aria-hidden className="shrink-0 text-primary">→</span>
        </Link>

        <div className="mt-6">
          <InlineNotification
            kind="info"
            title="학회 졸업생 학위논문과 연계된 살아있는 가이드"
            description={
              <span>
                각 연구방법 상세 페이지 하단에는 해당 방법을 사용한{" "}
                <strong>연세교육공학회 졸업생 학위논문</strong>이 큐레이트되어 있어,
                선배들의 실제 적용 사례를 함께 확인할 수 있습니다.
              </span>
            }
          />
        </div>

        {/* ── 연구질문 → 방법론 진입 가이드 ── */}
        <Card className="mt-6 rounded-2xl border bg-card shadow-sm">
          <CardContent className="py-5">
            <p className="text-sm font-semibold">
              방법론보다 <span className="text-primary">연구질문</span>이 먼저입니다
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              방법론을 먼저 정하면 연구가 막히기 쉽습니다. 연구질문이 명확해지면 방법론은 자연스럽게
              따라옵니다. 내 질문이 아래 어느 쪽에 가까운지 먼저 살펴보세요.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {QUESTION_MAPPING.map((m) => (
                <div key={m.kind} className={cn("rounded-xl border-l-4 bg-muted/20 p-3.5", m.borderClass)}>
                  <p className="text-sm font-semibold">{m.heading}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.lead}</p>
                  <p className="mt-2 rounded-lg bg-card px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground">
                    예) {m.example}
                  </p>
                  <p className="mt-2 text-xs font-medium text-primary">
                    → {RESEARCH_METHOD_KIND_LABELS[m.kind]} 방법으로
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <ArchiveSearchBar
            value={query}
            onChange={setQuery}
            placeholder="연구방법 이름·요약·교육공학 예시로 검색"
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

        {KIND_GUIDES.map((guide) => {
          const list = grouped[guide.kind];
          const Icon = guide.icon;
          return (
            <section key={guide.kind} className="mt-8">
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
                    아직 등록된 {guide.title} 가이드가 없습니다.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {list.map((m) => (
                    <Link
                      key={m.id}
                      href={`/archive/research-methods/${m.id}`}
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
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                                draft
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", RESEARCH_METHOD_KIND_COLORS[m.kind])}
                            >
                              {RESEARCH_METHOD_KIND_LABELS[m.kind]}
                            </Badge>
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {m.summary}
                        </p>
                        <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
                          자세히 보기
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
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
            본 가이드는 참고용입니다. 최종 연구설계는 지도교수와 상의하시기 바랍니다.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}


// UX(2026-07-04): useSearchParams 는 Suspense 경계 필요 — 래퍼로 충족.
// (기존 window 1회 읽기는 soft navigation 시 ?q= 변경을 못 따라가던 문제)
export default function ResearchMethodsLandingPage() {
  return (
    <Suspense fallback={null}>
      <ResearchMethodsLandingPageInner />
    </Suspense>
  );
}
