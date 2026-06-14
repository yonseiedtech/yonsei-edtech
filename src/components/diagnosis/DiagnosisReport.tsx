"use client";

import Link from "next/link";
import {
  RotateCcw,
  Trophy,
  PenLine,
  BarChart3,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  Brain,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  COGNITIVE_LEVEL_COLORS,
  COGNITIVE_LEVEL_DESCRIPTIONS,
  COGNITIVE_LEVEL_LABELS,
  COGNITIVE_LEVEL_ORDER,
  DIAGNOSTIC_AREA_COLORS,
  DIAGNOSTIC_AREA_LABELS,
  DIAGNOSTIC_AREA_ORDER,
  areaScorePercent,
  type AreaScore,
  type CognitiveLevel,
  type CognitiveScore,
  type DiagnosticArea,
} from "@/types";
import { cn } from "@/lib/utils";

/** 약점 개념 — 아카이브 링크용 (id 가 있으면 링크, 없으면 라벨만) */
export interface WeakConcept {
  id?: string;
  name: string;
}

interface DiagnosisReportProps {
  areaScores: Partial<Record<DiagnosticArea, AreaScore>>;
  /** 인지수준(Bloom)별 정답률 — 태깅된 문항만 집계. 비어 있으면 카드 숨김. */
  cognitiveScores?: Partial<Record<CognitiveLevel, CognitiveScore>>;
  paperReadiness: number;
  analysisReadiness: number;
  weakConcepts: WeakConcept[];
  onRetry: () => void;
  /** 결과 저장 상태 표시 (선택) */
  saveState?: "idle" | "saving" | "saved" | "error";
}

/** 준비도 수준 라벨·색상 */
function readinessLevel(pct: number): { label: string; color: string; ring: string } {
  if (pct >= 80) return { label: "우수", color: "text-emerald-600 dark:text-emerald-400", ring: "stroke-emerald-500" };
  if (pct >= 60) return { label: "양호", color: "text-sky-600 dark:text-sky-400", ring: "stroke-sky-500" };
  if (pct >= 40) return { label: "보통", color: "text-amber-600 dark:text-amber-400", ring: "stroke-amber-500" };
  return { label: "보완 필요", color: "text-rose-600 dark:text-rose-400", ring: "stroke-rose-500" };
}

