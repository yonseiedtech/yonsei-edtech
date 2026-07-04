"use client";

/**
 * 주제 탐색 — 인터뷰 모드 (2026-07-04 사용자 요청)
 *
 * "교육공학 논문에서 연구 주제를 찾는 것이 어렵다" — 관심분야·현장(근무유형)·
 * 개입(실험) 가능 여부·문제의식을 묻는 인터뷰로 주제 문장 프레임을 추천하고,
 * ① 비슷한 조건의 졸업생 선배 연구 ② 이어서 볼 아카이브 개념 ③ 진단평가·
 * 연구방법 마법사·문헌 매트릭스로 가는 다음 단계를 연결한다.
 *
 * 답변은 localStorage 에 보존되어 재방문 시 결과가 유지된다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, RotateCcw, Lightbulb, CheckCircle2,
  GraduationCap, BookMarked, Compass, ClipboardCheck, Copy,
  AlertTriangle, Sparkles, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { alumniThesesApi, archiveConceptsApi } from "@/lib/bkend";
import type { User } from "@/types";
import { OCCUPATION_LABELS } from "@/types";
import {
  TE_QUESTIONS, teNextQuestion, teActiveQuestions, teRecommend,
  teFieldFromOccupation, teMatchTheses, teMatchConcepts,
  type TEAnswers,
} from "./topic-explorer-logic";

const APPROACH_BADGE: Record<string, string> = {
  "양적": "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  "질적": "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  "혼합": "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  "개발·설계": "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};

interface Props {
  user: User;
}

export default function TopicExplorer({ user }: Props) {
  const storageKey = `yedu_topic_explorer_${user.id}`;
  const [answers, setAnswers] = useState<TEAnswers>({});
  const [restored, setRestored] = useState(false);

  // 재방문 시 이전 답변 복원
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setAnswers(JSON.parse(raw) as TEAnswers);
    } catch {
      /* 무시 */
    }
    setRestored(true);
  }, [storageKey]);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      /* 무시 */
    }
  }, [answers, restored, storageKey]);

  const current = teNextQuestion(answers);
  const active = teActiveQuestions(answers);
  const answeredCount = active.filter((q) => answers[q.id] != null).length;
  const result = teRecommend(answers);

  // 질문 전환 시 포커스 이동 (research-finder 와 동일 패턴)
  const questionRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (current) questionRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // 결과가 나온 뒤에만 선배 논문·아카이브 개념 로드
  const { data: theses, isLoading: thesesLoading } = useQuery({
    queryKey: ["te-alumni-theses"],
    queryFn: async () => (await alumniThesesApi.list()).data,
    enabled: !!result,
    staleTime: 10 * 60_000,
  });
  const { data: concepts, isLoading: conceptsLoading } = useQuery({
    queryKey: ["te-archive-concepts"],
    queryFn: async () => (await archiveConceptsApi.list()).data,
    enabled: !!result,
    staleTime: 10 * 60_000,
  });

  const thesisMatches = useMemo(
    () => (result && theses ? teMatchTheses(theses, result) : []),
    [result, theses],
  );
  const conceptMatches = useMemo(
    () => (result && concepts ? teMatchConcepts(concepts, result) : []),
    [result, concepts],
  );

  const recommendedField = teFieldFromOccupation(user.occupation);

  function choose(qid: string, value: string) {
    setAnswers((prev) => {
      const idx = TE_QUESTIONS.findIndex((q) => q.id === qid);
      const laterIds = TE_QUESTIONS.slice(idx + 1).map((q) => q.id);
      const next: TEAnswers = { ...prev, [qid]: value };
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

  async function copyFrame(sentence: string) {
    try {
      await navigator.clipboard.writeText(sentence);
      toast.success("주제 문장을 복사했습니다. 내 말로 다듬어 보세요!");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-4">
      {/* 안내 헤더 */}
      <div className="rounded-2xl border bg-gradient-to-br from-amber-50 via-card to-card p-4 dark:from-amber-950/20">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <Lightbulb size={15} className="text-amber-500" />
          주제 탐색 인터뷰
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          연구 주제는 &ldquo;내 현장 × 내 관심 × 가능한 설계&rdquo;의 교차점에서 나옵니다. 몇 가지 질문에 답하면
          주제 문장의 출발점과 비슷한 조건의 선배 연구를 찾아드립니다. 결과는 참고용이며, 최종 주제는 지도교수와 상의하세요.
        </p>
      </div>

      {/* 진행률 */}
      {!result && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>질문 {Math.min(answeredCount + 1, active.length)} / {active.length}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.round(((answeredCount + 0.5) / Math.max(1, active.length)) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* 질문 카드 */}
      {!result && current && (
        <Card className="rounded-2xl" aria-live="polite">
          <CardContent className="p-6">
            <h2 ref={questionRef} tabIndex={-1} className="text-lg font-semibold leading-snug outline-none">
              {current.title}
            </h2>
            {current.help && <p className="mt-1 text-sm text-muted-foreground">{current.help}</p>}
            <div className="mt-4 grid grid-cols-1 gap-2.5">
              {current.options.map((opt) => {
                const isRecommended = current.id === "field" && opt.value === recommendedField;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => choose(current.id, opt.value)}
                    className="group flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {opt.label}
                        {isRecommended && user.occupation && (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            프로필 기준: {OCCUPATION_LABELS[user.occupation]}
                          </Badge>
                        )}
                      </span>
                      {opt.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span>}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                );
              })}
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

      {/* ── 결과 ── */}
      {result && (
        <div className="space-y-4">
          {/* 추천 주제 방향 */}
          <Card className="rounded-2xl border-l-4 border-l-amber-400">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">추천 주제 방향</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                아래 문장은 &lsquo;출발점&rsquo;입니다 — 복사해서 내 현장의 구체적 대상·도구·변인으로 바꿔보세요.
              </p>
              <div className="mt-4 space-y-3">
                {result.frames.map((f, i) => (
                  <div key={i} className="rounded-xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className={`text-[10px] ${APPROACH_BADGE[f.approach] ?? ""}`}>
                        {f.approach}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => copyFrame(f.sentence)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        <Copy size={11} /> 복사
                      </button>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-relaxed">&ldquo;{f.sentence}&rdquo;</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.rationale}</p>
                  </div>
                ))}
              </div>
              {result.caution && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>{result.caution}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 비슷한 조건의 선배 연구 */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <GraduationCap className="h-4 w-4" aria-hidden />
                비슷한 조건의 졸업생 선배 연구
                {!thesesLoading && <span className="font-normal text-muted-foreground">({thesisMatches.length})</span>}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                내 관심 키워드·연구 대상과 겹치는 선배 논문입니다. 제목을 훑기만 해도 &lsquo;주제가 문장이 되는 방식&rsquo;이 보입니다.
              </p>
              {thesesLoading ? (
                <div className="mt-3 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : thesisMatches.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  아직 매칭되는 선배 논문이 없습니다. <Link href="/alumni/thesis" className="text-primary hover:underline">졸업생 논문 DB</Link>에서 직접 둘러보세요.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {thesisMatches.map(({ thesis: t, reasons }) => (
                    <li key={t.id}>
                      <Link href={`/alumni/thesis/${t.id}`}>
                        <div className="rounded-xl border bg-card p-3 transition-colors hover:border-primary/40">
                          <p className="text-sm font-medium leading-snug">{t.title}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{[t.authorName, t.awardedYearMonth].filter(Boolean).join(" · ")}</span>
                            {reasons.map((r) => (
                              <Badge key={r} variant="outline" className="px-1.5 py-0 text-[10px]">{r}</Badge>
                            ))}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/alumni/thesis"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                졸업생 논문 DB 전체 보기 <ExternalLink size={11} />
              </Link>
            </CardContent>
          </Card>

          {/* 이어서 볼 아카이브 개념 */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <BookMarked className="h-4 w-4" aria-hidden />
                이어서 볼 교육공학 아카이브 개념
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                주제를 이론과 연결하려면 관련 개념부터 읽어두는 것이 지름길입니다.
              </p>
              {conceptsLoading ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-24 rounded-full" />
                  ))}
                </div>
              ) : conceptMatches.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  매칭된 개념이 없습니다. <Link href="/archive" className="text-primary hover:underline">아카이브</Link>에서 직접 찾아보세요.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {conceptMatches.map((c) => (
                    <Link key={c.id} href={`/archive/concept/${c.id}`}>
                      <Badge variant="outline" className="cursor-pointer px-3 py-1 text-xs hover:border-primary/40">
                        {c.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 다음 단계 */}
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="h-4 w-4" aria-hidden />
                다음 단계
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link
                  href="/archive/research-finder"
                  className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm transition-colors hover:border-primary/40"
                >
                  <Compass size={15} className="shrink-0 text-primary" />
                  <span>
                    <span className="block font-medium">연구방법 찾기 마법사</span>
                    <span className="block text-xs text-muted-foreground">이 주제에 맞는 방법·통계까지 이어서 결정</span>
                  </span>
                </Link>
                <Link
                  href="/diagnosis"
                  className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm transition-colors hover:border-primary/40"
                >
                  <ClipboardCheck size={15} className="shrink-0 text-primary" />
                  <span>
                    <span className="block font-medium">교육공학 개념 진단평가</span>
                    <span className="block text-xs text-muted-foreground">주제 주변 개념의 내 이해도 점검</span>
                  </span>
                </Link>
                <Link
                  href="/mypage/research?tab=reading"
                  className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm transition-colors hover:border-primary/40"
                >
                  <BookMarked size={15} className="shrink-0 text-primary" />
                  <span>
                    <span className="block font-medium">논문 읽기 · 문헌 매트릭스</span>
                    <span className="block text-xs text-muted-foreground">이 주제의 선행연구를 모아 비교 정리</span>
                  </span>
                </Link>
                <Link
                  href="/mypage/research?tab=reportdoc"
                  className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm transition-colors hover:border-primary/40"
                >
                  <GraduationCap size={15} className="shrink-0 text-primary" />
                  <span>
                    <span className="block font-medium">연구보고서 인터뷰 모드</span>
                    <span className="block text-xs text-muted-foreground">정한 주제를 한 챕터씩 글로 발전</span>
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            다시 탐색하기
          </Button>
        </div>
      )}
    </div>
  );
}
