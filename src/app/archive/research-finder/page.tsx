"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Compass,
  CheckCircle2,
  GraduationCap,
  Layers,
  BarChart3,
  AlertTriangle,
  ExternalLink,
  Info,
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
  researchMethodsApi,
  statisticalMethodsApi,
  alumniThesesApi,
} from "@/lib/bkend";
import type { ResearchMethod, StatisticalMethod, AlumniThesis } from "@/types";
import {
  rfActiveQuestions,
  rfNextQuestion,
  rfRecommend,
  RF_QUESTIONS,
  type RFAnswers,
} from "@/features/archive/researchFinder";

/** 문서 미로드 시 raw seedKey 노출 방지용 라벨 폴백 */
const RF_SEEDKEY_LABEL: Record<string, string> = {
  "research-method:experimental": "실험연구",
  "research-method:quasi-experimental": "준실험연구",
  "research-method:survey": "조사연구",
  "research-method:case-study": "사례연구",
  "research-method:phenomenology": "현상학적 연구",
  "research-method:grounded-theory": "근거이론",
  "research-method:ethnography": "문화기술지",
  "research-method:narrative-inquiry": "내러티브 탐구",
  "research-method:action-research": "실행연구",
  "research-method:qualitative-content-analysis": "질적 내용분석",
  "research-method:convergent-parallel": "수렴적 병렬 혼합설계",
  "research-method:explanatory-sequential": "설명적 순차 혼합설계",
  "research-method:exploratory-sequential": "탐색적 순차 혼합설계",
  "research-method:mixed-methods-overview": "혼합연구 개관",
  "research-method:design-based-research": "설계기반연구(DBR)",
  "research-method:developmental-research": "개발연구",
  "research-method:program-development": "프로그램 개발연구",
  "research-method:scale-development": "척도 개발연구",
  "research-method:meta-analysis": "메타분석",
  "research-method:delphi": "델파이 조사",
  "research-method:sem": "구조방정식 연구",
};

