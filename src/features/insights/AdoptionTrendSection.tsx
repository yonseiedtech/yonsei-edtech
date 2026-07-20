"use client";

/**
 * 기능 채택 추세 (v6-H1) — 최근 N주 스냅샷 표 + 미니 스파크라인.
 *
 * adoption_snapshots(주 1회 cron 적재)만 읽는 /api/console/adoption/history 를 소비한다.
 * 즉석 집계 없음 — 스냅샷 컬렉션 기반 저비용 추세. 차트 라이브러리 없이 순수 SVG.
 */

import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import { auth } from "@/lib/firebase";
import type { AdoptionSnapshot } from "@/features/insights/adoption-metrics";

/** 추세로 그릴 핵심 시리즈 — 스냅샷에서 값 추출 */
const SERIES: { key: string; label: string; pick: (s: AdoptionSnapshot) => number }[] = [
  { key: "active7d", label: "7일 활성", pick: (s) => s.members.active7d },
  { key: "diagnostics", label: "진단 완료(30일)", pick: (s) => s.diagnostics.completed30d },
  { key: "flashcards", label: "암기카드 활성", pick: (s) => s.flashcards.active },
  { key: "weeklyGoals", label: "이번 주 목표", pick: (s) => s.weeklyGoals.setThisWeek },
  { key: "mentoring", label: "멘토링 질문", pick: (s) => s.mentoring.questions },
  { key: "mentoringUnmatched", label: "멘토링 미참여 신입", pick: (s) => s.mentoring.unmatchedNewcomers ?? -1 },
  { key: "reviewQueue", label: "검수 처리", pick: (s) => s.reviewQueue.processed },
];

const W = 120;
const H = 28;

/** 값 배열을 순수 SVG 폴리라인 스파크라인으로. 음수(-1 집계실패)는 0으로 눌러 표시. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const clean = values.map((v) => (v < 0 ? 0 : v));
  const n = clean.length;
  const max = Math.max(1, ...clean);
  const xAt = (i: number) => (n <= 1 ? W / 2 : (W * i) / (n - 1));
  const yAt = (v: number) => H - 3 - (v / max) * (H - 6);
  const points = clean.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`${label} 최근 ${n}주 추세`}
      preserveAspectRatio="none"
    >
      {n > 1 && (
        <polyline
          points={points}
          fill="none"
          className="stroke-primary"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {clean.map((v, i) => (
        <circle
          key={i}
          cx={xAt(i)}
          cy={yAt(v)}
          r={i === n - 1 ? 2 : 1.3}
          className={i === n - 1 ? "fill-primary" : "fill-primary/50"}
        />
      ))}
    </svg>
  );
}

/** 월요일 weekKey(YYYY-MM-DD) → "M/D" 짧은 표기 */
function shortWeek(weekKey: string): string {
  const [, m, d] = weekKey.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export default function AdoptionTrendSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["console-adoption-history"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인이 필요합니다.");
      const res = await fetch("/api/console/adoption/history?weeks=8", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("추세 조회 실패");
      return (await res.json()) as { rows: AdoptionSnapshot[] };
    },
  });

  if (isLoading) return <div className="mt-4 h-40 animate-pulse rounded-2xl border bg-muted/40" />;
  const rows = data?.rows ?? [];

  return (
    <section className="mt-4 rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <TrendingUp size={15} className="text-primary" />
        기능 채택 추세
        <span className="text-[11px] font-normal text-muted-foreground">
          주 1회 스냅샷 · 최근 {rows.length}주
        </span>
      </h2>

      {rows.length === 0 ? (
        <EmptyState
          compact
          icon={TrendingUp}
          title="아직 적재된 스냅샷이 없습니다."
          description="매주 월요일 자동 적재되며, 운영진은 회원 보고서에서 수동 캡처할 수도 있습니다."
          className="mt-3"
        />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="px-2 py-1.5 text-left font-semibold">지표</th>
                <th className="px-2 py-1.5 text-left font-semibold">추세</th>
                {rows.map((r) => (
                  <th key={r.weekKey} className="px-2 py-1.5 text-right font-semibold tabular-nums">
                    {shortWeek(r.weekKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SERIES.map((s) => {
                const vals = rows.map((r) => s.pick(r));
                return (
                  <tr key={s.key} className="border-t">
                    <td className="whitespace-nowrap px-2 py-1.5 font-medium">{s.label}</td>
                    <td className="w-32 px-2 py-1.5">
                      <Sparkline values={vals} label={s.label} />
                    </td>
                    {vals.map((v, i) => (
                      <td
                        key={i}
                        className={`px-2 py-1.5 text-right tabular-nums ${
                          i === vals.length - 1 ? "font-bold text-primary" : ""
                        }`}
                      >
                        {v < 0 ? "—" : v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
