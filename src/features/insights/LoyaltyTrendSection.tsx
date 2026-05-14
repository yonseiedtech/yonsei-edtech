"use client";

/**
 * 로얄티 추이 섹션 (Sprint 71) — 회원 보고서 admin 전용.
 *
 * `loyalty_snapshots` 누적 데이터로 평균 로얄티 추이 그래프 + 직전 스냅샷 대비
 * 세그먼트 이동(상승/하락)을 표시. 스냅샷은 주 1회 cron 자동 적재되며,
 * admin 은 "지금 캡처" 버튼으로 수동 적재할 수 있다.
 */

import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Camera, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useLoyaltySnapshots } from "./useLoyaltySnapshots";
import type { MemberSegment } from "./loyalty-snapshot-types";

/** 세그먼트 참여도 순위 — 이동 방향 판정용 */
const SEGMENT_RANK: Record<MemberSegment, number> = {
  dormant: 0,
  at_risk: 1,
  new: 2,
  active: 3,
  champion: 4,
};

/** "2026-05-14" → "5/14" */
function shortDate(period: string): string {
  const [, m, d] = period.split("-");
  if (!m || !d) return period;
  return `${Number(m)}/${Number(d)}`;
}

export default function LoyaltyTrendSection({ isAdmin }: { isAdmin: boolean }) {
  const { snapshots, isLoading, refetch } = useLoyaltySnapshots(isAdmin);
  const [capturing, setCapturing] = useState(false);

  const chartData = useMemo(
    () =>
      snapshots.map((s) => ({
        label: shortDate(s.period),
        평균로얄티: s.avgLoyalty,
        회원수: s.totalMembers,
      })),
    [snapshots],
  );

  const movement = useMemo(() => {
    if (snapshots.length < 2) return null;
    const prev = snapshots[snapshots.length - 2];
    const latest = snapshots[snapshots.length - 1];
    let improved = 0;
    let declined = 0;
    for (const [uid, seg] of Object.entries(latest.memberSegments)) {
      const prevSeg = prev.memberSegments[uid];
      if (!prevSeg) continue; // 직전 스냅샷에 없던 회원 — 비교 불가
      const diff = SEGMENT_RANK[seg] - SEGMENT_RANK[prevSeg];
      if (diff > 0) improved += 1;
      else if (diff < 0) declined += 1;
    }
    return {
      prev,
      latest,
      improved,
      declined,
      avgDelta: latest.avgLoyalty - prev.avgLoyalty,
    };
  }, [snapshots]);

  async function handleCapture() {
    setCapturing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("인증이 필요합니다.");
      const res = await fetch("/api/cron/loyalty-snapshot", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "스냅샷 캡처에 실패했습니다.");
      }
      const d = await res.json();
      toast.success(`스냅샷 캡처 완료 — ${d.period} · 평균 로얄티 ${d.avgLoyalty}`);
      refetch();
    } catch (e) {
      toast.error((e as Error).message || "스냅샷 캡처에 실패했습니다.");
    } finally {
      setCapturing(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp size={16} className="text-muted-foreground" />
          로얄티 추이
          <span className="text-xs font-normal text-muted-foreground">
            (주 1회 자동 스냅샷)
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={handleCapture}
          disabled={capturing}
        >
          {capturing ? (
            <Loader2 size={12} className="mr-1 animate-spin" />
          ) : (
            <Camera size={12} className="mr-1" />
          )}
          지금 캡처
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">
          스냅샷 불러오는 중…
        </div>
      ) : snapshots.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
          <p className="text-sm font-medium">아직 추이 데이터가 없습니다</p>
          <p className="mt-1 text-xs text-muted-foreground">
            로얄티 스냅샷은 매주 월요일 자동 적재됩니다. &ldquo;지금 캡처&rdquo;로 첫
            스냅샷을 바로 적재할 수 있으며, 2회 이상 쌓이면 추이와 세그먼트 이동이
            표시됩니다.
          </p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                width={32}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="평균로얄티"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {movement && (
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border bg-muted/10 px-4 py-3 text-xs">
              <span className="font-medium text-muted-foreground">
                직전 스냅샷({shortDate(movement.prev.period)}) 대비
              </span>
              <span className="flex items-center gap-1">
                평균 로얄티
                <b
                  className={
                    movement.avgDelta > 0
                      ? "text-emerald-600"
                      : movement.avgDelta < 0
                        ? "text-rose-600"
                        : "text-muted-foreground"
                  }
                >
                  {movement.avgDelta > 0 ? "+" : ""}
                  {movement.avgDelta}
                </b>
              </span>
              <span className="flex items-center gap-1">
                <ArrowUpRight size={13} className="text-emerald-600" />
                세그먼트 상승 <b className="tabular-nums">{movement.improved}</b>명
              </span>
              <span className="flex items-center gap-1">
                <ArrowDownRight size={13} className="text-rose-600" />
                세그먼트 하락 <b className="tabular-nums">{movement.declined}</b>명
              </span>
            </div>
          )}

          <p className="mt-3 text-[11px] text-muted-foreground">
            스냅샷 {snapshots.length}건 누적 · 세그먼트 이동은 직전 스냅샷과 비교
            (참여도 순위: 휴면 &lt; 주의 &lt; 신규 &lt; 활성 &lt; 챔피언). 누적될수록
            추이 분석의 정확도가 높아집니다.
          </p>
        </>
      )}
    </section>
  );
}
