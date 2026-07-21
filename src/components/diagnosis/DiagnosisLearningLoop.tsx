"use client";

/**
 * 학습효과 증명루프 (진단↔복습 상관) — R4. 로그인 사용자 전용.
 *
 * 두 가지를 보여준다:
 *  (1) 약점 개념별 시계열 추세 — 여러 회차에서 약점이 개선됐는지(목록에서 빠졌는지).
 *  (2) 개인 학습효과 인사이트 — "이 개념 암기카드 N회 복습 후 약점 해소" 교차 분석.
 *
 * 데이터 부족(다회차 1건 이하 · 복습 0)이면 graceful 안내로 대체한다.
 *
 * ⚠️ 채점·문항·복습 메타 계산 불변. diagnostic_results(다회차)와 flashcards(읽기 전용)를
 *    교차 집계해 표시만 한다. flashcard 컴포넌트는 건드리지 않는다.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Target,
  Repeat,
  ArrowRight,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import DiagnosisLoopSteps from "@/components/diagnosis/DiagnosisLoopSteps";
import { diagnosticResultsApi, flashcardsApi } from "@/lib/bkend";
import type { DiagnosticResult } from "@/types";
import type { Flashcard } from "@/types/flashcard";
import {
  analyzeConceptTrends,
  analyzeReviewImpact,
  sortResultsAsc,
  type ConceptTrend,
} from "@/features/diagnosis/learning-loop";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";

interface DiagnosisLearningLoopProps {
  /** 로그인 사용자 id */
  userId: string;
}

