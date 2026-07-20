"use client";

/**
 * WebVitalsSection — LCP·CLS·INP 성능 관측 (H1, v10 2026-07-20)
 *
 * web_vitals 컬렉션(v9-H6 적재 시작)을 최근 2000건 이내에서 소비해
 * 라우트별 LCP/CLS/INP p75를 표 형태로 표시.
 *  - 기간 토글: 최근 7일 / 30일 (클라이언트 집계)
 *  - 임계 초과 라우트 하이라이트: LCP > 2500ms · CLS > 0.1 · INP > 200ms
 *  - 데이터 적을 시 "수집 중" 빈 상태
 *  - read 권한: staff 이상 (firestore.rules)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  orderBy,
  limit,
  query as buildQuery,
} from "firebase/firestore";
import { Gauge } from "lucide-react";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

// ── 상수 ────────────────────────────────────────────────────────────────────

const MAX_DOCS = 2000;

/** 웹바이탈 임계값 (Google Core Web Vitals 기준) */
const THRESHOLDS = {
  LCP: 2500, // ms — Good ≤ 2500
  CLS: 0.1,  // score — Good ≤ 0.1
  INP: 200,  // ms — Good ≤ 200
} as const;

type VitalMetric = "LCP" | "CLS" | "INP";
type Period = "7d" | "30d";

// ── 타입 ────────────────────────────────────────────────────────────────────

interface VitalDoc {
  metric: VitalMetric;
  value: number;
  route: string;
  timestamp: string; // ISO string
}

interface RouteStats {
  route: string;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  count: number;
}

// ── 데이터 패치 ─────────────────────────────────────────────────────────────

async function fetchWebVitals(): Promise<VitalDoc[]> {
  const q = buildQuery(
    collection(db, "web_vitals"),
    orderBy("timestamp", "desc"),
    limit(MAX_DOCS),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      metric: (data.metric as VitalMetric) ?? "LCP",
      value: (data.value as number) ?? 0,
      route: (data.route as string) ?? "unknown",
      timestamp: (data.timestamp as string) ?? "",
    };
  });
}

// ── 집계 헬퍼 ────────────────────────────────────────────────────────────────

function cutoffISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** p75 — 오름차순 정렬 후 75번째 백분위 */
function p75(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.75);
  return sorted[Math.min(idx, sorted.length - 1)] ?? null;
}

function aggregateByRoute(docs: VitalDoc[], cutoff: string): RouteStats[] {
  const filtered = docs.filter((d) => d.timestamp >= cutoff);

  const map = new Map<string, { LCP: number[]; CLS: number[]; INP: number[] }>();
  for (const d of filtered) {
    if (!map.has(d.route)) {
      map.set(d.route, { LCP: [], CLS: [], INP: [] });
    }
    const entry = map.get(d.route)!;
    entry[d.metric].push(d.value);
  }

  const stats: RouteStats[] = [];
  for (const [route, vals] of map.entries()) {
    stats.push({
      route,
      lcp: p75(vals.LCP),
      cls: p75(vals.CLS),
      inp: p75(vals.INP),
      count: vals.LCP.length + vals.CLS.length + vals.INP.length,
    });
  }

  // 샘플 수 내림차순
  return stats.sort((a, b) => b.count - a.count);
}

// ── 포맷 헬퍼 ────────────────────────────────────────────────────────────────

function fmtMs(v: number | null): string {
  if (v === null) return "—";
  return `${Math.round(v)} ms`;
}

function fmtCls(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(3);
}

