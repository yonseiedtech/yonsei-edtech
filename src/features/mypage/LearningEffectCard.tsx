"use client";

// ── 학습효과 증명 루프 카드 (R4 / G2) ──
//
// 마이페이지 진단 영역에서 "복습이 재진단 성적으로 이어졌는가"를 개인 인사이트로 보여준다.
// 진단 다회차(diagnosticResultsApi) × 암기카드(flashcardsApi)를 교차 분석(computeLearningEffect).
//
// ⚠️ 인과 주장 금지 — "복습과 함께 개선됐어요" 같은 상관/경향 표현만 사용한다.
//   표본이 작으면 숫자만 담백하게 노출한다.

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { diagnosticResultsApi, flashcardsApi } from "@/lib/bkend";
import type { DiagnosticResult } from "@/types/diagnostic";
import type { Flashcard } from "@/types/flashcard";
import {
  computeLearningEffect,
  improvementRate,
  type LearningEffectResult,
} from "@/lib/learning-effect";
import { Sparkles, TrendingUp, ArrowRight, RotateCcw, Layers } from "lucide-react";

export default function LearningEffectCard({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["mypage-learning-effect", userId],
    queryFn: async (): Promise<LearningEffectResult> => {
      const [resultsRes, cardsRes] = await Promise.all([
        diagnosticResultsApi.listByUser(userId),
        flashcardsApi.listByUser(userId),
      ]);
      const results: DiagnosticResult[] = Array.isArray(resultsRes.data) ? resultsRes.data : [];
      const cards: Flashcard[] = Array.isArray(cardsRes.data) ? cardsRes.data : [];
      return computeLearningEffect(results, cards);
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  // 로딩 스켈레톤 — 카드 형태 유지(레이아웃 시프트 방지).
  if (isLoading) {
    return (
      <div
        className="h-24 animate-pulse rounded-2xl border-2 border-violet-200/60 bg-violet-50/50 dark:border-violet-800/40 dark:bg-violet-950/20"
        aria-busy="true"
        aria-label="학습효과 분석 불러오는 중"
      />
    );
  }

  if (!data) return null;

  // 데이터 부족 — 진단 2회 미만 또는 약점 개념 0. 진단/암기카드로 유도.
  if (data.status === "insufficient") {
    return (
      <div className="rounded-2xl border-2 border-violet-200/60 bg-gradient-to-br from-violet-50 to-violet-100/60 p-5 dark:border-violet-800/40 dark:from-violet-950/20 dark:to-violet-900/10">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-200/40 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            <TrendingUp size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold">복습 → 재진단 학습효과</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {data.reason === "no_weak_concepts"
                ? "약점 개념 데이터가 아직 없어요. 진단을 다시 보면 약점 개념의 개선 흐름을 추적해 드려요."
                : "진단을 2회 이상 보면, 그 사이 복습한 약점 개념이 다음 진단에서 개선됐는지 보여드려요."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/diagnosis"
                className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
              >
                진단하러 가기
                <ArrowRight size={12} />
              </Link>
              <Link
                href="/flashcards"
                className="inline-flex items-center gap-1 rounded-full border border-violet-300 px-3 py-1.5 text-[12px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/40"
              >
                <Layers size={12} />
                암기카드 복습
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { concepts, aggregate } = data;
  const reviewedRate = improvementRate(aggregate.reviewedImproved, aggregate.reviewedTotal);
  const notReviewedRate = improvementRate(aggregate.notReviewedImproved, aggregate.notReviewedTotal);
  const hasReviewedSample = aggregate.reviewedTotal > 0;

  return (
    <div className="rounded-2xl border-2 border-violet-200/60 bg-gradient-to-br from-violet-50 to-violet-100/60 p-5 dark:border-violet-800/40 dark:from-violet-950/20 dark:to-violet-900/10">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-200/40 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
          <TrendingUp size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-base font-bold">
            복습 → 재진단 학습효과
            <Sparkles size={14} className="text-amber-500" />
          </h3>

          {/* 상단 한 줄 인사이트 — 상관/경향 표현(인과 주장 금지). */}
          <p className="mt-1 text-sm text-violet-900 dark:text-violet-200">
            {hasReviewedSample ? (
              <>
                복습한 약점 개념 <b className="tabular-nums">{aggregate.reviewedTotal}</b>개 중{" "}
                <b className="tabular-nums">{aggregate.reviewedImproved}</b>개가 다음 진단에서 개선됐어요
                {reviewedRate !== null && (
                  <span className="text-violet-700/80 dark:text-violet-300/80"> ({reviewedRate}%)</span>
                )}
                {aggregate.notReviewedTotal > 0 && (
                  <span className="text-muted-foreground">
                    {" · "}복습 없던 개념은 {aggregate.notReviewedTotal}개 중 {aggregate.notReviewedImproved}개
                    {notReviewedRate !== null && ` (${notReviewedRate}%)`}
                  </span>
                )}
              </>
            ) : (
              <>
                약점 개념 <b className="tabular-nums">{aggregate.notReviewedTotal}</b>개 중{" "}
                <b className="tabular-nums">{aggregate.notReviewedImproved}</b>개가 다음 진단에서 개선됐어요.
                복습 기록이 남으면 복습과 개선의 관계도 함께 보여드려요.
              </>
            )}
          </p>
        </div>
      </div>

      {/* 개념별 리스트 — 개선된 개념 먼저(계산에서 정렬됨). */}
      <ul className="mt-4 space-y-1.5">
        {concepts.map((c) => (
          <li
            key={c.conceptId}
            className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/30"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-violet-900 dark:text-violet-200">
              {c.conceptName}
            </span>
            {c.reviewed ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-violet-600/80 dark:text-violet-300/70">
                <RotateCcw size={11} />
                복습 {c.reviewCount}회
              </span>
            ) : (
              <span className="shrink-0 text-[11px] text-muted-foreground">복습 기록 없음</span>
            )}
            {c.improved ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <TrendingUp size={11} />
                개선
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                유지
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-muted-foreground">
        직전 진단에서 약점이던 개념이 다음 진단에 다시 약점으로 나오지 않으면 &quot;개선&quot;으로 봅니다. 인과가 아니라 함께 나타난 경향입니다.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/flashcards"
          className="inline-flex items-center gap-1 rounded-full border border-violet-300 px-3 py-1.5 text-[12px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/40"
        >
          <Layers size={12} />
          약점 개념 복습하기
        </Link>
        <Link
          href="/diagnosis"
          className="inline-flex items-center gap-1 rounded-full border border-violet-300 px-3 py-1.5 text-[12px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/40"
        >
          <RotateCcw size={12} />
          재진단하기
        </Link>
      </div>
    </div>
  );
}
