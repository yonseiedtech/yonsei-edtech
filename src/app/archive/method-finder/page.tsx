"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Wand2,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  ExternalLink,
  Info,
  Shuffle,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import {
  statisticalMethodsApi,
  researchMethodsApi,
  alumniThesesApi,
} from "@/lib/bkend";
import type { StatisticalMethod, ResearchMethod, AlumniThesis } from "@/types";
import {
  FINDER_QUESTIONS,
  activeQuestions,
  nextQuestion,
  recommend,
  type FinderAnswers,
} from "@/features/archive/methodFinder";

// seedKey → 표시용 이름 폴백 (해당 방법 문서가 로드되지 않았을 때)
const SEEDKEY_LABEL: Record<string, string> = {
  "statistical-method:t-test": "t-검정 (독립/대응표본)",
  "statistical-method:anova-oneway": "일원분산분석 (ANOVA)",
  "statistical-method:ancova": "공분산분석 (ANCOVA)",
  "statistical-method:manova": "다변량분산분석 (MANOVA)",
  "statistical-method:mancova": "다변량공분산분석 (MANCOVA)",
  "statistical-method:chi-square": "카이제곱 검정 (χ²)",
  "statistical-method:correlation": "상관분석",
  "statistical-method:multiple-regression": "다중회귀분석",
  "statistical-method:logistic-regression": "로지스틱회귀분석",
  "statistical-method:efa": "탐색적 요인분석 (EFA)",
  "statistical-method:cfa": "확인적 요인분석 (CFA)",
  "statistical-method:sem": "구조방정식모형 (SEM)",
  "statistical-method:cvi": "내용타당도지수 (CVI)",
  "statistical-method:rm-anova": "반복측정 분산분석 (RM-ANOVA)",
  "statistical-method:hlm": "다층모형 (HLM/MLM)",
  "statistical-method:mann-whitney": "Mann-Whitney U 검정",
  "statistical-method:wilcoxon-signed-rank": "Wilcoxon 부호순위 검정",
  "statistical-method:kruskal-wallis": "Kruskal-Wallis H 검정",
  "statistical-method:friedman": "Friedman 검정",
  "statistical-method:cronbach-alpha": "신뢰도 분석 (Cronbach's α)",
};

