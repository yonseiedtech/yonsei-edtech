"use client";

/**
 * DiagnosisLearningEffect — 복습 ↔ 재진단 학습 효과 (R4 심화 / G2).
 *
 * 같은 개념을 여러 번 진단했을 때의 "정답률 % 추세"(첫 진단 → 최근)와 암기카드 복습을
 * 교차해 "복습과 함께 나타난 향상"을 개인 증거로 보여준다.
 *   - 진단 다회차(diagnosticResultsApi) × 암기카드(flashcardsApi) × 문항 풀(개념 해석)
 *   - 순수 계산은 computeConceptImprovement(learning-effect.ts) — 중복 구현 금지.
 *
 * ⚠️ 인과 주장 금지 — "복습 후 향상됐어요"(상관/경향)까지만. "복습 덕분에" 금지.
 * 새 컬렉션·rules 변경 없이 기존 데이터만 읽어 계산한다.
 *
 * 배치: DiagnosisHistorySection 하단(진단 이력 화면). 시맨틱 토큰·다크모드 준수.
 */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ArrowRight, RotateCcw, Layers, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  diagnosticResultsApi,
  flashcardsApi,
  diagnosticQuestionsApi,
  archiveConceptsApi,
} from "@/lib/bkend";
import { SEED_DIAGNOSTIC_QUESTIONS } from "@/lib/diagnostic-seed";
import {
  computeConceptImprovement,
  type ConceptImprovementResult,
  type QuestionConceptResolver,
} from "@/lib/learning-effect";
import type { DiagnosticResult, DiagnosticQuestion } from "@/types/diagnostic";
import type { Flashcard } from "@/types/flashcard";
import type { ArchiveConcept } from "@/types";

/** 진단 다회차 × 암기카드 × 개념 해석 → 개념별 정답률 추세. */
async function loadConceptImprovement(userId: string): Promise<ConceptImprovementResult> {
  const [resultsRes, cardsRes, questionsRes, conceptsRes] = await Promise.all([
    diagnosticResultsApi.listByUser(userId),
    flashcardsApi.listByUser(userId),
    diagnosticQuestionsApi.listPublished().catch(() => null),
    archiveConceptsApi.list().catch(() => null),
  ]);

  const results: DiagnosticResult[] = Array.isArray(resultsRes.data) ? resultsRes.data : [];
  const cards: Flashcard[] = Array.isArray(cardsRes.data) ? cardsRes.data : [];
  const concepts: ArchiveConcept[] = conceptsRes?.data ?? [];

  // 개념 매핑 — id·seedKey 양방향(진단 페이지 resolveConcept 와 동일 규칙).
  const conceptById = new Map<string, ArchiveConcept>();
  const conceptBySeedKey = new Map<string, ArchiveConcept>();
  for (const c of concepts) {
    conceptById.set(c.id, c);
    if (c.seedKey) conceptBySeedKey.set(c.seedKey, c);
  }

  // 문항 id → 개념. Firestore published(conceptId) + 정적 시드(conceptSeedKey) 두 시대 모두 커버.
  const fsConceptByQid = new Map<string, string>();
  for (const q of (questionsRes?.data ?? []) as DiagnosticQuestion[]) {
    if (q.id && q.conceptId) fsConceptByQid.set(q.id, q.conceptId);
  }
  const seedKeyByQid = new Map<string, string>();
  for (const s of SEED_DIAGNOSTIC_QUESTIONS) {
    if (s.conceptSeedKey) seedKeyByQid.set(`seed:${s.seedKey}`, s.conceptSeedKey);
  }

  const resolveQuestionConcept: QuestionConceptResolver = (qid) => {
    const fsCid = fsConceptByQid.get(qid);
    if (fsCid) return { id: fsCid, name: conceptById.get(fsCid)?.name ?? "관련 개념" };
    const seedKey = seedKeyByQid.get(qid);
    if (seedKey) {
      const c = conceptBySeedKey.get(seedKey);
      if (c) return { id: c.id, name: c.name };
    }
    return undefined;
  };

  return computeConceptImprovement(results, cards, resolveQuestionConcept);
}

