"use client";

/**
 * NetworkingPoll — 일정 조율(when2meet) 투표 UI (사이클 124 단계3)
 * 운영진이 기간만 정한 poll 행사에서, 회원이 가능한 날짜/시간 슬롯을 토글 저장하고
 * 전체 응답을 실시간 집계하여 최다 가능 슬롯을 히트맵으로 강조한다.
 * canEdit(운영진)면 최종 슬롯을 확정해 startAt 지정 + schedulingMode "fixed" 전환.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { CalendarCheck, Sparkles, Users as UsersIcon, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { networkingAvailabilityApi, networkingEventsApi } from "@/lib/bkend";
import type { NetworkingAvailability, NetworkingEvent, SlotTally } from "@/types";
import {
  buildCandidateSlots,
  tallyAvailability,
  bestSlots,
  formatSlotLabel,
} from "@/features/networking/networking-utils";

interface Props {
  event: NetworkingEvent;
  canEdit: boolean;
}

/** 응답 수 → 히트맵 색상 강도 (인디고). 0이면 무색 */
function heatClass(count: number, max: number): string {
  if (count <= 0 || max <= 0) return "border-border bg-background text-muted-foreground";
  const ratio = count / max;
  if (ratio >= 1) return "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500";
  if (ratio >= 0.66) return "border-indigo-500 bg-indigo-400 text-white dark:bg-indigo-600/80";
  if (ratio >= 0.33) return "border-indigo-300 bg-indigo-200 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-800/60 dark:text-indigo-100";
  return "border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200";
}

