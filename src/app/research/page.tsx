"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, GraduationCap, Sparkles, ArrowRight, Type, Network, Cloud } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { alumniThesesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { AlumniThesis } from "@/types";
import ResearchLineageMap from "@/features/research-analytics/ResearchLineageMap";
import KeywordCloud from "@/features/research-analytics/KeywordCloud";
import TitleNgramTrend from "@/features/research-analytics/TitleNgramTrend";
import ResearchTypeChart from "@/features/research-analytics/ResearchTypeChart";
import SubjectDistribution from "@/features/research-analytics/SubjectDistribution";
import { STOPWORDS, normalizeKeyword, yearFrom } from "@/features/research-analytics/shared";
import { usePageHeader } from "@/features/site-settings/useSiteContent";

interface EraSummary {
  label: string;
  range: string;
  count: number;
  topKeywords: { word: string; count: number }[];
  highlight: string;
}

const ERA_HIGHLIGHTS: Record<string, string> = {
  "2000-2004": "웹 기반 학습·CAI에서 e-Learning 본격 전환",
  "2005-2009": "LMS·CSCL·블렌디드 러닝 본격화",
  "2010-2014": "모바일·SNS·MOOC 등장과 확산",
  "2015-2019": "학습분석·플립러닝·디지털 콘텐츠 다양화",
  "2020-": "AI·메타버스·디지털 전환 시대",
};

function pickEra(year: number | null): string | null {
  if (year == null || year < 2000) return null;
  if (year <= 2004) return "2000-2004";
  if (year <= 2009) return "2005-2009";
  if (year <= 2014) return "2010-2014";
  if (year <= 2019) return "2015-2019";
  return "2020-";
}

