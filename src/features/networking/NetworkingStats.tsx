"use client";

/**
 * 모임 운영 통계 대시보드 (G18, 2026-07-09) — 콘솔 "통계" 탭.
 * 전체 이벤트 대상 집계: 유형별 개최·평균 참석, 최근 참석 추이, 반복 참석자 TOP,
 * 회비 회수율, 노쇼율(체크인 도입 이벤트만). 순수 CSS 바 — 신규 차트 라이브러리 미사용.
 */

import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Repeat, Wallet, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { networkingRsvpsApi, networkingDuesApi } from "@/lib/bkend";
import {
  NETWORKING_EVENT_TYPE_LABELS,
  type NetworkingEvent,
  type NetworkingRsvp,
  type NetworkingDue,
  type NetworkingEventType,
} from "@/types";
import { isPastEvent, formatWon } from "@/features/networking/networking-helpers";
import EmptyState from "@/components/ui/empty-state";

const EVENT_TYPES = Object.keys(NETWORKING_EVENT_TYPE_LABELS) as NetworkingEventType[];

/** attending 좌석 합계(본인 + 동반인) */
function attendingSeats(list: NetworkingRsvp[]): number {
  return list
    .filter((r) => r.status === "attending")
    .reduce((sum, r) => sum + 1 + (r.companions ?? 0), 0);
}

function StatCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

