"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, GraduationCap, Sparkles, ArrowRight } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { alumniThesesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { AlumniThesis } from "@/types";
import ResearchLineageMap from "@/features/research-analytics/ResearchLineageMap";
import KeywordCloud from "@/features/research-analytics/KeywordCloud";

const STOPWORDS = new Set([
  "연구",
  "교육",
  "교육공학",
  "학습",
  "분석",
  "사례",
  "효과",
  "관계",
  "영향",
  "방안",
  "모형",
  "프로그램",
  "활용",
  "탐색",
  "고찰",
  "개발",
  "적용",
  "설계",
  "수행",
  "조사",
  "비교",
  "검증",
  "구조",
  "변인",
  "특성",
  "수업",
  "학생",
  "학교",
  "학",
  "을",
  "를",
  "의",
]);

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

function yearFrom(t: AlumniThesis): number | null {
  const m = (t.awardedYearMonth ?? "").match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

function normalizeKeyword(raw: string): string {
  return raw.replace(/[\s·,()<>「」『』\[\]'"]/g, "").trim();
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

  const keywordCounts = useMemo(() => {
    const map = new Map<string, number>();
    theses.forEach((t) => {
      (t.keywords ?? []).forEach((raw) => {
        const k = normalizeKeyword(raw);
        if (!k || k.length < 2 || STOPWORDS.has(k)) return;
        map.set(k, (map.get(k) ?? 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);
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
            <h1 className="text-2xl font-bold sm:text-3xl">연세교육공학 연구 분석</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              연세대학교 교육대학원 교육공학전공 졸업생 학위논문 {stats.total}건의 키워드·시대별 흐름·연구 계보를 시각화합니다.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatCard label="수집 논문" value={`${stats.total}건`} />
          <StatCard label="기간" value={stats.yearRange} />
          <StatCard label="키워드 수록" value={`${stats.withKeywords}건`} />
        </div>

        {loading ? (
          <LoadingSpinner className="mt-16" />
        ) : error ? (
          <p className="mt-12 text-sm text-destructive">⚠ {error}</p>
        ) : (
          <>
            {/* Section 1: Lineage Map */}
            <section className="mt-10">
              <SectionHeader
                icon={<Sparkles size={16} />}
                title="연구 계보도"
                desc="시대별 핵심 키워드가 어떻게 이어지고 분기되었는지를 보여줍니다. 같은 키워드는 시대 사이를 곡선으로 잇고, 곡선의 굵기는 해당 시대의 연구 비중을 나타냅니다."
              />
              <div className="mt-4 rounded-2xl border bg-white p-3 sm:p-5 overflow-hidden">
                <ResearchLineageMap theses={theses} />
              </div>
            </section>

            {/* Section 2: Keyword Cloud */}
            <section className="mt-10">
              <SectionHeader
                icon={<BookOpen size={16} />}
                title="키워드 워드 클라우드"
                desc={`총 ${keywordCounts.length}개 키워드 중 상위 80개를 표시합니다. 글자 크기는 등장 빈도에 비례합니다.`}
              />
              <div className="mt-4 rounded-2xl border bg-white p-5">
                <KeywordCloud items={keywordCounts.slice(0, 80)} />
              </div>
            </section>

            {/* Section 3: Era Timeline Cards */}
            <section className="mt-10">
              <SectionHeader
                icon={<GraduationCap size={16} />}
                title="주요 연구 흐름 타임라인"
                desc="시대별 졸업논문 분포와 대표 키워드를 한눈에 확인할 수 있습니다."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {eras.map((era) => (
                  <div
                    key={era.label}
                    className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
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
                      className="inline-flex h-10 items-center rounded-md border border-primary bg-white px-5 text-sm font-medium text-primary hover:bg-primary/5"
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
    <div className="rounded-xl border bg-white p-4">
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