/** deltaPp → 배지(시맨틱 상태색 — 향상/하락/유지). 다크모드 대응. */
function DeltaBadge({ deltaPp }: { deltaPp: number }) {
  if (deltaPp > 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 tabular-nums dark:bg-emerald-950/40 dark:text-emerald-300">
        <TrendingUp size={11} aria-hidden />+{deltaPp}%p
      </span>
    );
  }
  if (deltaPp < 0) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 tabular-nums dark:bg-rose-950/40 dark:text-rose-300">
        {deltaPp}%p
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      유지
    </span>
  );
}

export default function DiagnosisLearningEffect({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["diagnosis-concept-improvement", userId],
    queryFn: () => loadConceptImprovement(userId),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="mt-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const header = (
    <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
      <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
      복습 ↔ 재진단 학습 효과
    </h3>
  );

  // 데이터 부족 — 진단 2회 미만 또는 재진단된 개념 없음. 추가 진단/복습 유도.
  if (data.status === "insufficient") {
    return (
      <div className="mt-4">
        {header}
        <Card className="mt-3 rounded-2xl border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" aria-hidden />
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              {data.reason === "no_repeated_concepts"
                ? "같은 개념을 두 번 이상 진단하면, 그 개념의 정답률이 첫 진단 대비 얼마나 올랐는지 추세로 보여드려요."
                : "진단을 2회 이상 보면, 반복 진단한 개념의 정답률 변화와 복습이 함께 나타난 향상을 보여드려요."}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/diagnosis"
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                재진단하기
                <ArrowRight size={12} aria-hidden />
              </Link>
              <Link
                href="/flashcards"
                className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Layers size={12} aria-hidden />
                암기카드 복습
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { concepts, improvedCount, improvedWithReviewCount } = data;

  return (
    <div className="mt-4">
      {header}
      <p className="mb-3 mt-1 text-xs text-muted-foreground">
        같은 개념을 다시 진단한 결과예요. 복습과 <b>함께 나타난</b> 변화이며 인과는 아닙니다.
      </p>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="space-y-4 py-5">
          {/* 요약 한 줄 인사이트 — 상관/경향 표현. */}
          <p className="text-sm text-foreground">
            다시 진단한 개념 <b className="tabular-nums">{concepts.length}</b>개 중{" "}
            <b className="tabular-nums text-emerald-700 dark:text-emerald-400">{improvedCount}</b>개의
            정답률이 향상됐어요
            {improvedWithReviewCount > 0 && (
              <span className="text-muted-foreground">
                {" · "}그중 <b className="tabular-nums">{improvedWithReviewCount}</b>개는 그 사이 복습
                기록이 있었어요
              </span>
            )}
            .
          </p>

          {/* 개념별 정답률 추세 리스트 — 향상 큰 순(계산에서 정렬됨). */}
          <ul className="space-y-1.5">
            {concepts.map((c) => (
              <li
                key={c.conceptId}
                className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-border bg-card/60 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                  {c.conceptName}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[12px] tabular-nums text-muted-foreground">
                  <span>{c.firstRate}%</span>
                  <ArrowRight size={11} aria-hidden />
                  <span className="font-semibold text-foreground">{c.recentRate}%</span>
                </span>
                <DeltaBadge deltaPp={c.deltaPp} />
                {c.reviewCount > 0 ? (
                  <span
                    className={
                      c.reviewedInWindow
                        ? "inline-flex shrink-0 items-center gap-1 text-[11px] text-primary"
                        : "inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground"
                    }
                  >
                    <RotateCcw size={11} aria-hidden />
                    복습 {c.reviewCount}회
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] text-muted-foreground">복습 기록 없음</span>
                )}
              </li>
            ))}
          </ul>

          <p className="text-[11px] text-muted-foreground">
            정답률(%)은 그 개념이 출제된 회차 중 완전 정답 회차의 비율입니다. 앞 절반(첫 진단)과 뒤
            절반(최근)을 비교해 변화량을 냅니다. 복습과 향상은 함께 나타난 경향일 뿐 인과가 아닙니다.
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/flashcards"
              className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Layers size={12} aria-hidden />
              약점 개념 복습하기
            </Link>
            <Link
              href="/diagnosis"
              className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <RotateCcw size={12} aria-hidden />
              재진단하기
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
