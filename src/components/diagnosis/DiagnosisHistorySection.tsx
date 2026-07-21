"use client";

/**
 * 진단평가 이력 + 약점 영역 그래프 (로그인 사용자 전용).
 *
 * - diagnosticResultsApi.listByUser 로 본인 회차 이력 로드(최신순).
 * - 최근 결과 영역별 정답률을 레이더 차트로 시각화(부족 영역 부각).
 * - 회차가 2건 이상이면 영역별 정답률 추이를 라인 차트로 표시.
 * - 회차별 날짜·두 준비도·약점 개념 칩 리스트.
 * - 이력 0건이면 "진단 시작" 빈상태 안내.
 *
 * ⚠️ 채점·계산 로직은 건드리지 않는다 — 저장된 DiagnosticResult 를 표시·시각화만 한다.
 */

import { useEffect, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { History, Radar as RadarIcon, TrendingUp, Sparkles, AlertTriangle } from "lucide-react";
import DiagnosisLearningEffect from "@/components/diagnosis/DiagnosisLearningEffect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { diagnosticResultsApi } from "@/lib/bkend";
import {
  DIAGNOSTIC_AREA_LABELS,
  DIAGNOSTIC_AREA_ORDER,
  areaScorePercent,
  type DiagnosticArea,
  type DiagnosticResult,
} from "@/types";

interface DiagnosisHistorySectionProps {
  /** 로그인 사용자 id (null 이면 섹션을 렌더하지 않음 — 호출부에서도 가드) */
  userId: string;
}

/** ISO/타임스탬프 → "5/14" */
function shortDate(value?: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** ISO/타임스탬프 → "2026.05.14" */
function fullDate(value?: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** 영역 색상 (recharts stroke/fill — 영역 배지 색과 결을 맞춤) */
const AREA_CHART_COLOR: Record<DiagnosticArea, string> = {
  statistics: "#6366f1", // indigo-500
  method: "#0ea5e9", // sky-500
  concept: "#8b5cf6", // violet-500
};

export default function DiagnosisHistorySection({ userId }: DiagnosisHistorySectionProps) {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await diagnosticResultsApi.listByUser(userId);
        if (!cancelled) setResults(res.data ?? []);
      } catch (err) {
        console.error("[diagnosis] load history failed", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="mt-12 space-y-4">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-12 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>진단 이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  // 빈 상태 — 진단 이력 0건
  if (results.length === 0) {
    return (
      <div className="mt-12">
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight">
          <History className="h-4 w-4 text-primary" aria-hidden />
          나의 진단 이력
        </h3>
        <Card className="rounded-2xl border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-sm font-medium">아직 진단 이력이 없습니다.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              위에서 전체 진단 또는 개인화 진단을 한 번 마치면, 회차별 준비도와 약점 영역 그래프가
              여기에 누적되어 추이를 확인할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 최신 결과 — 영역별 정답률(레이더 데이터)
  const latest = results[0];
  const radarData = DIAGNOSTIC_AREA_ORDER.map((area) => ({
    area: DIAGNOSTIC_AREA_LABELS[area],
    정답률: areaScorePercent(latest.areaScores[area]),
    hasData: (latest.areaScores[area]?.total ?? 0) > 0,
  })).filter((d) => d.hasData);

  // 최근 결과에서 가장 부족한 영역(정답률 최소) — 부각 표시용
  const weakestArea = radarData.reduce<{ area: string; pct: number } | null>((min, d) => {
    if (!min || d.정답률 < min.pct) return { area: d.area, pct: d.정답률 };
    return min;
  }, null);

  // 추이 데이터 — 오래된 순으로 정렬해 영역별 정답률 라인. (회차 2건 이상일 때만)
  const trendData = [...results]
    .reverse()
    .map((r, i) => {
      const row: Record<string, number | string> = {
        label: shortDate(r.createdAt) === "-" ? `${i + 1}회차` : shortDate(r.createdAt),
      };
      for (const area of DIAGNOSTIC_AREA_ORDER) {
        if ((r.areaScores[area]?.total ?? 0) > 0) {
          row[DIAGNOSTIC_AREA_LABELS[area]] = areaScorePercent(r.areaScores[area]);
        }
      }
      return row;
    });

  return (
    <div className="mt-12">
      <h3 className="mb-1 flex items-center gap-2 text-base font-semibold tracking-tight">
        <History className="h-4 w-4 text-primary" aria-hidden />
        나의 진단 이력
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        본인 진단 결과만 표시됩니다. 회차별 준비도·영역 점수와 약점 영역 그래프로 학습 추이를
        확인하세요.
      </p>

      {/* 약점 영역 그래프 (최신 결과 레이더 + 추이 라인) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 영역별 정답률 레이더 — 최신 결과 */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <RadarIcon className="h-4 w-4 text-primary" aria-hidden />
              영역별 정답률 (최근 진단)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length >= 3 ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid className="stroke-muted" />
                    <PolarAngleAxis
                      dataKey="area"
                      tick={{ fontSize: 12, fill: "currentColor" }}
                      className="text-muted-foreground"
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-muted-foreground"
                    />
                    <Radar
                      name="정답률"
                      dataKey="정답률"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.35}
                    />
                    <Tooltip formatter={(v) => [`${v}%`, "정답률"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              // 영역 3개 미만이면 레이더 대신 막대로 표시(단일·2영역 진단 회차)
              <div className="space-y-3 py-2">
                {radarData.map((d) => (
                  <div key={d.area}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{d.area}</span>
                      <span className="tabular-nums font-semibold text-foreground">
                        {d.정답률}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${d.정답률}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {weakestArea && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                가장 보완이 필요한 영역:{" "}
                <strong className="text-foreground">{weakestArea.area}</strong> ({weakestArea.pct}%)
              </p>
            )}
          </CardContent>
        </Card>

        {/* 영역별 정답률 추이 — 회차 2건 이상일 때만 */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
              영역별 정답률 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length >= 2 ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      className="text-muted-foreground"
                    />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {DIAGNOSTIC_AREA_ORDER.map((area) => (
                      <Line
                        key={area}
                        type="monotone"
                        dataKey={DIAGNOSTIC_AREA_LABELS[area]}
                        stroke={AREA_CHART_COLOR[area]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-60 flex-col items-center justify-center gap-2 text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground/40" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  진단을 한 번 더 마치면 추이 그래프가 표시됩니다.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  현재 누적 회차: {results.length}회
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 회차별 이력 리스트 */}
      <Card className="mt-4 rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">회차별 기록 ({results.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {results.map((r, i) => (
            <div
              key={r.id}
              className="rounded-xl border border-border bg-card/60 p-3.5 transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Badge variant="secondary" className="tabular-nums text-[10px]">
                    {results.length - i}회차
                  </Badge>
                  <span className="text-muted-foreground">{fullDate(r.createdAt)}</span>
                </span>
                <span className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary tabular-nums">
                    논문 작성 {r.paperReadiness}
                  </span>
                  <span className="rounded-md bg-cat-1/10 px-2 py-0.5 font-medium text-cat-1 tabular-nums">
                    연구 분석 {r.analysisReadiness}
                  </span>
                </span>
              </div>
              {/* 영역 점수 */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DIAGNOSTIC_AREA_ORDER.map((area) => {
                  const s = r.areaScores[area];
                  if (!s || s.total === 0) return null;
                  return (
                    <Badge key={area} variant="outline" className="gap-1 text-[10px]">
                      {DIAGNOSTIC_AREA_LABELS[area]}
                      <span className="tabular-nums font-semibold">
                        {areaScorePercent(s)}%
                      </span>
                    </Badge>
                  );
                })}
              </div>
              {/* 약점 개념 칩 */}
              {(r.weakConceptNames?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">약점 개념:</span>
                  {(r.weakConceptNames ?? []).slice(0, 8).map((name, ni) => (
                    <Badge
                      key={`${r.id}-${ni}`}
                      variant="outline"
                      className="border-cat-5/20 bg-cat-5/5 text-[10px] text-cat-5"
                    >
                      {name}
                    </Badge>
                  ))}
                  {(r.weakConceptNames?.length ?? 0) > 8 && (
                    <span className="text-[11px] text-muted-foreground">
                      +{(r.weakConceptNames?.length ?? 0) - 8}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 복습 ↔ 재진단 학습 효과 (R4 심화 / G2) — 개념별 정답률 % 추세 + 복습 교차 */}
      <DiagnosisLearningEffect userId={userId} />
    </div>
  );
}