export default function MethodFinderPage() {
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  const [methods, setMethods] = useState<StatisticalMethod[]>([]);
  const [researchMethods, setResearchMethods] = useState<ResearchMethod[]>([]);
  const [theses, setTheses] = useState<AlumniThesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const [answers, setAnswers] = useState<FinderAnswers>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const [sm, rm, at] = await Promise.all([
          canManage ? statisticalMethodsApi.list() : statisticalMethodsApi.listPublished(),
          researchMethodsApi.listPublished(),
          alumniThesesApi.list(),
        ]);
        if (cancelled) return;
        setMethods(sm.data);
        setResearchMethods(rm.data);
        setTheses(at.data);
      } catch (err) {
        setLoadFailed(true);
        console.error("[method-finder] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage, retryTick]);

  const bySeedKey = useMemo(() => {
    const map = new Map<string, StatisticalMethod>();
    for (const m of methods) if (m.seedKey) map.set(m.seedKey, m);
    return map;
  }, [methods]);

  const current = nextQuestion(answers);
  // UX-1(2026-07-04): 질문 전환 시 포커스 유실(키보드가 body 로 떨어짐) — 새 질문 제목으로 이동
  const questionRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (current) questionRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
  const active = activeQuestions(answers);
  const answeredCount = active.filter((q) => answers[q.id] != null).length;
  const result = recommend(answers);

  function choose(qid: string, value: string) {
    setAnswers((prev) => {
      // 이 질문 이후의 답안은 분기가 달라질 수 있으니 무효화
      const idx = FINDER_QUESTIONS.findIndex((q) => q.id === qid);
      const laterIds = FINDER_QUESTIONS.slice(idx + 1).map((q) => q.id);
      const next: FinderAnswers = { ...prev, [qid]: value };
      for (const id of laterIds) delete next[id];
      return next;
    });
  }

  function back() {
    const answered = active.filter((q) => answers[q.id] != null);
    const last = answered[answered.length - 1];
    if (!last) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[last.id];
      return next;
    });
  }

  function reset() {
    setAnswers({});
  }

  const primaryMethod = result ? bySeedKey.get(result.primary) : undefined;
  const linkedTheses = useMemo(() => {
    if (!primaryMethod) return [];
    return theses
      // 자동추출(statMethodIds) ∪ 운영자 큐레이트(statisticalMethods) — 큐레이션이 추천에 반영되도록
      .filter((t) =>
        [...(t.statMethodIds || []), ...(t.statisticalMethods || [])].includes(primaryMethod.id),
      )
      .sort((a, b) => (b.awardedYearMonth || "").localeCompare(a.awardedYearMonth || ""))
      .slice(0, 6);
  }, [primaryMethod, theses]);

  const relatedResearch = useMemo(() => {
    if (!primaryMethod) return [];
    const ids = new Set(primaryMethod.relatedResearchMethodIds || []);
    return researchMethods.filter((r) => ids.has(r.id));
  }, [primaryMethod, researchMethods]);

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
          icon={Wand2}
          title="통계방법 찾기 — 추천 마법사"
          description="몇 가지 질문에 답하면 연구 상황에 맞는 통계방법을 추천하고, 관련 개념과 그 방법을 사용한 졸업생 선배 논문을 함께 보여 드립니다."
        />

        {/* 진행 표시 */}
        {!result && (
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <span>질문 {Math.min(answeredCount + 1, active.length)} / {active.length}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  // UX-1(2026-07-04): 실제 남은 질문 수 기반 진행률 (기존 공식은 총 질문 수와 무관)
                  width: `${Math.min(100, Math.round(((answeredCount + 0.5) / Math.max(1, active.length)) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* UX(2026-07-04): 로드 실패를 삼키던 문제 — 결과가 반쪽(링크·사례 소실)이 되기 전에 안내 */}
        {loadFailed && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm text-warning">
            <span>가이드 데이터를 불러오지 못했습니다 — 추천 결과의 상세 링크·선배 논문 매칭이 표시되지 않을 수 있어요.</span>
            <button
              type="button"
              onClick={() => setRetryTick((t) => t + 1)}
              className="shrink-0 rounded-lg border border-warning/40 bg-white px-2.5 py-1 text-xs font-medium hover:bg-warning/10 dark:bg-transparent"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 질문 카드 */}
        {!result && current && (
          <Card className="mt-4 rounded-2xl" aria-live="polite">
            <CardContent className="p-6">
              <h2
                ref={questionRef}
                tabIndex={-1}
                className="text-lg font-semibold leading-snug outline-none"
              >
                {current.title}
              </h2>
              {current.help && (
                <p className="mt-1 text-sm text-muted-foreground">{current.help}</p>
              )}
              {current.terms && current.terms.length > 0 && (
                <div className="mt-3 rounded-xl border border-info/20 bg-info/5 p-3">
                  <p className="flex items-center gap-1 text-xs font-semibold text-info">
                    <Info className="h-3.5 w-3.5" aria-hidden />
                    용어 도움말
                  </p>
                  <dl className="mt-1.5 space-y-1.5">
                    {current.terms.map((t) => (
                      <div key={t.term} className="text-xs">
                        <dt className="font-medium text-info">{t.term}</dt>
                        <dd className="leading-relaxed text-info/90">{t.def}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 gap-2.5">
                {current.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => choose(current.id, opt.value)}
                    className="group flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span>
                      <span className="block text-sm font-medium">{opt.label}</span>
                      {opt.hint && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span>
                      )}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                ))}
              </div>
              {answeredCount > 0 && (
                <Button variant="ghost" size="sm" className="mt-4" onClick={back}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  이전
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* 결과 */}
        {result && (
          <div className="mt-4 space-y-4">
            <Card className="rounded-2xl border-l-4 border-l-success">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">추천 통계방법</span>
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  {primaryMethod?.name ?? SEEDKEY_LABEL[result.primary] ?? result.primary}
                </h2>
                {primaryMethod?.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {primaryMethod.summary}
                  </p>
                )}
                <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm leading-relaxed">
                  {result.rationale}
                </p>
                {primaryMethod && (
                  <Link href={`/archive/statistical-methods/${primaryMethod.id}`}>
                    <Button className="mt-4" size="sm">
                      이 방법 자세히 보기
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* 동일 데이터로 시도해볼 수 있는 다른 방법 */}
            {result.alternatives.length > 0 && (
              <Card className="rounded-2xl">
                <CardContent className="p-5">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <Shuffle className="h-4 w-4" aria-hidden />
                    동일 데이터로 시도해볼 수 있는 다른 방법
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {result.alternatives.map((a2) => {
                      const m = bySeedKey.get(a2.seedKey);
                      const label = m?.name ?? SEEDKEY_LABEL[a2.seedKey] ?? a2.seedKey;
                      const inner = (
                        <div className="rounded-xl border bg-card p-3 transition-colors hover:border-primary/40">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{label}</span>
                            {m && (
                              <ArrowRight
                                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                                aria-hidden
                              />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{a2.reason}</p>
                        </div>
                      );
                      return (
                        <li key={a2.seedKey}>
                          {m ? (
                            <Link href={`/archive/statistical-methods/${m.id}`}>{inner}</Link>
                          ) : (
                            inner
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 기본가정과 위배 시 보정·대안 */}
            {primaryMethod?.assumptions && primaryMethod.assumptions.length > 0 && (
              <Card className="rounded-2xl">
                <CardContent className="p-5">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <ShieldAlert className="h-4 w-4" aria-hidden />
                    기본가정과 위배 시 보정·대안
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    아래 가정을 먼저 점검하세요. 가정이 깨지면 제시된 보정·대안을 검토합니다.
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {primaryMethod.assumptions
                      .filter((as) => as && typeof as === "object")
                      .map((as, i) => (
                        <li key={as.id ?? i} className="rounded-xl border bg-card p-3">
                          <p className="text-sm font-medium">{as.name}</p>
                          {as.description && (
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                              {as.description}
                            </p>
                          )}
                          {as.howToCheck && (
                            <p className="mt-1 text-xs leading-relaxed">
                              <span className="font-medium text-muted-foreground">점검: </span>
                              {as.howToCheck}
                            </p>
                          )}
                          {as.ifViolated && (
                            <p className="mt-1.5 rounded-lg bg-warning/5 p-2 text-xs leading-relaxed text-warning">
                              <span className="font-medium">위배 시: </span>
                              {as.ifViolated}
                            </p>
                          )}
                        </li>
                      ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 관련 연구방법 */}
            {relatedResearch.length > 0 && (
              <Card className="rounded-2xl">
                <CardContent className="p-5">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <BookOpen className="h-4 w-4" />
                    관련 연구방법
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {relatedResearch.map((r) => (
                      <Link key={r.id} href={`/archive/research-methods/${r.id}`}>
                        <Badge
                          variant="outline"
                          className="cursor-pointer px-3 py-1 text-xs hover:border-primary/40"
                        >
                          {r.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 졸업생 선배 논문 */}
            <Card className="rounded-2xl">
              <CardContent className="p-5">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <GraduationCap className="h-4 w-4" />
                  이 방법을 사용한 졸업생 선배 논문
                  {!loading && (
                    <span className="font-normal text-muted-foreground">({linkedTheses.length})</span>
                  )}
                </h3>
                {loading ? (
                  <div className="mt-3 space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : linkedTheses.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    아직 연결된 졸업생 논문이 없습니다.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {linkedTheses.map((t) => {
                      const href = t.dcollectionUrl || t.pdfUrl;
                      const inner = (
                        <div className="rounded-xl border bg-card p-3 transition-colors hover:border-primary/40">
                          <p className="text-sm font-medium leading-snug">{t.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[t.authorName, t.awardedYearMonth].filter(Boolean).join(" · ")}
                            {href && <ExternalLink className="ml-1 inline h-3 w-3 align-text-bottom" />}
                          </p>
                        </div>
                      );
                      return (
                        <li key={t.id}>
                          {href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer">
                              {inner}
                            </a>
                          ) : (
                            inner
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Button variant="outline" onClick={reset}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              다시 찾기
            </Button>
          </div>
        )}

        {/* 학술 책임 고지 */}
        <div className="mt-10 flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 p-4 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            이 추천은 일반적 의사결정 가이드입니다. 실제 자료의 가정 점검·표본·연구설계에 따라 적합한
            방법은 달라질 수 있으니, 최종 분석 설계는 지도교수와 상의하시기 바랍니다.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