/** 원형 게이지 (SVG) */
function ReadinessGauge({
  label,
  pct,
  icon: Icon,
  hint,
}: {
  label: string;
  pct: number;
  icon: typeof PenLine;
  hint: string;
}) {
  const level = readinessLevel(pct);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="flex flex-col items-center py-6 text-center">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </div>
        <div className="relative mt-3 h-28 w-28">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="fill-none stroke-muted"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              className={cn("fill-none transition-all duration-700", level.ring)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-bold tabular-nums", level.color)}>{pct}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>
        <Badge variant="outline" className={cn("mt-3", level.color)}>
          {level.label}
        </Badge>
        <p className="mt-2 max-w-[14rem] text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function DiagnosisReport({
  areaScores,
  cognitiveScores = {},
  paperReadiness,
  analysisReadiness,
  weakConcepts,
  onRetry,
  saveState = "idle",
}: DiagnosisReportProps) {
  // 인지수준 집계가 1개 이상 있을 때만 인지수준 카드 노출
  const hasCognitive = COGNITIVE_LEVEL_ORDER.some(
    (lv) => (cognitiveScores[lv]?.total ?? 0) > 0,
  );
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Trophy className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">진단 결과 리포트</h2>
          <p className="text-sm text-muted-foreground">
            영역별 정답률과 두 가지 준비도를 확인하세요.
          </p>
        </div>
      </div>

      {/* 두 준비도 게이지 */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadinessGauge
          label="논문 작성 준비도"
          pct={paperReadiness}
          icon={PenLine}
          hint="핵심개념·연구방법 이해도 기반 — 이론적 배경과 연구설계 서술 준비도"
        />
        <ReadinessGauge
          label="연구 분석 준비도"
          pct={analysisReadiness}
          icon={BarChart3}
          hint="통계방법·연구방법 이해도 기반 — 자료 분석 설계·해석 준비도"
        />
      </div>

      {/* 영역별 정답률 막대 */}
      <Card className="mt-6 rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">영역별 정답률</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {DIAGNOSTIC_AREA_ORDER.map((area) => {
            const score = areaScores[area];
            if (!score || score.total === 0) return null;
            const pct = areaScorePercent(score);
            return (
              <div key={area}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", DIAGNOSTIC_AREA_COLORS[area])}
                    >
                      {DIAGNOSTIC_AREA_LABELS[area]}
                    </Badge>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {score.correct} / {score.total}
                    <span className="ml-2 font-semibold text-foreground">{pct}%</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      pct >= 80
                        ? "bg-emerald-500"
                        : pct >= 60
                          ? "bg-sky-500"
                          : pct >= 40
                            ? "bg-amber-500"
                            : "bg-rose-500",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 인지수준(Bloom)별 정답률 — 태깅 문항이 있을 때만 */}
      {hasCognitive && (
        <Card className="mt-6 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" aria-hidden />
              인지수준별 정답률
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              문항이 요구하는 사고 수준(기억·이해·적용·분석)별 정답률입니다. 낮은 정답률 수준은 그
              유형의 학습이 더 필요함을 시사합니다.
            </p>
            {COGNITIVE_LEVEL_ORDER.map((level) => {
              const score = cognitiveScores[level];
              if (!score || score.total === 0) return null;
              const pct = areaScorePercent(score);
              return (
                <div key={level}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", COGNITIVE_LEVEL_COLORS[level])}
                      >
                        {COGNITIVE_LEVEL_LABELS[level]}
                      </Badge>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {COGNITIVE_LEVEL_DESCRIPTIONS[level]}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {score.correct} / {score.total}
                      <span className="ml-2 font-semibold text-foreground">{pct}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        pct >= 80
                          ? "bg-emerald-500"
                          : pct >= 60
                            ? "bg-sky-500"
                            : pct >= 40
                              ? "bg-amber-500"
                              : "bg-rose-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 약점 개념 → 아카이브 연결 */}
      {weakConcepts.length > 0 && (
        <Card className="mt-6 rounded-2xl border-amber-200 bg-amber-50/40 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden />
              보완하면 좋은 개념 ({weakConcepts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              틀린 문항과 연결된 개념입니다. 아카이브에서 정의·관련 변인·측정도구를 확인해 보세요.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {weakConcepts.map((c, i) =>
                c.id ? (
                  <Link key={c.id} href={`/archive/concept/${c.id}`}>
                    <Badge
                      variant="outline"
                      className="cursor-pointer gap-1 border-violet-200 bg-violet-50 text-violet-800 transition-shadow hover:shadow-sm dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
                    >
                      {c.name}
                      <ArrowRight className="h-3 w-3" aria-hidden />
                    </Badge>
                  </Link>
                ) : (
                  <Badge
                    key={`${c.name}-${i}`}
                    variant="outline"
                    className="border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
                  >
                    {c.name}
                  </Badge>
                ),
              )}
            </div>
            <div className="mt-4">
              <Link href="/archive">
                <Button variant="outline" size="sm">
                  아카이브 전체 둘러보기
                  <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 저장 상태 + 재진단 */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {saveState === "saved" && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            결과가 저장되었습니다. 마이페이지에서 다시 확인할 수 있습니다.
          </p>
        )}
        {saveState === "error" && (
          <p className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            결과 저장에 실패했습니다. (진단 점수는 위에 그대로 표시됩니다)
          </p>
        )}
        <Button onClick={onRetry} variant="default" size="lg">
          <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
          다시 진단하기
        </Button>
      </div>
    </div>
  );
}