export default function ResearchAnalyticsPage() {
  const { user } = useAuthStore();
  const [theses, setTheses] = useState<AlumniThesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await alumniThesesApi.list({ limit: 500 });
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

  const stats = useMemo(() => {
    const valid = theses.filter((t) => yearFrom(t) != null);
    const years = valid.map((t) => yearFrom(t)!).sort((a, b) => a - b);
    return {
      total: theses.length,
      yearRange: years.length > 0 ? `${years[0]} – ${years[years.length - 1]}` : "—",
      withKeywords: theses.filter((t) => t.keywords && t.keywords.length > 0).length,
    };
  }, [theses]);

  const header = usePageHeader("research", {
    title: "연세교육공학 연구 분석",
    description: `연세대학교 교육대학원 교육공학전공 졸업생 학위논문 ${stats.total}건의 키워드·제목·시대별 흐름·연구 계보를 시각화합니다.`,
  });

  const keywordCount = useMemo(() => {
    const set = new Set<string>();
    theses.forEach((t) =>
      (t.keywords ?? []).forEach((raw) => {
        const k = normalizeKeyword(raw);
        if (k && k.length >= 2 && !STOPWORDS.has(k)) set.add(k);
      }),
    );
    return set.size;
  }, [theses]);

  const eras: EraSummary[] = useMemo(() => {
    const order = ["2000-2004", "2005-2009", "2010-2014", "2015-2019", "2020-"] as const;
    const ranges: Record<string, string> = {
      "2000-2004": "2000–2004",
      "2005-2009": "2005–2009",
      "2010-2014": "2010–2014",
      "2015-2019": "2015–2019",
      "2020-": "2020–현재",
    };
    return order.map((label) => {
      const subset = theses.filter((t) => pickEra(yearFrom(t)) === label);
      const map = new Map<string, number>();
      subset.forEach((t) =>
        (t.keywords ?? []).forEach((raw) => {
          const k = normalizeKeyword(raw);
          if (!k || k.length < 2 || STOPWORDS.has(k)) return;
          map.set(k, (map.get(k) ?? 0) + 1);
        }),
      );
      const top = Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([word, count]) => ({ word, count }));
      return {
        label,
        range: ranges[label],
        count: subset.length,
        topKeywords: top,
        highlight: ERA_HIGHLIGHTS[label],
      };
    });
  }, [theses]);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 size={24} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold sm:text-3xl">{header.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {header.description}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatCard label="수집 논문" value={`${stats.total}건`} />
          <StatCard label="기간" value={stats.yearRange} />
          <StatCard label="고유 키워드" value={`${keywordCount}개`} />
        </div>

        {loading ? (
          <div className="mt-10 space-y-4" aria-busy="true" aria-label="연구 데이터 불러오는 중">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-28" />
            </div>
            <Skeleton className="h-[420px] w-full rounded-xl" />
          </div>
        ) : error ? (
          <p className="mt-12 text-sm text-destructive" role="alert">⚠ {error}</p>
        ) : (
          <>
            <Tabs defaultValue="keyword" className="mt-8">
              <TabsList variant="line" className="flex-wrap justify-start gap-1 border-b bg-transparent p-0">
                <TabsTrigger
                  value="keyword"
                  className="data-active:border-primary data-active:text-primary border-b-2 border-transparent rounded-none flex-none px-3 py-2 text-sm"
                >
                  <Cloud size={14} className="mr-1.5" />
                  키워드 분석
                </TabsTrigger>
                <TabsTrigger
                  value="title"
                  className="data-active:border-primary data-active:text-primary border-b-2 border-transparent rounded-none flex-none px-3 py-2 text-sm"
                >
                  <Type size={14} className="mr-1.5" />
                  제목 분석
                </TabsTrigger>
                <TabsTrigger
                  value="lineage"
                  className="data-active:border-primary data-active:text-primary border-b-2 border-transparent rounded-none flex-none px-3 py-2 text-sm"
                >
                  <Network size={14} className="mr-1.5" />
                  연구 계보
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Keyword Analysis */}
              <TabsContent value="keyword" className="mt-6">
                <section>
                  <SectionHeader
                    icon={<BookOpen size={16} />}
                    title="키워드 워드 클라우드"
                    desc={`총 ${keywordCount}개 키워드를 수집했습니다. 상위 항목 수와 조회 기간을 조정할 수 있으며, 글자 크기는 등장 빈도에 비례합니다.`}
                  />
                  <div className="mt-4 rounded-2xl border bg-card p-5">
                    <KeywordCloud theses={theses} defaultTopN={30} />
                  </div>
                </section>

                <section className="mt-8">
                  <SectionHeader
                    icon={<GraduationCap size={16} />}
                    title="주요 연구 흐름 타임라인"
                    desc="시대별 졸업논문 분포와 대표 키워드를 한눈에 확인할 수 있습니다."
                  />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {eras.map((era) => (
                      <div
                        key={era.label}
                        className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                              {era.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{era.range}</p>
                          </div>
                          <Badge variant="secondary">{era.count}건</Badge>
                        </div>
                        <p className="mt-3 text-sm font-medium leading-snug">{era.highlight}</p>
                        {era.topKeywords.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {era.topKeywords.map((k) => (
                              <Badge
                                key={k.word}
                                variant="outline"
                                className="text-[11px] font-normal"
                              >
                                {k.word}
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  ×{k.count}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </TabsContent>

              {/* Tab 2: Title Analysis */}
              <TabsContent value="title" className="mt-6">
                <section>
                  <SectionHeader
                    icon={<Type size={16} />}
                    title="제목 N-gram 트렌드"
                    desc="논문 제목에서 추출한 2~3어절 표현의 등장 빈도와 시대별 분포를 보여줍니다. 키워드(명사 단위)로는 잡히지 않는 구문 단위 표현을 분석할 수 있습니다."
                  />
                  <div className="mt-4 rounded-2xl border bg-card p-5">
                    <TitleNgramTrend theses={theses} />
                  </div>
                </section>

                <section className="mt-8">
                  <SectionHeader
                    icon={<BarChart3 size={16} />}
                    title="연구 유형 자동 분류"
                    desc="제목 어휘를 사전과 매칭해 정량/정성, 개발/분석 두 축으로 자동 태깅하고 시대별 추세를 보여줍니다."
                  />
                  <div className="mt-4">
                    <ResearchTypeChart theses={theses} />
                  </div>
                </section>

                <section className="mt-8">
                  <SectionHeader
                    icon={<GraduationCap size={16} />}
                    title="연구 대상자 · 응용 영역 분포"
                    desc="제목에 등장한 연구 대상자(학생·교사·성인 등)와 응용 영역(초중등·대학·평생교육 등)을 분류해 비중과 시대별 변화를 보여줍니다."
                  />
                  <div className="mt-4">
                    <SubjectDistribution theses={theses} />
                  </div>
                </section>
              </TabsContent>

              {/* Tab 3: Lineage Map */}
              <TabsContent value="lineage" className="mt-6">
                <section>
                  <SectionHeader
                    icon={<Sparkles size={16} />}
                    title="연구 계보도"
                    desc="시대별 핵심 키워드가 어떻게 이어지고 분기되었는지를 보여줍니다. 같은 키워드는 시대 사이를 곡선으로 잇고, 곡선의 굵기는 해당 시대의 연구 비중을 나타냅니다."
                  />
                  <div className="mt-4 rounded-2xl border bg-card p-3 sm:p-5 overflow-hidden">
                    <ResearchLineageMap theses={theses} />
                  </div>
                </section>
              </TabsContent>
            </Tabs>

            {/* Member CTA */}
            <section className="mt-10 rounded-2xl border bg-gradient-to-br from-primary/5 to-primary/10 p-6 sm:p-8">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold sm:text-lg">전체 {stats.total}건 학위논문 목록을 열람하세요</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    저자·지도교수·초록·원문(dCollection) 링크는 학회 회원에게만 공개됩니다.
                  </p>
                </div>
                {user ? (
                  <Link
                    href="/alumni/thesis"
                    className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    학위논문 목록 보기
                    <ArrowRight size={14} className="ml-1.5" />
                  </Link>
                ) : (
                  <div className="flex gap-2">
                    <Link
                      href="/login"
                      className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      로그인
                    </Link>
                    <Link
                      href="/signup"
                      className="inline-flex h-10 items-center rounded-md border border-primary bg-card px-5 text-sm font-medium text-primary hover:bg-primary/5"
                    >
                      회원가입
                    </Link>
                  </div>
                )}
              </div>
            </section>

            <p className="mt-6 text-[11px] text-muted-foreground">
              ※ 데이터 출처: 연세대학교 교육대학원 학위논문 dCollection (수집 시점: 2026년 4월).
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-bold sm:text-lg">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </h2>
      <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">{desc}</p>
    </div>
  );
}
