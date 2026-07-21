"use client";

/**
 * LivePollRespond — 참가자가 라이브 설문에 응답하는 컴포넌트.
 *
 * - 문항 유형별 입력(단일선택/다중선택/텍스트/별점)
 * - 필수 문항 검증 후 pollResponsesApi.create 제출
 * - allowAnonymous=false 이고 비로그인 시 로그인 안내
 * - 제출 후 showResults=true 이면 실시간 집계 결과(CSS 바) 표시
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { pollsApi, pollResponsesApi } from "@/lib/bkend";
import type { Poll, PollQuestion, PollResponse } from "@/types/academic";
import { useLivePollResults, aggregateResults } from "./useLivePollResults";
import type { QuestionAggregation } from "./useLivePollResults";

// ── 문항 입력 컴포넌트 ──

interface QuestionInputProps {
  question: PollQuestion;
  answer: string | string[] | number | undefined;
  onSingle: (val: string) => void;
  onMultiple: (optId: string) => void;
  onText: (val: string) => void;
  onRating: (val: number) => void;
}

function QuestionInput({
  question,
  answer,
  onSingle,
  onMultiple,
  onText,
  onRating,
}: QuestionInputProps) {
  const { type, options, required } = question;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold">
        {question.text}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </p>

      {type === "single" && (
        <div className="space-y-1.5">
          {options?.map((opt) => {
            const checked = answer === opt.id;
            return (
              <label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors",
                  checked
                    ? "border-cat-1 bg-cat-1/5 text-cat-1"
                    : "border-border bg-background text-foreground hover:border-cat-1/30",
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={opt.id}
                  checked={checked}
                  onChange={() => onSingle(opt.id)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border",
                    checked
                      ? "border-cat-1 bg-cat-1"
                      : "border-muted-foreground",
                  )}
                >
                  {checked && (
                    <span className="block h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>
                {opt.text}
              </label>
            );
          })}
        </div>
      )}

      {type === "multiple" && (
        <div className="space-y-1.5">
          {options?.map((opt) => {
            const cur = Array.isArray(answer) ? answer : [];
            const checked = cur.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors",
                  checked
                    ? "border-cat-1 bg-cat-1/5 text-cat-1"
                    : "border-border bg-background text-foreground hover:border-cat-1/30",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onMultiple(opt.id)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-cat-1 bg-cat-1"
                      : "border-muted-foreground",
                  )}
                >
                  {checked && (
                    <svg
                      viewBox="0 0 10 10"
                      className="h-3 w-3 fill-none stroke-white stroke-[1.5]"
                    >
                      <polyline points="2,5 4,8 8,3" />
                    </svg>
                  )}
                </span>
                {opt.text}
              </label>
            );
          })}
        </div>
      )}

      {type === "text" && (
        <textarea
          value={typeof answer === "string" ? answer : ""}
          onChange={(e) => onText(e.target.value)}
          placeholder="답변을 입력하세요"
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cat-1/40"
        />
      )}

      {type === "rating" && (
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5] as const).map((n) => {
            const active = answer === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onRating(n)}
                aria-pressed={active}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold transition-colors",
                  active
                    ? "border-cat-1 bg-cat-1 text-white"
                    : "border-border bg-background text-muted-foreground hover:border-cat-1/40 hover:text-foreground",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 집계 결과 뷰 ──

interface LiveResultsViewProps {
  poll: Poll;
  responses: PollResponse[];
  loading: boolean;
}

function QuestionResultBar({
  label,
  count,
  max,
  total,
  color = "bg-cat-1",
}: {
  label: string;
  count: number;
  max: number;
  total: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const ratio = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="truncate">{label}</span>
        <span className="ml-2 tabular-nums text-muted-foreground">
          {count} ({ratio}%)
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AggregationView({ q, agg }: { q: PollQuestion; agg: QuestionAggregation }) {
  if (agg.type === "single" || agg.type === "multiple") {
    const max = Math.max(1, ...agg.tally.map((t) => t.count));
    const total = agg.tally.reduce((s, t) => s + t.count, 0);
    return (
      <div className="space-y-2">
        {agg.tally.map((t) => (
          <QuestionResultBar
            key={t.optionId}
            label={t.optionText}
            count={t.count}
            max={max}
            total={total}
          />
        ))}
        <p className="text-[10px] text-muted-foreground">총 {total}명 응답</p>
      </div>
    );
  }

  if (agg.type === "rating") {
    const total = Object.values(agg.distribution).reduce((s, c) => s + c, 0);
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium">
          평균 <span className="text-indigo-600 dark:text-indigo-400">{agg.average.toFixed(1)}</span>점
          <span className="ml-1.5 text-muted-foreground">/ 5 · {total}명 응답</span>
        </p>
        {([1, 2, 3, 4, 5] as const).map((n) => {
          const count = agg.distribution[n] ?? 0;
          return (
            <div key={n} className="flex items-center gap-2 text-[10px]">
              <span className="w-5 text-right tabular-nums text-muted-foreground">{n}점</span>
              <div className="h-1.5 flex-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${total > 0 ? Math.round((count / total) * 100) : 0}%` }}
                />
              </div>
              <span className="w-4 tabular-nums text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (agg.type === "text") {
    if (agg.answers.length === 0) {
      return <p className="text-[11px] text-muted-foreground">아직 텍스트 응답 없음</p>;
    }
    return (
      <ul className="space-y-1">
        {agg.answers.slice(0, 10).map((ans, i) => (
          <li
            key={i}
            className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-[11px]"
          >
            {ans}
          </li>
        ))}
        {agg.answers.length > 10 && (
          <li className="text-[10px] text-muted-foreground">
            …외 {agg.answers.length - 10}개
          </li>
        )}
      </ul>
    );
  }

  return null;
}

function LiveResultsView({ poll, responses, loading }: LiveResultsViewProps) {
  const aggs = aggregateResults(poll, responses);

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      <p className="text-[11px] font-semibold text-muted-foreground">
        실시간 응답 결과 · {responses.length}명{loading && " (불러오는 중…)"}
      </p>
      {poll.questions.map((q) => {
        const agg = aggs[q.id];
        if (!agg) return null;
        return (
          <div key={q.id} className="space-y-2">
            <p className="text-xs font-medium">{q.text}</p>
            <AggregationView q={q} agg={agg} />
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 컴포넌트 ──

interface Props {
  pollId: string;
}

export default function LivePollRespond({ pollId }: Props) {
  const { user } = useAuthStore();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loadingPoll, setLoadingPoll] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // showResults 가 true 이고 제출 완료 시 실시간 구독
  const [listenPollId, setListenPollId] = useState<string | undefined>(undefined);
  const { responses, loading: resultsLoading } = useLivePollResults(listenPollId);

  useEffect(() => {
    setLoadingPoll(true);
    pollsApi
      .get(pollId)
      .then(setPoll)
      .catch(() => toast.error("설문을 불러오지 못했습니다."))
      .finally(() => setLoadingPoll(false));
  }, [pollId]);

  const setAnswer = useCallback(
    (questionId: string, value: string | string[] | number) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    },
    [],
  );

  const toggleMultiple = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const cur = (prev[questionId] as string[] | undefined) ?? [];
      const next = cur.includes(optionId)
        ? cur.filter((v) => v !== optionId)
        : [...cur, optionId];
      return { ...prev, [questionId]: next };
    });
  }, []);

  async function handleSubmit() {
    if (!poll) return;

    // 필수 문항 검증
    for (const q of poll.questions) {
      if (!q.required) continue;
      const ans = answers[q.id];
      if (
        ans === undefined ||
        ans === "" ||
        (Array.isArray(ans) && ans.length === 0)
      ) {
        toast.error(`"${q.text}" 항목은 필수입니다.`);
        return;
      }
    }

    if (!poll.allowAnonymous && !user) {
      toast.error("이 설문은 로그인이 필요합니다.");
      return;
    }

    setSubmitting(true);
    try {
      const responseData: Record<string, unknown> = {
        pollId,
        userId: user?.id,
        userName: user?.name ?? "게스트",
        answers,
        createdAt: new Date().toISOString(),
      };
      await pollResponsesApi.create(responseData);
      setSubmitted(true);
      if (poll.showResults) setListenPollId(pollId);
      toast.success("응답이 제출되었습니다.");
    } catch {
      toast.error("제출에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── 로딩 상태 ──
  if (loadingPoll) {
    return (
      <div className="rounded-2xl border bg-card px-4 py-3 text-xs text-muted-foreground">
        설문 불러오는 중…
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="rounded-2xl border bg-card px-4 py-3 text-xs text-muted-foreground">
        설문을 불러올 수 없습니다.
      </div>
    );
  }

  // ── 로그인 필요 안내 ──
  if (!poll.allowAnonymous && !user) {
    return (
      <section className="rounded-2xl border bg-card p-4">
        <p className="text-sm font-semibold">{poll.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          이 설문은 로그인한 회원만 응답할 수 있습니다.
        </p>
      </section>
    );
  }

  // ── 제출 완료 ──
  if (submitted && poll) {
    return (
      <section className="rounded-2xl border bg-card p-4">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          응답 완료! 감사합니다.
        </p>
        {poll.showResults && (
          <LiveResultsView poll={poll} responses={responses} loading={resultsLoading} />
        )}
      </section>
    );
  }

  // ── 응답 폼 ──
  return (
    <section className="rounded-2xl border bg-card p-4 space-y-5">
      <div>
        <h2 className="text-sm font-bold">{poll.title}</h2>
        {poll.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{poll.description}</p>
        )}
      </div>

      <div className="space-y-5">
        {poll.questions.map((q) => (
          <QuestionInput
            key={q.id}
            question={q}
            answer={answers[q.id]}
            onSingle={(val) => setAnswer(q.id, val)}
            onMultiple={(optId) => toggleMultiple(q.id, optId)}
            onText={(val) => setAnswer(q.id, val)}
            onRating={(val) => setAnswer(q.id, val)}
          />
        ))}
      </div>

      <Button
        size="sm"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="w-full"
      >
        {submitting ? "제출 중…" : "응답 제출"}
      </Button>
    </section>
  );
}