function isBad(metric: VitalMetric, v: number | null): boolean {
  if (v === null) return false;
  return v > THRESHOLDS[metric];
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function WebVitalsSection() {
  const [period, setPeriod] = useState<Period>("7d");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["web-vitals-console"],
    staleTime: 5 * 60_000,
    queryFn: fetchWebVitals,
  });

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl border bg-muted/40" />;
  }

  if (isError) {
    return null; // 권한 부족 또는 오류 시 조용히 숨김
  }

  const days = period === "7d" ? 7 : 30;
  const cutoff = cutoffISO(days);
  const stats = aggregateByRoute(data ?? [], cutoff);
  const totalSamples = (data ?? []).filter((d) => d.timestamp >= cutoff).length;
  const badRoutes = stats.filter(
    (s) => isBad("LCP", s.lcp) || isBad("CLS", s.cls) || isBad("INP", s.inp),
  ).length;

  return (
    <section className="rounded-2xl border bg-card p-5">
      {/* 헤더 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Gauge size={15} className="text-primary" />
          성능 지표 (LCP · CLS · INP)
        </h2>
        <span className="text-[11px] font-normal text-muted-foreground">
          — 라우트별 p75 · 10% 샘플 적재
        </span>

        {/* 기간 토글 */}
        <div className="ml-auto flex gap-1">
          {(["7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "border text-muted-foreground hover:bg-muted/60",
              )}
            >
              {p === "7d" ? "최근 7일" : "최근 30일"}
            </button>
          ))}
        </div>
      </div>

      {/* 요약 칩 */}
      {totalSamples > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded border bg-muted/30 px-2 py-0.5 text-muted-foreground">
            샘플 {totalSamples.toLocaleString()}건
          </span>
          <span className="rounded border bg-muted/30 px-2 py-0.5 text-muted-foreground">
            라우트 {stats.length}개
          </span>
          {badRoutes > 0 && (
            <span className="rounded border border-destructive/30 bg-destructive/5 px-2 py-0.5 font-semibold text-destructive">
              임계 초과 {badRoutes}개 라우트
            </span>
          )}
        </div>
      )}

      {/* 빈 상태 */}
      {stats.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 py-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {period === "7d" ? "최근 7일" : "최근 30일"} 성능 데이터 수집 중
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            방문의 10%가 샘플링됩니다 — 데이터가 쌓이면 라우트별 p75가 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-1.5 pr-4 text-left font-medium">라우트</th>
                <th className="py-1.5 pr-3 text-right font-medium">
                  LCP p75
                  <span className="ml-1 font-normal opacity-60">(≤2500ms)</span>
                </th>
                <th className="py-1.5 pr-3 text-right font-medium">
                  CLS p75
                  <span className="ml-1 font-normal opacity-60">(≤0.1)</span>
                </th>
                <th className="py-1.5 pr-3 text-right font-medium">
                  INP p75
                  <span className="ml-1 font-normal opacity-60">(≤200ms)</span>
                </th>
                <th className="py-1.5 text-right font-medium">샘플</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => {
                const lcpBad = isBad("LCP", row.lcp);
                const clsBad = isBad("CLS", row.cls);
                const inpBad = isBad("INP", row.inp);
                const rowBad = lcpBad || clsBad || inpBad;
                return (
                  <tr
                    key={row.route}
                    className={cn(
                      "border-b last:border-0",
                      rowBad && "bg-destructive/[0.03]",
                    )}
                  >
                    <td className="py-1.5 pr-4 font-medium">{row.route}</td>
                    <td
                      className={cn(
                        "py-1.5 pr-3 text-right tabular-nums",
                        lcpBad ? "font-semibold text-destructive" : "text-foreground",
                      )}
                    >
                      {fmtMs(row.lcp)}
                    </td>
                    <td
                      className={cn(
                        "py-1.5 pr-3 text-right tabular-nums",
                        clsBad ? "font-semibold text-destructive" : "text-foreground",
                      )}
                    >
                      {fmtCls(row.cls)}
                    </td>
                    <td
                      className={cn(
                        "py-1.5 pr-3 text-right tabular-nums",
                        inpBad ? "font-semibold text-destructive" : "text-foreground",
                      )}
                    >
                      {fmtMs(row.inp)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                      {row.count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 각주 */}
      <p className="mt-3 text-[11px] text-muted-foreground">
        최근 {MAX_DOCS.toLocaleString()}건 이내 클라이언트 집계 ·
        LCP(로딩) · CLS(레이아웃 안정) · INP(응답성) — Google Core Web Vitals 기준
      </p>
    </section>
  );
}
