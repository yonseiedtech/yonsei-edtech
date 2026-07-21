"use client";

/**
 * 진단 피어 비교 (M4) — 익명 동료 분포 대비 내 위치.
 *
 * 내 영역별 정답률·준비도를 전체 응시자 익명 집계(평균·중앙값·백분위)와 비교해
 * "나는 동료 대비 어디쯤"인지 보여 커뮤니티 동기를 만든다.
 *
 * ⚠️ 개인정보 보호: 이 컴포넌트는 서버가 내려준 익명 집계만 표시한다(개별 회원 식별 없음).
 *    표본이 부족하면(서버에서 해당 분포 생략) "표본 부족" 안내로 graceful 처리한다.
 *
 * 진단 채점·기존 리포트 기능과 독립 — DiagnosisReport 에 선택적으로 끼워 넣는다(회귀 없음).
 */

import { Users, Minus, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DIAGNOSTIC_AREA_COLORS,
  DIAGNOSTIC_AREA_LABELS,
  DIAGNOSTIC_AREA_ORDER,
  areaScorePercent,
  percentileRank,
  type AreaScore,
  type DiagnosticArea,
} from "@/types";
import { cn } from "@/lib/utils";

/** 서버 응답 형태 — 익명 집계 + 백분위 계산용 무라벨 분포. */
export interface PeerStatsPayload {
  totalMembers: number;
  areas: Partial<
    Record<DiagnosticArea, { sample: number; avg: number; median: number }>
  >;
  paperReadiness?: { sample: number; avg: number; median: number };
  analysisReadiness?: { sample: number; avg: number; median: number };
  areaValuesAsc?: Partial<Record<DiagnosticArea, number[]>>;
  paperValuesAsc?: number[];
  analysisValuesAsc?: number[];
}

interface PeerComparisonProps {
  /** 내 영역별 점수(이번 회차) */
  areaScores: Partial<Record<DiagnosticArea, AreaScore>>;
  paperReadiness: number;
  analysisReadiness: number;
  /** 서버 익명 집계. null 이면 미로드/실패(섹션 숨김 판단은 부모). */
  peer: PeerStatsPayload | null;
  /** 로딩 중 */
  loading?: boolean;
}

/** 내 값과 동료 평균 차이 → 색/아이콘/문구 */
function deltaTone(mine: number, peerAvg: number): {
  color: string;
  Icon: typeof ArrowUp;
  label: string;
} {
  const d = mine - peerAvg;
  if (d >= 5)
    return { color: "text-success", Icon: ArrowUp, label: `평균 +${d}` };
  if (d <= -5)
    return { color: "text-destructive", Icon: ArrowDown, label: `평균 ${d}` };
  return { color: "text-muted-foreground", Icon: Minus, label: "평균과 비슷" };
}

/** 백분위 → 격려 문구(상위 N%) */
function percentilePhrase(pct: number): string {
  if (pct >= 90) return `상위 ${100 - pct}% — 동료 대비 매우 우수`;
  if (pct >= 70) return `상위 ${100 - pct}% — 동료 대비 우수`;
  if (pct >= 50) return "동료 절반보다 앞섭니다";
  if (pct >= 30) return "동료 평균에 근접";
  return "보완하면 빠르게 따라잡을 수 있어요";
}

/** 한 줄 비교 막대 — 내 값(마커) + 동료 평균(점선) */
function ComparisonBar({ mine, peerAvg }: { mine: number; peerAvg: number }) {
  const tone =
    mine >= 80 ? "bg-success" : mine >= 60 ? "bg-cat-1" : mine >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <div className="relative h-2.5 w-full overflow-visible rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all duration-700", tone)}
        style={{ width: `${mine}%` }}
      />
      {/* 동료 평균 마커 */}
      <div
        className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-foreground/60"
        style={{ left: `calc(${peerAvg}% - 1px)` }}
        title={`동료 평균 ${peerAvg}%`}
        aria-hidden
      />
    </div>
  );
}