export default function ResearchFinderPage() {
  const { user } = useAuthStore();
  const canManage = isAtLeast(user, "staff");

  const [methods, setMethods] = useState<ResearchMethod[]>([]);
  const [statMethods, setStatMethods] = useState<StatisticalMethod[]>([]);
  const [theses, setTheses] = useState<AlumniThesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [answers, setAnswers] = useState<RFAnswers>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const [rm, sm, at] = await Promise.all([
          canManage ? researchMethodsApi.list() : researchMethodsApi.listPublished(),
          statisticalMethodsApi.listPublished(),
          alumniThesesApi.list(),
        ]);
        if (cancelled) return;
        setMethods(rm.data);
        setStatMethods(sm.data);
        setTheses(at.data);
      } catch (err) {
        setLoadFailed(true);
        console.error("[research-finder] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage, retryTick]);

  const rmBySeedKey = useMemo(() => {
    const m = new Map<string, ResearchMethod>();
    for (const r of methods) if (r.seedKey) m.set(r.seedKey, r);
    return m;
  }, [methods]);
  const smBySeedKey = useMemo(() => {
    const m = new Map<string, StatisticalMethod>();
    for (const s of statMethods) if (s.seedKey) m.set(s.seedKey, s);
    return m;
  }, [statMethods]);

  const current = rfNextQuestion(answers);
  // UX-1(2026-07-04): 질문 전환 시 포커스 유실(키보드가 body 로 떨어짐) — 새 질문 제목으로 이동
  const questionRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (current) questionRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
  const active = rfActiveQuestions(answers);
  const answeredCount = active.filter((q) => answers[q.id] != null).length;
  const result = rfRecommend(answers);

  function choose(qid: string, value: string) {
    setAnswers((prev) => {
      const idx = RF_QUESTIONS.findIndex((q) => q.id === qid);
      const laterIds = RF_QUESTIONS.slice(idx + 1).map((q) => q.id);
      const next: RFAnswers = { ...prev, [qid]: value };
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

  const primary = result ? rmBySeedKey.get(result.primary) : undefined;
  const linkedTheses = useMemo(() => {
    if (!primary) return [];
    return theses
      // 자동추출(researchMethodIds) ∪ 운영자 큐레이트(researchMethods)
      .filter((t) =>
        [...(t.researchMethodIds || []), ...(t.researchMethods || [])].includes(primary.id),
      )
      .sort((a, b) => (b.awardedYearMonth || "").localeCompare(a.awardedYearMonth || ""))
      .slice(0, 6);
  }, [primary, theses]);

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
          icon={Compass}
          title="연구방법 찾기 — 추천 마법사"
          description="연구 목적·상황에 답하면 적합한 연구방법을 추천합니다. 한 연구엔 여러 방법이 함께 쓰일 수 있어, 구성 방법과 분석 통계까지 연결해 드립니다."
        />

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

        {/* UX(2026-07-04): 로드 실패 안내 + 재시도 */}
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
              {current.help && <p className="mt-1 text-sm text-muted-foreground">{current.help}</p>}
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
                      {opt.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span>}
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

        {result && (
          <div className="mt-4 space-y-4">
            {/* 추천 연구방법 */}
            <Card className="rounded-2xl border-l-4 border-l-warning">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-warning">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">추천 연구방법</span>
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  {primary?.name ?? RF_SEEDKEY_LABEL[result.primary] ?? result.primary}
                </h2>
                {primary?.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{primary.summary}</p>
                )}
                <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm leading-relaxed">{result.rationale}</p>
                {primary && (
                  <Link href={`/archive/research-methods/${primary.id}`}>
                    <Button className="mt-4" size="sm">
                      이 방법 자세히 보기
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* 함께 쓰이는 방법 (복수) */}
            {result.combines.length > 0 && (
              <Card className="rounded-2xl">
                <CardContent className="p-5">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <Layers className="h-4 w-4" aria-hidden />
                    한 연구에 함께 쓰이는 방법
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    이 설계는 아래 방법들을 단계·역할에 맞게 결합합니다.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {result.combines.map((c) => {
                      const m = rmBySeedKey.get(c.seedKey);
                      const label = m?.name ?? RF_SEEDKEY_LABEL[c.seedKey] ?? c.seedKey;
                      const inner = (
                        <div className="flex items-center justify-between gap-2 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40">
                          <span className="text-sm font-medium">{label}</span>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{c.role}</Badge>
                            {m && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                          </span>
                        </div>
                      );
                      return (
                        <li key={c.seedKey}>
                          {m ? <Link href={`/archive/research-methods/${m.id}`}>{inner}</Link> : inner}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 분석(통계) 단계 — 통계 마법사 연계 */}
            {result.hasQuantStrand && (
              <Card className="rounded-2xl">
                <CardContent className="p-5">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <BarChart3 className="h-4 w-4" aria-hidden />
                    분석(통계) 단계
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    이 연구의 양적 자료 분석에 흔히 쓰는 통계방법입니다. 정확한 선택은 통계방법 마법사에서 이어가세요.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.statMethods.map((sk) => {
                      const s = smBySeedKey.get(sk);
                      if (!s) return null;
                      return (
                        <Link key={sk} href={`/archive/statistical-methods/${s.id}`}>
                          <Badge variant="outline" className="cursor-pointer px-3 py-1 text-xs hover:border-primary/40">
                            {s.name}
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                  <Link href="/archive/method-finder">
                    <Button variant="outline" size="sm" className="mt-3">
                      통계방법 찾기로 이어가기
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* 선배 논문 */}
            <Card className="rounded-2xl">
              <CardContent className="p-5">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <GraduationCap className="h-4 w-4" aria-hidden />
                  이 방법을 사용한 졸업생 선배 논문
                  {!loading && <span className="font-normal text-muted-foreground">({linkedTheses.length})</span>}
                </h3>
                {loading ? (
                  <div className="mt-3 space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : linkedTheses.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">아직 연결된 졸업생 논문이 없습니다.</p>
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
                            <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
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

        <div className="mt-10 flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 p-4 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            이 추천은 일반적 의사결정 가이드입니다. 실제 연구문제·현장·자료에 따라 적합한 방법은 달라질 수 있으니,
            최종 설계는 지도교수와 상의하시기 바랍니다.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
