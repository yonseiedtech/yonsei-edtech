"use client";

/**
 * NetworkingPoll — 일정 조율 투표 UI (캘린더 뷰, 사이클 124 → 캘린더 개편)
 * 운영진이 기간만 정한 poll 행사에서, 회원이 가능한 날짜/시간 슬롯을 토글 저장하고
 * 전체 응답을 실시간 집계하여 월 단위 캘린더 히트맵으로 강조한다.
 * canEdit(운영진)면 최종 슬롯을 확정해 startAt 지정 + schedulingMode "fixed" 전환.
 *
 * 데이터 모델(NetworkingAvailability.availableSlots)과 유틸(buildCandidateSlots/tallyAvailability/
 * bestSlots/formatSlotLabel)은 그대로 재사용하고 UI(when2meet 그리드 → 캘린더)만 개편했다.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { CalendarCheck, Sparkles, Users as UsersIcon, Lock, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { networkingAvailabilityApi, networkingEventsApi } from "@/lib/bkend";
import type { NetworkingAvailability, NetworkingEvent, SlotTally } from "@/types";
import {
  buildCandidateSlots,
  tallyAvailability,
  bestSlots,
  formatSlotLabel,
  resolveSlotStartAt,
} from "@/features/networking/networking-utils";

interface Props {
  event: NetworkingEvent;
  canEdit: boolean;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 응답 수 → 히트맵 색상 강도 (인디고). 0이면 무색 */
function heatClass(count: number, max: number): string {
  if (count <= 0 || max <= 0) return "border-border bg-background text-muted-foreground";
  const ratio = count / max;
  if (ratio >= 1) return "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500";
  if (ratio >= 0.66) return "border-indigo-500 bg-indigo-400 text-white dark:bg-indigo-600/80";
  if (ratio >= 0.33) return "border-indigo-300 bg-indigo-200 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-800/60 dark:text-indigo-100";
  return "border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200";
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

/** "YYYY-MM-DD" → "7월 18일 (금)" */
function fullDateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

/** viewMonth 기준 캘린더 셀(일~토, 앞뒤 달 채움) */
function buildMonthCells(view: Date): { date: string; day: number; inMonth: boolean }[] {
  const y = view.getFullYear();
  const m = view.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const lastDate = new Date(y, m + 1, 0).getDate();
  const cells: { date: string; day: number; inMonth: boolean }[] = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = new Date(y, m, -i);
    cells.push({ date: ymd(d), day: d.getDate(), inMonth: false });
  }
  for (let d = 1; d <= lastDate; d++) {
    const dt = new Date(y, m, d);
    cells.push({ date: ymd(dt), day: d, inMonth: true });
  }
  let trailing = 1;
  while (cells.length % 7 !== 0) {
    const dt = new Date(y, m + 1, trailing++);
    cells.push({ date: ymd(dt), day: dt.getDate(), inMonth: false });
  }
  return cells;
}