export default function PeerComparison({
  areaScores,
  paperReadiness,
  analysisReadiness,
  peer,
  loading = false,
}: PeerComparisonProps) {
  if (loading) {
    return (
      <Card className="mt-6 rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            동료 대비 내 위치
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">동료 분포를 불러오는 중…</p>
        </CardContent>
      </Card>
    );
  }

  if (!peer) return null;

  // 표시 가능한 영역(서버가 표본 충분으로 내려준 영역 + 내가 응시한 영역) 추림
  const areaRows = DIAGNOSTIC_AREA_ORDER.map((area) => {
    const myScore = areaScores[area];
    const stat = peer.areas[area];
    if (!myScore || myScore.total === 0 || !stat) return null;
    const mine = areaScorePercent(myScore);
    const valuesAsc = peer.areaValuesAsc?.[area] ?? [];
    const pct = percentileRank(mine, valuesAsc);
    return { area, mine, stat, pct };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  const readinessRows = [
    {
      key: "paper" as const,
      label: "논문 작성 준비도",
      mine: paperReadiness,
      stat: peer.paperReadiness,
      valuesAsc: peer.paperValuesAsc ?? [],
    },
    {
      key: "analysis" as const,
      label: "연구 분석 준비도",
      mine: analysisReadiness,
      stat: peer.analysisReadiness,
      valuesAsc: peer.analysisValuesAsc ?? [],
    },
  ].filter((r) => r.stat);

  const hasAny = areaRows.length > 0 || readinessRows.length > 0;

  return (
    <Card className="mt-6 rounded-2xl border-cat-1/20 bg-cat-1/5 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-cat-1" aria-hidden />
          동료 대비 내 위치
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-2">
        <p className="text-xs text-muted-foreground">
          전체 응시 회원 <strong>{peer.totalMembers}명</strong>의 익명 분포와 비교한 내 위치입니다.
          개별 회원은 식별되지 않으며 평균·분포만 표시됩니다.
        </p>

        {!hasAny ? (
          <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
            아직 비교할 동료 표본이 충분하지 않습니다. 응시 회원이 늘어나면 분포가 표시됩니다.
          </div>
        ) : (
          <>
            {/* 준비도 비교 */}
            {readinessRows.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-foreground/80">준비도</p>
                {readinessRows.map((r) => {
                  const stat = r.stat!;
                  const tone = deltaTone(r.mine, stat.avg);
                  const pct = percentileRank(r.mine, r.valuesAsc);
                  return (
                    <div key={r.key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{r.label}</span>
                        <span className="flex items-center gap-1.5 tabular-nums">
                          <span className="font-semibold text-foreground">{r.mine}</span>
                          <span className={cn("flex items-center gap-0.5 text-xs", tone.color)}>
                            <tone.Icon className="h-3 w-3" aria-hidden />
                            {tone.label}
                          </span>
                        </span>
                      </div>
                      <ComparisonBar mine={r.mine} peerAvg={stat.avg} />
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>동료 평균 {stat.avg} · 중앙값 {stat.median} (표본 {stat.sample}명)</span>
                        {pct !== null && (
                          <span className="text-cat-1">{percentilePhrase(pct)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 영역별 정답률 비교 */}
            {areaRows.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-foreground/80">영역별 정답률</p>
                {areaRows.map((r) => {
                  const tone = deltaTone(r.mine, r.stat.avg);
                  return (
                    <div key={r.area}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", DIAGNOSTIC_AREA_COLORS[r.area])}
                        >
                          {DIAGNOSTIC_AREA_LABELS[r.area]}
                        </Badge>
                        <span className="flex items-center gap-1.5 tabular-nums">
                          <span className="font-semibold text-foreground">{r.mine}%</span>
                          <span className={cn("flex items-center gap-0.5 text-xs", tone.color)}>
                            <tone.Icon className="h-3 w-3" aria-hidden />
                            {tone.label}
                          </span>
                        </span>
                      </div>
                      <ComparisonBar mine={r.mine} peerAvg={r.stat.avg} />
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>동료 평균 {r.stat.avg}% · 중앙값 {r.stat.median}% (표본 {r.stat.sample}명)</span>
                        {r.pct !== null && (
                          <span className="text-cat-1">{percentilePhrase(r.pct)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
