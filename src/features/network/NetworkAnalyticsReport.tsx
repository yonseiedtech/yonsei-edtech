"use client";

/**
 * 전공 네트워킹 분석 리포트 (Sprint 67-AI)
 *
 * 관리자(staff/admin) 전용 — 전공 구성원 네트워킹 현황·매칭 분석.
 * 표시 항목:
 *   1. 핵심 지표 카드 (회원·연결·1촌 평균·고립)
 *   2. 관계 종류별 분포 (cohort / identity / school_level)
 *   3. 기수별 회원 분포
 *   4. 가장 많이 연결된 회원 TOP 5
 *   5. 추천 매칭 — 같은 학교급·다른 기수 페어
 */

import { useMemo } from "react";
import { Users, Network, AlertCircle, TrendingUp, GraduationCap, Sparkles } from "lucide-react";
import {
  NETWORK_RELATION_LABELS,
  type NetworkEdge,
  type NetworkGraph,
  type NetworkNode,
} from "@/types";

interface Props {
  graph: NetworkGraph;
}

interface DegreeEntry {
  node: NetworkNode;
  degree: number;
}

export default function NetworkAnalyticsReport({ graph }: Props) {
  const stats = useMemo(() => {
    const nodes = graph.nodes;
    const edges = graph.edges;

    // 각 노드의 연결 수
    const degreeMap = new Map<string, number>();
    for (const e of edges) {
      degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
      degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
    }
    const degrees = nodes.map((n) => degreeMap.get(n.id) ?? 0);
    const avgDegree = degrees.length > 0 ? degrees.reduce((s, v) => s + v, 0) / degrees.length : 0;
    const isolatedCount = degrees.filter((d) => d === 0).length;

    // 관계 종류별 분포
    const kindCounts = { cohort: 0, identity: 0, school_level: 0 };
    for (const e of edges) {
      for (const k of e.kinds) {
        kindCounts[k] = (kindCounts[k] ?? 0) + 1;
      }
    }

    // 기수별 회원 분포
    const generationMap = new Map<number, number>();
    for (const n of nodes) {
      if (n.generation != null) {
        generationMap.set(n.generation, (generationMap.get(n.generation) ?? 0) + 1);
      }
    }
    const generationDist = Array.from(generationMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([gen, count]) => ({ gen, count }));

    // 가장 많이 연결된 회원 TOP 5
    const topConnected: DegreeEntry[] = nodes
      .map((n) => ({ node: n, degree: degreeMap.get(n.id) ?? 0 }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 5);

    // 추천 매칭 — 같은 학교급이지만 직접 연결 안 된 페어 (멘토링 후보)
    const directEdgeSet = new Set<string>();
    for (const e of edges) {
      directEdgeSet.add(`${e.source}_${e.target}`);
      directEdgeSet.add(`${e.target}_${e.source}`);
    }
    type Match = { a: NetworkNode; b: NetworkNode; reason: string };
    const suggestedMatches: Match[] = [];
    const usedPairs = new Set<string>();
    for (let i = 0; i < nodes.length && suggestedMatches.length < 6; i++) {
      for (let j = i + 1; j < nodes.length && suggestedMatches.length < 6; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const pairKey = [a.id, b.id].sort().join("_");
        if (usedPairs.has(pairKey)) continue;
        if (directEdgeSet.has(`${a.id}_${b.id}`)) continue;
        // 같은 학교급 + 다른 기수 = 멘토링 후보
        if (
          a.schoolLevel &&
          b.schoolLevel &&
          a.schoolLevel === b.schoolLevel &&
          a.generation !== b.generation
        ) {
          suggestedMatches.push({
            a,
            b,
            reason: `같은 학교급 (${a.schoolLevel}) · 기수 차 ${Math.abs(a.generation - b.generation)}`,
          });
          usedPairs.add(pairKey);
        }
      }
    }

    return {
      memberCount: nodes.length,
      edgeCount: edges.length,
      avgDegree,
      isolatedCount,
      kindCounts,
      generationDist,
      topConnected,
      suggestedMatches,
    };
  }, [graph]);

  const maxKindCount = Math.max(stats.kindCounts.cohort, stats.kindCounts.identity, stats.kindCounts.school_level, 1);
  const maxGenCount = Math.max(...stats.generationDist.map((d) => d.count), 1);

  return (
    <div className="space-y-5">
      {/* 1. 핵심 지표 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="총 회원" value={stats.memberCount} />
        <StatCard icon={Network} label="총 연결" value={stats.edgeCount} />
        <StatCard icon={TrendingUp} label="평균 1촌 수" value={stats.avgDegree.toFixed(1)} />
        <StatCard
          icon={AlertCircle}
          label="고립 회원"
          value={stats.isolatedCount}
          tone={stats.isolatedCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* 2. 관계 종류별 분포 */}
      <Section title="관계 종류별 분포" icon={Network}>
        <div className="space-y-2">
          {(Object.entries(stats.kindCounts) as Array<[keyof typeof stats.kindCounts, number]>).map(
            ([kind, count]) => (
              <div key={kind} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-xs text-muted-foreground">
                  {NETWORK_RELATION_LABELS[kind]}
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(count / maxKindCount) * 100}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-xs font-semibold tabular-nums">
                  {count}
                </span>
              </div>
            ),
          )}
        </div>
      </Section>

      {/* 3. 기수별 회원 분포 */}
      <Section title="기수별 회원 분포" icon={GraduationCap}>
        {stats.generationDist.length === 0 ? (
          <p className="text-xs text-muted-foreground">기수 정보가 입력된 회원이 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {stats.generationDist.map(({ gen, count }) => (
              <div key={gen} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{gen}기</span>
                <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-emerald-500 transition-all dark:bg-emerald-400"
                    style={{ width: `${(count / maxGenCount) * 100}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums">
                  {count}명
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 4. 가장 많이 연결된 회원 TOP 5 */}
      <Section title="가장 많이 연결된 회원 TOP 5" icon={TrendingUp}>
        {stats.topConnected.length === 0 ? (
          <p className="text-xs text-muted-foreground">연결된 회원이 없습니다.</p>
        ) : (
          <ol className="space-y-1.5">
            {stats.topConnected.map((entry, i) => (
              <li
                key={entry.node.id}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-1.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="font-medium">{entry.node.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {entry.node.generation}기
                  </span>
                </span>
                <span className="font-mono text-xs font-semibold tabular-nums text-primary">
                  {entry.degree} 연결
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* 5. 추천 매칭 */}
      <Section title="추천 매칭 (멘토링 후보)" icon={Sparkles}>
        <p className="mb-2 text-xs text-muted-foreground">
          같은 학교급이지만 아직 직접 연결되지 않은 페어 — 멘토링·교류 제안 대상.
        </p>
        {stats.suggestedMatches.length === 0 ? (
          <p className="text-xs text-muted-foreground">추천 매칭 후보가 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {stats.suggestedMatches.map((m, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-amber-50/40 px-3 py-2 text-sm dark:bg-amber-950/10"
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{m.a.name}</span>
                  <span className="text-xs text-muted-foreground">({m.a.generation}기)</span>
                  <span className="text-muted-foreground">↔</span>
                  <span className="font-medium">{m.b.name}</span>
                  <span className="text-xs text-muted-foreground">({m.b.generation}기)</span>
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300">{m.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-xl border bg-card p-4 text-center">
      <div className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full ${
        tone === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-primary/10 text-primary"
      }`}>
        <Icon size={16} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon size={14} className="text-primary" />
        {title}
      </h3>
      {children}
    </div>
  );
}