export default function NetworkingPoll({ event, canEdit }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);

  const candidateSlots = useMemo(
    () => buildCandidateSlots(event.pollPeriodStart ?? "", event.pollPeriodEnd ?? "", event.pollTimeSlots),
    [event.pollPeriodStart, event.pollPeriodEnd, event.pollTimeSlots],
  );

  // 후보 슬롯을 날짜별로 그룹화 (행=날짜, 열=시간대)
  const rows = useMemo(() => {
    const byDate = new Map<string, string[]>();
    for (const slot of candidateSlots) {
      const [date] = slot.split("|");
      const arr = byDate.get(date) ?? [];
      arr.push(slot);
      byDate.set(date, arr);
    }
    return Array.from(byDate.entries());
  }, [candidateSlots]);

  // 전체 응답 실시간 조회 (히트맵 집계)
  const { data: responses = [] } = useQuery({
    queryKey: ["networking-availability", event.id],
    queryFn: async () => (await networkingAvailabilityApi.listByEvent(event.id)).data as NetworkingAvailability[],
    refetchInterval: 7000,
    // QA-v3 M: 룰이 인증을 요구 — 게스트에겐 7초마다 permission-denied 가 반복되던 문제
    enabled: !!user,
  });

  const tallies = useMemo(() => tallyAvailability(responses, candidateSlots), [responses, candidateSlots]);
  const tallyBySlot = useMemo(() => {
    const m = new Map<string, SlotTally>();
    for (const t of tallies) m.set(t.slot, t);
    return m;
  }, [tallies]);
  const maxCount = useMemo(() => Math.max(0, ...tallies.map((t) => t.count)), [tallies]);
  const best = useMemo(() => bestSlots(tallies), [tallies]);

  // 내 응답
  const myResponse = useMemo(
    () => (user ? responses.find((r) => r.userId === user.id) ?? null : null),
    [responses, user],
  );
  const mySlots = useMemo(() => new Set(myResponse?.availableSlots ?? []), [myResponse]);

  const pollClosed = !!event.pollDeadline && new Date(event.pollDeadline).getTime() < Date.now();

  /** 슬롯 토글 → upsert */
  async function toggleSlot(slot: string) {
    if (!user || busy || pollClosed) return;
    setBusy(true);
    const next = new Set(mySlots);
    if (next.has(slot)) next.delete(slot);
    else next.add(slot);
    const slots = Array.from(next);
    try {
      const now = new Date().toISOString();
      if (myResponse) {
        await networkingAvailabilityApi.update(myResponse.id, { availableSlots: slots, updatedAt: now });
      } else {
        await networkingAvailabilityApi.create({
          eventId: event.id,
          userId: user.id,
          userName: user.name ?? "회원",
          availableSlots: slots,
          createdAt: now,
          updatedAt: now,
        });
      }
      qc.invalidateQueries({ queryKey: ["networking-availability", event.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  /** 운영진 확정 → startAt 지정 + fixed 전환 */
  const confirmM = useMutation({
    mutationFn: async (slot: string) => {
      const [date, time] = slot.split("|");
      // 시간대가 있으면 그 시각, 없으면 18:00 기본
      const startAt = new Date(`${date}T${time ?? "18:00"}:00`).toISOString();
      const now = new Date().toISOString();
      await networkingEventsApi.update(event.id, {
        startAt,
        schedulingMode: "fixed",
        updatedAt: now,
      });
    },
    onSuccess: () => {
      toast.success("일정을 확정했습니다. 투표가 종료됩니다.");
      qc.invalidateQueries({ queryKey: ["console-networking-events"] });
      qc.invalidateQueries({ queryKey: ["networking-events"] });
      setConfirming(false);
      setPickedSlot(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "확정에 실패했습니다."),
  });

  if (candidateSlots.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed bg-card p-4 text-center text-xs text-muted-foreground">
        후보 기간이 설정되지 않았습니다.
      </section>
    );
  }

  const hasTimeCols = (event.pollTimeSlots?.length ?? 0) > 0;

  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <CalendarCheck size={15} className="text-indigo-600 dark:text-indigo-400" /> 일정 조율 투표
        </h3>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <UsersIcon size={12} /> 응답 {responses.length}명
        </span>
      </div>

      {/* 최다 가능 배지 */}
      {best.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 dark:bg-indigo-950/40">
          <Sparkles size={13} className="text-indigo-600 dark:text-indigo-300" />
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">가장 많이 가능한 날:</span>
          {best.map((t) => (
            <span
              key={t.slot}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-indigo-500"
            >
              {formatSlotLabel(t.slot)} · {t.count}명
            </span>
          ))}
        </div>
      )}

      <p className="mb-2 text-[11px] text-muted-foreground">
        {user
          ? pollClosed
            ? "투표가 마감되었습니다."
            : "가능한 칸을 눌러 표시하세요. 진하게 칠해질수록 많은 회원이 가능한 시간입니다."
          : "로그인하면 가능한 일정을 투표할 수 있습니다."}
      </p>

      {/* 후보 슬롯 그리드 — 행=날짜, (시간대 있으면) 열=시간 */}
      <div className="overflow-x-auto">
        <div className="min-w-max space-y-1.5">
          {hasTimeCols && (
            <div className="flex items-center gap-1.5 pl-[88px]">
              {event.pollTimeSlots!.map((t) => (
                <div key={t} className="w-16 text-center text-[10px] font-medium text-muted-foreground">{t}</div>
              ))}
            </div>
          )}
          {rows.map(([date, slots]) => (
            <div key={date} className="flex items-center gap-1.5">
              <div className="w-[82px] shrink-0 text-right text-[11px] font-medium text-foreground/80">
                {formatSlotLabel(date)}
              </div>
              {slots.map((slot) => {
                const tally = tallyBySlot.get(slot);
                const count = tally?.count ?? 0;
                const mine = mySlots.has(slot);
                const names = tally?.names ?? [];
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={!user || busy || pollClosed}
                    onClick={() => toggleSlot(slot)}
                    title={names.length ? `${names.join(", ")} (${count}명)` : "응답 없음"}
                    className={cn(
                      "relative flex h-9 items-center justify-center rounded-lg border text-[11px] font-semibold tabular-nums transition-colors disabled:cursor-default",
                      hasTimeCols ? "w-16" : "min-w-[3.5rem] flex-1 px-2",
                      heatClass(count, maxCount),
                      mine && "ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-card",
                      user && !pollClosed && "hover:border-indigo-400",
                    )}
                  >
                    {count > 0 ? count : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-teal-500 ring-2 ring-teal-500" /> 내 가능
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-indigo-200 bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/40" /> 적음
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-indigo-600 bg-indigo-600" /> 많음
        </span>
      </div>

      {/* 운영진 확정 패널 */}
      {canEdit && (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-200">
            <Lock size={12} /> 일정 확정 (운영진)
          </p>
          {event.pollDecisionMode === "auto" ? (
            best.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  최다 가능: <b className="text-foreground">{formatSlotLabel(best[0].slot)}</b> ({best[0].count}명)
                </span>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  disabled={confirmM.isPending}
                  onClick={() => confirmM.mutate(best[0].slot)}
                >
                  이 날로 확정
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">아직 응답이 없습니다.</p>
            )
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">확정할 슬롯을 선택하세요.</p>
              <div className="flex flex-wrap gap-1.5">
                {tallies
                  .filter((t) => t.count > 0)
                  .sort((a, b) => b.count - a.count || a.slot.localeCompare(b.slot))
                  .map((t) => (
                    <button
                      key={t.slot}
                      type="button"
                      onClick={() => setPickedSlot(t.slot)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        pickedSlot === t.slot
                          ? "border-indigo-600 bg-indigo-600 text-white dark:bg-indigo-500"
                          : "border-border bg-background text-muted-foreground hover:border-indigo-400",
                      )}
                    >
                      {formatSlotLabel(t.slot)} · {t.count}명
                    </button>
                  ))}
                {tallies.every((t) => t.count === 0) && (
                  <span className="text-xs text-muted-foreground">아직 응답이 없습니다.</span>
                )}
              </div>
              {pickedSlot &&
                (confirming ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground">
                      <b>{formatSlotLabel(pickedSlot)}</b>(으)로 확정하시겠어요? 투표가 종료됩니다.
                    </span>
                    <Button size="sm" className="h-7 text-xs" disabled={confirmM.isPending} onClick={() => confirmM.mutate(pickedSlot)}>
                      확정
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirming(false)}>
                      취소
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" className="h-8 text-xs" onClick={() => setConfirming(true)}>
                    이 날로 확정
                  </Button>
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