export default function NetworkingPoll({ event, canEdit }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const candidateSlots = useMemo(
    () => buildCandidateSlots(event.pollPeriodStart ?? "", event.pollPeriodEnd ?? "", event.pollTimeSlots),
    [event.pollPeriodStart, event.pollPeriodEnd, event.pollTimeSlots],
  );

  // 후보 슬롯을 날짜별로 그룹화
  const slotsByDate = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const slot of candidateSlots) {
      const [date] = slot.split("|");
      const arr = m.get(date) ?? [];
      arr.push(slot);
      m.set(date, arr);
    }
    return m;
  }, [candidateSlots]);
  const periodDates = useMemo(() => new Set(slotsByDate.keys()), [slotsByDate]);

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

  // 날짜 단위 집계 — 각 날짜의 최고 슬롯 count + 그 시간대
  const dateAgg = useMemo(() => {
    const m = new Map<string, { count: number; bestTime?: string }>();
    for (const [date, slots] of slotsByDate) {
      let top: { count: number; bestTime?: string } = { count: 0, bestTime: undefined };
      for (const slot of slots) {
        const t = tallyBySlot.get(slot);
        const c = t?.count ?? 0;
        if (c > top.count) top = { count: c, bestTime: t?.time };
      }
      m.set(date, top);
    }
    return m;
  }, [slotsByDate, tallyBySlot]);

  // 상위 최다 가능 날짜 (동률 포함, 상위 3개)
  const bestDates = useMemo(() => {
    const arr = Array.from(dateAgg.entries())
      .filter(([, v]) => v.count > 0)
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
    return arr.slice(0, 3).map(([date, v]) => ({ date, count: v.count, bestTime: v.bestTime }));
  }, [dateAgg]);

  // 내 응답
  const myResponse = useMemo(
    () => (user ? responses.find((r) => r.userId === user.id) ?? null : null),
    [responses, user],
  );
  const mySlots = useMemo(() => new Set(myResponse?.availableSlots ?? []), [myResponse]);
  const myDateSet = useMemo(() => {
    const s = new Set<string>();
    for (const slot of mySlots) s.add(slot.split("|")[0]);
    return s;
  }, [mySlots]);

  const pollClosed = !!event.pollDeadline && new Date(event.pollDeadline).getTime() < Date.now();

  // 월 네비게이션
  const monthBounds = useMemo(() => {
    const s = new Date(`${event.pollPeriodStart ?? ""}T00:00:00`);
    const e = new Date(`${event.pollPeriodEnd ?? ""}T00:00:00`);
    const first = isNaN(s.getTime()) ? new Date() : new Date(s.getFullYear(), s.getMonth(), 1);
    const last = isNaN(e.getTime()) ? first : new Date(e.getFullYear(), e.getMonth(), 1);
    return { first, last };
  }, [event.pollPeriodStart, event.pollPeriodEnd]);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(`${event.pollPeriodStart ?? ""}T00:00:00`);
    return isNaN(d.getTime()) ? new Date() : new Date(d.getFullYear(), d.getMonth(), 1);
  });
  // codex Medium: 같은 컴포넌트 인스턴스가 다른 이벤트/기간을 받으면(콘솔 상세 전환 등)
  // viewMonth 가 이전 기간에 머물러 후보 날짜가 안 보임 — 이벤트·기간 변경 시 재동기화.
  useEffect(() => {
    const d = new Date(`${event.pollPeriodStart ?? ""}T00:00:00`);
    setSelectedDate(null);
    setViewMonth(isNaN(d.getTime()) ? new Date() : new Date(d.getFullYear(), d.getMonth(), 1));
  }, [event.id, event.pollPeriodStart]);
  const multiMonth = monthIndex(monthBounds.first) !== monthIndex(monthBounds.last);
  const prevDisabled = monthIndex(viewMonth) <= monthIndex(monthBounds.first);
  const nextDisabled = monthIndex(viewMonth) >= monthIndex(monthBounds.last);
  function shiftMonth(delta: number) {
    setSelectedDate(null);
    setViewMonth((cur) => {
      const next = new Date(cur.getFullYear(), cur.getMonth() + delta, 1);
      if (monthIndex(next) < monthIndex(monthBounds.first)) return monthBounds.first;
      if (monthIndex(next) > monthIndex(monthBounds.last)) return monthBounds.last;
      return next;
    });
  }
  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);

  /** 슬롯 토글 → upsert (기존 로직 재사용) */
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

  // 시간대 미설정 이벤트도 DEFAULT_POLL_TIME_SLOTS 폴백(buildCandidateSlots)으로 항상 팝업 모드
  function onDateClick(date: string) {
    if (!periodDates.has(date)) return;
    setSelectedDate((p) => (p === date ? null : date));
  }

  /** 운영진 확정 → startAt 지정 + fixed 전환 (기존 로직 유지) */
  const confirmM = useMutation({
    mutationFn: async (slot: string) => {
      // "HH:MM" 형식이 아닌 자유 텍스트 시간대("저녁" 등)는 18:00 기본값으로 안전 폴백
      const startAt = resolveSlotStartAt(slot);
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

      {/* 현재 최다 가능 일정 (날짜 단위 집계) */}
      <div className="mb-3 rounded-xl bg-indigo-50 px-3 py-2.5 dark:bg-indigo-950/40">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-200">
          <Sparkles size={13} className="text-indigo-600 dark:text-indigo-300" /> 현재 최다 가능 일정
        </p>
        {bestDates.length > 0 ? (
          <ul className="mt-1.5 space-y-1">
            {bestDates.map((b) => (
              <li key={b.date} className="text-xs text-indigo-800 dark:text-indigo-100">
                <b>{fullDateLabel(b.date)}</b> · {b.count}명 가능
                {b.bestTime && (
                  <span className="text-indigo-600 dark:text-indigo-300"> — {b.bestTime} 최다</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">
            아직 응답이 없습니다. 가능한 날짜를 선택해 첫 응답을 남겨보세요.
          </p>
        )}
      </div>

      <p className="mb-2 text-[11px] text-muted-foreground">
        {user
          ? pollClosed
            ? "투표가 마감되었습니다."
            : "날짜를 눌러 가능한 시간대를 선택하세요. 진하게 칠해질수록 많은 회원이 가능합니다."
          : "로그인하면 가능한 일정을 투표할 수 있습니다."}
      </p>

      {/* 월 네비게이션 */}
      <div className="mb-2 flex items-center justify-between">
        {multiMonth ? (
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            disabled={prevDisabled}
            aria-label="이전 달"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
        ) : (
          <span className="h-7 w-7" />
        )}
        <span className="text-sm font-semibold">
          {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
        </span>
        {multiMonth ? (
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={nextDisabled}
            aria-label="다음 달"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        ) : (
          <span className="h-7 w-7" />
        )}
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-muted-foreground">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={cn("py-1", i === 0 && "text-rose-500 dark:text-rose-400", i === 6 && "text-blue-500 dark:text-blue-400")}>
            {w}
          </div>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const inPeriod = periodDates.has(cell.date);
          const count = dateAgg.get(cell.date)?.count ?? 0;
          const mine = myDateSet.has(cell.date);
          const isSelected = selectedDate === cell.date;
          const clickable = inPeriod;
          return (
            <button
              key={cell.date}
              type="button"
              disabled={!clickable}
              onClick={() => onDateClick(cell.date)}
              title={inPeriod && count > 0 ? `${count}명 가능` : undefined}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg border p-0.5 text-[11px] tabular-nums transition-colors",
                inPeriod ? heatClass(count, maxCount) : "border-transparent bg-transparent text-muted-foreground/40",
                !cell.inMonth && "opacity-40",
                inPeriod && clickable && "hover:border-indigo-400",
                mine && "ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-card",
                isSelected && "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-card",
                !clickable && "cursor-default",
              )}
            >
              <span className="font-medium leading-none">{cell.day}</span>
              {inPeriod && count > 0 && (
                <span className="mt-0.5 text-[9px] font-semibold leading-none">{count}명</span>
              )}
              {mine && <Check size={9} className="absolute right-0.5 top-0.5" />}
            </button>
          );
        })}
      </div>

      {/* 날짜 클릭 → 시간대 선택 팝업 (시간대 미설정 이벤트는 기본 시간대 폴백) */}
      {(
        <Dialog open={!!selectedDate} onOpenChange={(open) => { if (!open) setSelectedDate(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-1.5 text-sm">
                <CalendarCheck size={15} className="text-indigo-600 dark:text-indigo-400" />
                {selectedDate ? fullDateLabel(selectedDate) : ""} · 가능 시간대
              </DialogTitle>
            </DialogHeader>
            <p className="text-[11px] text-muted-foreground">
              {user
                ? pollClosed
                  ? "투표가 마감되었습니다."
                  : "시간대를 눌러 내 가능 여부를 저장하세요. 진할수록 많은 회원이 가능합니다."
                : "로그인하면 시간대를 선택할 수 있습니다."}
            </p>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(selectedDate ? slotsByDate.get(selectedDate) ?? [] : []).map((slot) => {
                const tally = tallyBySlot.get(slot);
                const count = tally?.count ?? 0;
                const names = tally?.names ?? [];
                const time = slot.split("|")[1];
                const mine = mySlots.has(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={!user || busy || pollClosed}
                    onClick={() => toggleSlot(slot)}
                    aria-pressed={mine}
                    title={names.length ? `${names.join(", ")} (${count}명)` : "응답 없음"}
                    className={cn(
                      "flex min-h-[52px] flex-col rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-default",
                      heatClass(count, maxCount),
                      mine && "ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-background",
                      user && !pollClosed && "hover:border-indigo-400",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold tabular-nums">{time}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums">
                        {mine && <Check size={11} />}
                        <UsersIcon size={11} className="opacity-70" />
                        {count}명
                      </span>
                    </span>
                    {names.length > 0 && (
                      <span className="mt-1 block truncate text-[10px] opacity-80">{names.join(", ")}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}

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

      {/* 운영진 확정 패널 (기존 플로우 유지) */}
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