/** 가로 막대 (라벨 · 값) */
function HBar({ label, sub, ratio }: { label: string; sub: string; ratio: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 truncate text-muted-foreground">{label}</span>
      <div className="h-4 min-w-0 flex-1 overflow-hidden rounded bg-muted">
        <div
          className="h-full rounded bg-cat-1"
          style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%` }}
        />
      </div>
      <span className="w-24 shrink-0 text-right tabular-nums text-muted-foreground">{sub}</span>
    </div>
  );
}

export default function NetworkingStats({ events }: { events: NetworkingEvent[] }) {
  const { data: rsvps = [], isLoading: rl } = useQuery({
    queryKey: ["console-networking-rsvps-all"],
    queryFn: async () => (await networkingRsvpsApi.listAll()).data as NetworkingRsvp[],
    staleTime: 60_000,
  });
  const { data: dues = [], isLoading: dl } = useQuery({
    queryKey: ["console-networking-dues-all"],
    queryFn: async () => (await networkingDuesApi.listAll()).data as NetworkingDue[],
    staleTime: 60_000,
  });

  const rsvpsByEvent = useMemo(() => {
    const m = new Map<string, NetworkingRsvp[]>();
    for (const r of rsvps) {
      const arr = m.get(r.eventId);
      if (arr) arr.push(r);
      else m.set(r.eventId, [r]);
    }
    return m;
  }, [rsvps]);

  const nowIso = new Date().toISOString();

  // 1) 유형별 개최 수 · 평균 참석
  const byType = useMemo(() => {
    return EVENT_TYPES.map((type) => {
      const evs = events.filter((e) => e.type === type);
      const totalSeats = evs.reduce((s, e) => s + attendingSeats(rsvpsByEvent.get(e.id) ?? []), 0);
      return { type, count: evs.length, avg: evs.length ? totalSeats / evs.length : 0 };
    }).filter((x) => x.count > 0);
  }, [events, rsvpsByEvent]);
  const maxTypeCount = Math.max(1, ...byType.map((x) => x.count));

  // 2) 최근 참석 추이 — 확정(startAt 有) 이벤트 최근 순 미니 바
  const trend = useMemo(() => {
    return events
      .filter((e) => !!e.startAt && e.status !== "cancelled")
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(-8)
      .map((e) => ({ id: e.id, title: e.title, startAt: e.startAt, count: attendingSeats(rsvpsByEvent.get(e.id) ?? []) }));
  }, [events, rsvpsByEvent]);
  const maxTrend = Math.max(1, ...trend.map((t) => t.count));

  // 3) 반복 참석자 TOP — 회원(userId) attending 횟수 2회 이상
  const repeat = useMemo(() => {
    const counter = new Map<string, { name: string; count: number }>();
    for (const r of rsvps) {
      if (r.status !== "attending" || !r.userId) continue;
      const cur = counter.get(r.userId);
      if (cur) cur.count += 1;
      else counter.set(r.userId, { name: r.displayName, count: 1 });
    }
    return [...counter.values()]
      .filter((x) => x.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rsvps]);
  const maxRepeat = Math.max(1, ...repeat.map((x) => x.count));

  // 4) 회비 회수율 — paid / (paid + unpaid), 면제 제외
  const fee = useMemo(() => {
    const billable = dues.filter((d) => d.status !== "exempt");
    const total = billable.reduce((s, d) => s + (d.amount ?? 0), 0);
    const paid = dues.filter((d) => d.status === "paid").reduce((s, d) => s + (d.amount ?? 0), 0);
    return { total, paid, rate: total ? paid / total : 0 };
  }, [dues]);

  // 5) 노쇼율 — 종료 + 체크인 도입(attendedAt 하나 이상) 이벤트만
  const noShow = useMemo(() => {
    const targets = events.filter((e) => {
      const ended = !(e.schedulingMode === "poll" && !e.startAt) && !!e.startAt && isPastEvent(e, nowIso);
      if (!ended) return false;
      return (rsvpsByEvent.get(e.id) ?? []).some((r) => r.attendedAt);
    });
    let att = 0;
    let miss = 0;
    for (const e of targets) {
      for (const r of rsvpsByEvent.get(e.id) ?? []) {
        if (r.status !== "attending") continue;
        att += 1;
        if (!r.attendedAt) miss += 1;
      }
    }
    return { events: targets.length, att, miss, rate: att ? miss / att : 0 };
  }, [events, rsvpsByEvent, nowIso]);

  if (rl || dl) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  const hasData = rsvps.length > 0;
  if (!hasData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="집계할 참석 데이터가 아직 없습니다"
        description="모임 참석 신청이 쌓이면 통계가 표시됩니다."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 유형별 개최 수 · 평균 참석 */}
      <StatCard icon={<BarChart3 size={13} />} title="유형별 개최 수 · 평균 참석">
        {byType.length === 0 ? (
          <p className="text-xs text-muted-foreground">집계 준비 중</p>
        ) : (
          <div className="space-y-1.5">
            {byType.map((x) => (
              <HBar
                key={x.type}
                label={NETWORKING_EVENT_TYPE_LABELS[x.type]}
                sub={`${x.count}회 · 평균 ${x.avg.toFixed(1)}명`}
                ratio={x.count / maxTypeCount}
              />
            ))}
          </div>
        )}
      </StatCard>

      {/* 최근 참석 인원 추이 */}
      <StatCard icon={<TrendingUp size={13} />} title="최근 참석 인원 추이">
        {trend.length === 0 ? (
          <p className="text-xs text-muted-foreground">집계 준비 중</p>
        ) : (
          <div className="flex items-end gap-1.5" style={{ height: 96 }}>
            {trend.map((t) => (
              <div key={t.id} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">{t.count}</span>
                <div
                  className="w-full rounded-t bg-success"
                  style={{ height: `${Math.max(4, (t.count / maxTrend) * 72)}px` }}
                  title={`${t.title}: ${t.count}명`}
                />
                <span className="w-full truncate text-center text-[9px] text-muted-foreground">
                  {t.startAt.slice(5, 10)}
                </span>
              </div>
            ))}
          </div>
        )}
      </StatCard>

      {/* 반복 참석자 TOP */}
      <StatCard icon={<Repeat size={13} />} title="반복 참석자 TOP">
        {repeat.length === 0 ? (
          <EmptyState compact title="반복 참석자(2회 이상)가 아직 없습니다" />
        ) : (
          <div className="space-y-1.5">
            {repeat.map((x) => (
              <HBar key={x.name} label={x.name} sub={`${x.count}회`} ratio={x.count / maxRepeat} />
            ))}
          </div>
        )}
      </StatCard>

      {/* 회비 회수율 · 노쇼율 */}
      <StatCard icon={<Wallet size={13} />} title="회비 회수율 · 노쇼율">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">회비 회수율</span>
              <span className="font-semibold tabular-nums">
                {(fee.rate * 100).toFixed(0)}% ({formatWon(fee.paid)} / {formatWon(fee.total)})
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded bg-muted">
              <div
                className="h-full rounded bg-warning"
                style={{ width: `${Math.min(100, fee.rate * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <UserX size={12} /> 노쇼율
              </span>
              {noShow.att > 0 ? (
                <span className="font-semibold tabular-nums">
                  {(noShow.rate * 100).toFixed(0)}% ({noShow.miss} / {noShow.att}명 · {noShow.events}개 행사)
                </span>
              ) : (
                <span className="text-muted-foreground">체크인 도입 행사 없음</span>
              )}
            </div>
            {noShow.att > 0 && (
              <div className="mt-1 h-2.5 overflow-hidden rounded bg-muted">
                <div
                  className="h-full rounded bg-destructive"
                  style={{ width: `${Math.min(100, noShow.rate * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </StatCard>
    </div>
  );
}