export default function DiagnosisLearningLoop({ userId }: DiagnosisLearningLoopProps) {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        // 진단 이력은 필수, 암기카드는 실패해도 추세는 보여준다(부분 graceful).
        const [resRes, cardRes] = await Promise.allSettled([
          diagnosticResultsApi.listByUser(userId),
          flashcardsApi.listByUser(userId),
        ]);
        if (cancelled) return;
        if (resRes.status === "fulfilled") {
          setResults(resRes.value.data ?? []);
        } else {
          console.error("[diagnosis] learning-loop results failed", resRes.reason);
          setError(true);
        }
        if (cardRes.status === "fulfilled") {
          setFlashcards(cardRes.value.data ?? []);
        } else {
          console.error("[diagnosis] learning-loop flashcards failed", cardRes.reason);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const resultsAsc = useMemo(() => sortResultsAsc(results), [results]);
  const trends = useMemo(() => analyzeConceptTrends(resultsAsc), [resultsAsc]);
  const impact = useMemo(() => analyzeReviewImpact(trends, flashcards), [trends, flashcards]);

  if (loading) {
    return (
      <div className="mt-12 space-y-4">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (error && results.length === 0) {
    // 진단 이력 자체를 못 불러왔을 때만 오류 표시(이력 섹션과 중복 회피 위해 최소화).
    return null;
  }

  const multiRound = resultsAsc.length >= 2;
  const hasReviewData = impact.totalReviews > 0;
  // 약점으로 한 번이라도 잡힌 개념(추세 대상)
  const conceptTrends = trends.filter((t) => t.weakCount > 0);

  return (
    <div className="mt-12">
      <h3 className="mb-1 flex items-center gap-2 text-base font-semibold tracking-tight">
        <Activity className="h-4 w-4 text-primary" aria-hidden />
        학습효과 증명루프
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        약점 개념이 시간에 따라 개선됐는지, 암기카드 복습이 재진단 결과로 이어졌는지 교차 분석합니다.
        본인 데이터만 사용합니다.
      </p>

      {/* 진단↔학습↔증명 순환 안내 — 재진단(rediagnose)을 다음 단계로 부각 */}
      <DiagnosisLoopSteps active="rediagnose" className="mb-4" />

      {/* 데이터 부족 — 다회차 없으면 추세·상관 모두 판단 불가 */}
      {!multiRound ? (
        <Card className="rounded-2xl border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-sm font-medium">재진단 후 학습 효과를 확인할 수 있어요.</p>
            <p className="max-w-md text-xs text-muted-foreground">
              진단을 한 번 더 마치면 <strong>약점 개념이 개선됐는지</strong> 시계열로 보여주고,
              그 사이 암기카드를 복습했다면{" "}
              <strong>&ldquo;복습 → 재진단 개선&rdquo;</strong> 인사이트까지 분석해 드립니다.
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              현재 누적 회차: {resultsAsc.length}회
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* 개인 학습효과 인사이트 — 복습 ↔ 재진단 상관 */}
          <ReviewImpactCard
            improved={impact.insights.filter((i) => i.outcome === "improved")}
            reviewing={impact.insights.filter((i) => i.outcome === "reviewing")}
            hasReviewData={hasReviewData}
          />

          {/* 약점 개념별 시계열 추세 */}
          <ConceptTrendCard conceptTrends={conceptTrends} rounds={resultsAsc.length} />
        </div>
      )}
    </div>
  );
}

/** 개인 학습효과 인사이트 카드 — "복습 N회 후 약점 해소" 증명. */
function ReviewImpactCard({
  improved,
  reviewing,
  hasReviewData,
}: {
  improved: ReturnType<typeof analyzeReviewImpact>["insights"];
  reviewing: ReturnType<typeof analyzeReviewImpact>["insights"];
  hasReviewData: boolean;
}) {
  return (
    <Card className="rounded-2xl border-success/20 bg-success/5 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-success" aria-hidden />
          복습 → 재진단 학습효과
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasReviewData ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Repeat className="h-7 w-7 text-muted-foreground/40" aria-hidden />
            <p className="text-sm text-muted-foreground">
              아직 복습한 암기카드가 없어요.
            </p>
            <p className="max-w-md text-xs text-muted-foreground/80">
              진단 오답을 암기카드로 저장하고 복습한 뒤 재진단하면, 복습이 점수로 이어졌는지
              여기에서 확인할 수 있어요.
            </p>
            <Link
              href="/flashcards"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-success hover:underline"
            >
              내 암기카드로 가기
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        ) : improved.length === 0 && reviewing.length === 0 ? (
          <EmptyState
            compact
            title="복습한 암기카드와 약점 개념이 아직 연결되지 않았어요."
            description="약점 개념의 오답 카드를 복습하면 학습효과가 분석됩니다."
            className="py-2"
          />
        ) : (
          <div className="space-y-4">
            {improved.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  복습이 효과로 이어진 개념 ({improved.length})
                </p>
                <ul className="space-y-2">
                  {improved.map((it) => (
                    <li
                      key={it.conceptKey}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-success/20 bg-card/70 p-3"
                    >
                      <ConceptLabel id={it.conceptId} name={it.conceptName} tone="emerald" />
                      <span className="text-xs text-muted-foreground">
                        암기카드 <strong className="tabular-nums text-foreground">{it.reviewCount}회</strong>{" "}
                        복습 후 재진단에서{" "}
                        <strong className="text-success">약점 해소</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reviewing.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-warning">
                  <Repeat className="h-4 w-4" aria-hidden />
                  복습 중인 개념 ({reviewing.length})
                </p>
                <ul className="space-y-2">
                  {reviewing.map((it) => (
                    <li
                      key={it.conceptKey}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/70 p-3"
                    >
                      <ConceptLabel id={it.conceptId} name={it.conceptName} tone="amber" />
                      <span className="text-xs text-muted-foreground">
                        암기카드 <strong className="tabular-nums text-foreground">{it.reviewCount}회</strong>{" "}
                        복습 — 아직 약점이에요. 조금만 더 복습하고 재진단해 보세요.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** 약점 개념별 시계열 추세 카드 — 회차에 따른 약점 등장/해소를 미니 라인으로. */
function ConceptTrendCard({
  conceptTrends,
  rounds,
}: {
  conceptTrends: ConceptTrend[];
  rounds: number;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
          약점 개념 시계열 추세
        </CardTitle>
      </CardHeader>
      <CardContent>
        {conceptTrends.length === 0 ? (
          <EmptyState compact title="약점으로 잡힌 개념이 없어요. 잘하고 있습니다!" className="py-2" />
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              각 개념이 회차별로 약점이었는지({rounds}회 누적) 표시합니다. 점이 위로 내려가 0 에
              닿으면 해당 회차에서 약점이 <strong>해소</strong>된 것입니다.
            </p>
            <ul className="space-y-3">
              {conceptTrends.map((t) => (
                <ConceptTrendRow key={t.conceptKey} trend={t} />
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** 개념 1건의 약점 추세 행 — 상태 배지 + 미니 라인(약점=1 / 해소=0). */
function ConceptTrendRow({ trend }: { trend: ConceptTrend }) {
  // recharts 데이터 — 약점이면 1, 아니면 0 (위=약점, 아래=해소)
  const chartData = trend.points.map((p) => ({
    label: p.label,
    상태: p.weak ? 1 : 0,
  }));

  const statusMeta =
    trend.status === "resolved"
      ? {
          label: "개선됨",
          icon: CheckCircle2,
          cls: "border-success/20 bg-success/5 text-success",
          stroke: "#10b981", // emerald-500
        }
      : {
          label: "지속 약점",
          icon: AlertTriangle,
          cls: "border-warning/20 bg-warning/5 text-warning",
          stroke: "#f59e0b", // amber-500
        };
  const StatusIcon = statusMeta.icon;

  return (
    <li className="rounded-xl border border-border bg-card/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ConceptLabel
            id={trend.conceptId}
            name={trend.conceptName}
            tone={trend.status === "resolved" ? "emerald" : "amber"}
          />
        </div>
        <Badge variant="outline" className={cn("gap-1 text-[10px]", statusMeta.cls)}>
          <StatusIcon className="h-3 w-3" aria-hidden />
          {statusMeta.label}
        </Badge>
      </div>
      <div className="mt-2 h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: -28 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 1]}
              tickFormatter={(v) => (v === 1 ? "약점" : "해소")}
              tick={{ fontSize: 9, fill: "currentColor" }}
              width={36}
              className="text-muted-foreground"
            />
            <Tooltip
              formatter={(v) => [v === 1 ? "약점" : "해소", "상태"]}
              labelClassName="text-xs"
              contentStyle={{ fontSize: 11 }}
            />
            <Line
              type="stepAfter"
              dataKey="상태"
              stroke={statusMeta.stroke}
              strokeWidth={2}
              dot={{ r: 2.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {trend.status === "resolved"
          ? `약점 ${trend.weakCount}회 후 최근 진단에서 해소됐어요.`
          : `최근 진단까지 ${trend.weakCount}회 약점으로 잡혔어요 — 집중 복습 대상.`}
      </p>
    </li>
  );
}

/** 개념 라벨 — id 있으면 아카이브 링크, 없으면 칩만. */
function ConceptLabel({
  id,
  name,
  tone,
}: {
  id?: string;
  name: string;
  tone: "emerald" | "amber" | "violet";
}) {
  const toneCls =
    tone === "emerald"
      ? "border-success/20 bg-success/5 text-success"
      : tone === "amber"
        ? "border-warning/20 bg-warning/5 text-warning"
        : "border-cat-5/20 bg-cat-5/5 text-cat-5";

  if (id) {
    return (
      <Link href={`/archive/concept/${id}`}>
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer gap-1 text-[11px] transition-shadow hover:shadow-sm",
            toneCls,
          )}
        >
          {name}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Badge>
      </Link>
    );
  }
  return (
    <Badge variant="outline" className={cn("text-[11px]", toneCls)}>
      {name}
    </Badge>
  );
}
