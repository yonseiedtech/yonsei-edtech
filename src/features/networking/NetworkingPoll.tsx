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

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { CalendarCheck, Sparkles, Users as UsersIcon, Lock, ChevronLeft, ChevronRight, Check, LogIn, ExternalLink, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { networkingAvailabilityApi, networkingEventsApi } from "@/lib/bkend";
import type { NetworkingAvailability, NetworkingEvent, SlotTally } from "@/types";
import {
  buildCandidateSlots,
  eventPollSlots,
  tallyAvailability,
  countRespondersByDate,
  bestSlots,
  formatSlotLabel,
  resolveSlotStartAt,
} from "@/features/networking/networking-utils";
import EmptyState from "@/components/ui/empty-state";

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

/** 슬롯의 시간대가 HH:MM 형식인지 (G12: 자유 텍스트 시간대는 확정 시 18:00 폴백) */
function slotHasValidTime(slot: string): boolean {
  const t = slot.split("|")[1];
  return !!t && /^\d{1,2}:\d{2}$/.test(t);
}

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
  // G12: 자유 텍스트 시간대 확정 시 운영진이 직접 시각을 지정 (기본 18:00)
  const [confirmTime, setConfirmTime] = useState("18:00");

  // 비로그인 게스트 투표 — 이름·학번을 로컬에 보관하고 서버(availability-guest)로 저장.
  // 게스트는 rules 상 응답 목록을 읽을 수 없어 본인 선택만 로컬(guestSlots)로 표시한다.
  const [guestVoter, setGuestVoter] = useState<{ name: string; studentId: string } | null>(null);
  const [guestSlots, setGuestSlots] = useState<Set<string>>(new Set());
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState("");
  const [guestStudentIdInput, setGuestStudentIdInput] = useState("");
  const guestSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gatherings.guestVoter");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { name?: unknown; studentId?: unknown };
      if (typeof parsed?.name === "string" && typeof parsed?.studentId === "string") {
        setGuestVoter({ name: parsed.name, studentId: parsed.studentId });
      }
    } catch {
      /* localStorage 접근 불가·파싱 실패 시 무시 */
    }
  }, []);

  const candidateSlots = useMemo(() => {
    const { weekday, weekend } = eventPollSlots({
      pollTimeSlots: event.pollTimeSlots,
      pollTimeSlotsWeekday: event.pollTimeSlotsWeekday,
      pollTimeSlotsWeekend: event.pollTimeSlotsWeekend,
    });
    return buildCandidateSlots(event.pollPeriodStart ?? "", event.pollPeriodEnd ?? "", weekday, weekend);
  }, [
    event.pollPeriodStart,
    event.pollPeriodEnd,
    event.pollTimeSlots,
    event.pollTimeSlotsWeekday,
    event.pollTimeSlotsWeekend,
  ]);

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

  // 게스트(비로그인) 실시간 집계 — networking_availability 는 rules 로 못 읽으므로
  // 서버 집계 엔드포인트(슬롯별 카운트만, 개인정보 미노출)를 폴링한다.
  // 이게 없으면 게스트에겐 "현재 최다 가능 일정"이 항상 비어 보였다(2026-07-16 리포트).
  type GuestTally = {
    slotCounts: Record<string, number>;
    dateResponderCounts: Record<string, number>;
    responderCount: number;
  };
  const { data: guestTally } = useQuery<GuestTally>({
    queryKey: ["networking-availability-tally", event.id],
    queryFn: async () => {
      const res = await fetch(`/api/networking/availability-tally?eventId=${encodeURIComponent(event.id)}`);
      if (!res.ok) return { slotCounts: {}, dateResponderCounts: {}, responderCount: 0 };
      return (await res.json()) as GuestTally;
    },
    refetchInterval: 7000,
    enabled: !user,
  });

  const tallies = useMemo<SlotTally[]>(() => {
    if (user) return tallyAvailability(responses, candidateSlots);
    // 게스트: 서버 집계(슬롯 카운트) 로 SlotTally 구성 — 이름은 표시하지 않는다.
    const counts = guestTally?.slotCounts ?? {};
    return candidateSlots.map((slot) => {
      const [date, time] = slot.split("|");
      return { slot, date, time, count: counts[slot] ?? 0, names: [] };
    });
  }, [user, responses, candidateSlots, guestTally]);
  const tallyBySlot = useMemo(() => {
    const m = new Map<string, SlotTally>();
    for (const t of tallies) m.set(t.slot, t);
    return m;
  }, [tallies]);
  const maxCount = useMemo(() => Math.max(0, ...tallies.map((t) => t.count)), [tallies]);
  const best = useMemo(() => bestSlots(tallies), [tallies]);

  // 날짜별 "그 날 가능한 서로 다른 응답자 수" — candidateSlots 필터 없이(손실 없음).
  // 회원은 전체 응답으로, 게스트는 서버 집계로. 시간대 설정을 바꿔 일부 슬롯이 candidate 에서
  // 빠져도 응답이 통째로 누락되지 않게 한다("응답 N명인데 최다 1명" 문제 해결, 2026-07-16).
  const dateResponderCount = useMemo<Record<string, number>>(() => {
    if (user) return countRespondersByDate(responses, periodDates);
    return guestTally?.dateResponderCounts ?? {};
  }, [user, responses, periodDates, guestTally]);

  // 날짜 단위 집계 — 그 날 응답자 수(헤드라인) + 후보 슬롯 중 최다 시간대(부가 정보)
  const dateAgg = useMemo(() => {
    const m = new Map<string, { count: number; bestTime?: string }>();
    for (const [date, slots] of slotsByDate) {
      let bestTime: string | undefined;
      let bestSlotCount = 0;
      for (const slot of slots) {
        const c = tallyBySlot.get(slot)?.count ?? 0;
        if (c > bestSlotCount) { bestSlotCount = c; bestTime = tallyBySlot.get(slot)?.time; }
      }
      // 최다 시간대는 2명 이상 겹칠 때만 강조(겹치는 시간 없이 1명이면 표기 생략)
      m.set(date, { count: dateResponderCount[date] ?? 0, bestTime: bestSlotCount >= 2 ? bestTime : undefined });
    }
    return m;
  }, [slotsByDate, tallyBySlot, dateResponderCount]);

  // 캘린더 셀 색상 정규화용 — 날짜 단위 최대 응답자 수(슬롯 단위 maxCount 와 별도 스케일)
  const maxDateCount = useMemo(
    () => Math.max(0, ...Array.from(dateAgg.values()).map((v) => v.count)),
    [dateAgg],
  );

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
  // 회원은 서버 응답, 게스트는 로컬 선택(guestSlots) 기준
  const mySlots = useMemo(
    () => (user ? new Set(myResponse?.availableSlots ?? []) : guestSlots),
    [user, myResponse, guestSlots],
  );
  const myDateSet = useMemo(() => {
    const s = new Set<string>();
    for (const slot of mySlots) s.add(slot.split("|")[0]);
    return s;
  }, [mySlots]);

  const pollClosed = !!event.pollDeadline && new Date(event.pollDeadline).getTime() < Date.now();
  const isGuestVoting = !user && !!guestVoter;
  const canVote = (!!user || isGuestVoting) && !pollClosed;

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

  /** 게스트 선택을 서버로 저장 (debounce 800ms — 토글 반복 시 마지막 상태만 반영) */
  async function saveGuestVotes(slots: string[]) {
    const voter = guestVoter;
    if (!voter) return;
    try {
      const res = await fetch("/api/networking/availability-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          guestName: voter.name,
          studentId: voter.studentId,
          availableSlots: slots,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "저장에 실패했습니다.");
      }
      toast.success("가능 일정이 저장되었습니다.");
      // 저장 직후 게스트 집계 갱신 — 폴링(7s) 기다리지 않고 즉시 반영
      qc.invalidateQueries({ queryKey: ["networking-availability-tally", event.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    }
  }

  function scheduleGuestSave(slots: string[]) {
    if (guestSaveTimer.current) clearTimeout(guestSaveTimer.current);
    guestSaveTimer.current = setTimeout(() => void saveGuestVotes(slots), 800);
  }

  /** 게스트 투표 시작 — 이름·학번 검증 후 로컬 보관 → 캘린더 활성화 */
  function submitGuestVoter() {
    const name = guestNameInput.trim();
    const sid = guestStudentIdInput.trim();
    if (!name || !sid) {
      toast.error("이름과 학번을 입력해주세요.");
      return;
    }
    if (name.length > 30) {
      toast.error("이름이 너무 깁니다.");
      return;
    }
    if (!/^[0-9-]{1,20}$/.test(sid)) {
      toast.error("학번은 숫자와 하이픈만 입력할 수 있습니다.");
      return;
    }
    const voter = { name, studentId: sid };
    try {
      localStorage.setItem("gatherings.guestVoter", JSON.stringify(voter));
    } catch {
      /* 저장 실패해도 이번 세션 투표는 진행 */
    }
    setGuestVoter(voter);
    setGuestFormOpen(false);
  }

  /** 슬롯 토글 → 회원은 서버 upsert, 게스트는 로컬 선택 후 debounce 저장 */
  async function toggleSlot(slot: string) {
    if (pollClosed) return;
    if (!user) {
      if (!guestVoter) return;
      setGuestSlots((prev) => {
        const next = new Set(prev);
        if (next.has(slot)) next.delete(slot);
        else next.add(slot);
        scheduleGuestSave(Array.from(next));
        return next;
      });
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = new Set(mySlots);
    if (next.has(slot)) next.delete(slot);
    else next.add(slot);
    const slots = Array.from(next);
    try {
      const now = new Date().toISOString();
      if (myResponse) {
        // 마지막 슬롯까지 해제하면 응답 문서를 삭제한다 — 빈 응답이 "응답 N명"에 잡혀
        // "응답 2명인데 최다 1명"처럼 보이던 문제 방지.
        if (slots.length === 0) {
          await networkingAvailabilityApi.remove(myResponse.id);
        } else {
          await networkingAvailabilityApi.update(myResponse.id, { availableSlots: slots, updatedAt: now });
        }
      } else if (slots.length > 0) {
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
    mutationFn: async ({ slot, timeOverride }: { slot: string; timeOverride?: string }) => {
      // "HH:MM" 형식이 아닌 자유 텍스트 시간대("저녁" 등)는 18:00 기본값으로 안전 폴백.
      // G12: 운영진이 시각을 직접 지정한 경우(timeOverride) 그 시각으로 확정한다.
      const [date] = slot.split("|");
      const startAt =
        timeOverride && /^\d{1,2}:\d{2}$/.test(timeOverride)
          ? new Date(`${date}T${timeOverride}:00`).toISOString()
          : resolveSlotStartAt(slot);
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

  // G12: 확정 확인 프롬프트 — 자유 텍스트 시간대면 경고 + 시각 직접 입력을 노출.
  function renderConfirmPrompt(slot: string) {
    const validTime = slotHasValidTime(slot);
    const timeLabel = slot.split("|")[1];
    return (
      <div className="space-y-2">
        {!validTime && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
            <p>「{timeLabel}」는 시각이 아니어서 아래 시각으로 확정됩니다. 계속할까요?</p>
            <label className="mt-1.5 inline-flex items-center gap-1.5 font-medium">
              확정 시각
              <Input
                type="time"
                value={confirmTime}
                onChange={(e) => setConfirmTime(e.target.value)}
                className="h-7 w-28 text-xs"
              />
            </label>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-foreground">
            <b>{formatSlotLabel(slot)}</b>
            {!validTime && confirmTime ? ` (${confirmTime})` : ""}(으)로 확정하시겠어요? 투표가 종료됩니다.
          </span>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={confirmM.isPending}
            onClick={() => confirmM.mutate({ slot, timeOverride: validTime ? undefined : confirmTime })}
          >
            확정
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirming(false)}>
            취소
          </Button>
        </div>
      </div>
    );
  }

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
          <UsersIcon size={12} /> 응답 {user ? responses.filter((r) => (r.availableSlots?.length ?? 0) > 0).length : (guestTally?.responderCount ?? 0)}명
        </span>
      </div>

      {/* G10(2026-07-08): 마감됐지만 아직 미확정(startAt 없음)인 "확정 대기" 구간 안내 */}
      {pollClosed && !event.startAt && (
        <div
          className={cn(
            "mb-3 rounded-xl border px-3 py-2 text-[11px]",
            event.pollDecisionMode === "auto"
              ? "border-indigo-200 bg-indigo-50/70 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-100"
              : canEdit
                ? "border-amber-300 bg-amber-50 font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100"
                : "border-border bg-muted/40 text-muted-foreground",
          )}
        >
          {event.pollDecisionMode === "auto"
            ? "투표가 마감되었습니다 — 곧 자동 확정됩니다(매일 오전 확정 처리)."
            : canEdit
              ? "확정 대기 중 — 아래에서 확정해 주세요."
              : "운영진 확정 대기 중입니다."}
        </div>
      )}

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
          <EmptyState compact title="아직 응답이 없습니다" description="가능한 날짜를 선택해 첫 응답을 남겨보세요." className="mt-1" />
        )}
      </div>

      <p className="mb-2 text-[11px] text-muted-foreground">
        {pollClosed
          ? "투표가 마감되었습니다."
          : user
            ? "날짜를 눌러 가능한 시간대를 선택하세요. 진하게 칠해질수록 많은 회원이 가능합니다."
            : isGuestVoting
              ? "날짜를 눌러 가능한 시간대를 선택하세요. 전체 집계는 공유 페이지에서 확인할 수 있습니다."
              : "가능한 일정을 투표해 주세요. 로그인 또는 비로그인으로 참여할 수 있습니다."}
      </p>

      {/* 비로그인 투표 진입 (미로그인 & 아직 게스트 등록 전) */}
      {!user && !guestVoter && !pollClosed && (
        <div className="mb-3 rounded-xl border border-dashed bg-muted/30 p-3">
          {!guestFormOpen ? (
            <div className="space-y-2">
              {/* 작업 3(2026-07-14): 비회원도 참여 가능함을 강조 — 게스트 투표 CTA 를 기본(강조) 버튼으로 */}
              <p className="text-[11px] font-medium text-foreground">회원이 아니어도 참여할 수 있어요.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setGuestFormOpen(true)}>
                  <UserPlus size={13} /> 로그인 없이 학번·이름으로 투표하기
                </Button>
                <Link href="/login" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                  <LogIn size={13} /> 로그인하고 투표
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-foreground">이름과 학번을 입력하면 바로 투표할 수 있어요.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value)}
                  placeholder="이름"
                  maxLength={30}
                  className="h-8 text-sm sm:flex-1"
                />
                <Input
                  value={guestStudentIdInput}
                  onChange={(e) => setGuestStudentIdInput(e.target.value)}
                  placeholder="학번"
                  maxLength={20}
                  inputMode="numeric"
                  className="h-8 text-sm sm:flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitGuestVoter();
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={submitGuestVoter}>투표 시작</Button>
                <Button size="sm" variant="ghost" onClick={() => setGuestFormOpen(false)}>취소</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 게스트 투표 중 안내 배너 */}
      {isGuestVoting && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 dark:border-indigo-900 dark:bg-indigo-950/30">
          <p className="text-[11px] text-indigo-800 dark:text-indigo-100">
            비로그인 투표 중 · <b>{guestVoter?.name}</b> 님 · 선택 {guestSlots.size}개
          </p>
          <Link
            href={`/gatherings/poll/${event.id}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
          >
            전체 집계 보기 <ExternalLink size={11} />
          </Link>
        </div>
      )}

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
                inPeriod ? heatClass(count, maxDateCount) : "border-transparent bg-transparent text-muted-foreground/40",
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
              {pollClosed
                ? "투표가 마감되었습니다."
                : canVote
                  ? user
                    ? "시간대를 눌러 내 가능 여부를 저장하세요. 진할수록 많은 회원이 가능합니다."
                    : "시간대를 눌러 가능 여부를 저장하세요. 선택은 자동 저장됩니다."
                  : "로그인 또는 비로그인 투표를 시작하면 시간대를 선택할 수 있습니다."}
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
                    disabled={!canVote || busy}
                    onClick={() => toggleSlot(slot)}
                    aria-pressed={mine}
                    title={names.length ? `${names.join(", ")} (${count}명)` : "응답 없음"}
                    className={cn(
                      "flex min-h-[52px] flex-col rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-default",
                      heatClass(count, maxCount),
                      mine && "ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-background",
                      canVote && "hover:border-indigo-400",
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
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    최다 가능: <b className="text-foreground">{formatSlotLabel(best[0].slot)}</b> ({best[0].count}명)
                  </span>
                  {!confirming && (
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      disabled={confirmM.isPending}
                      onClick={() => { setConfirmTime("18:00"); setConfirming(true); }}
                    >
                      이 날로 확정
                    </Button>
                  )}
                </div>
                {confirming && renderConfirmPrompt(best[0].slot)}
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
                  renderConfirmPrompt(pickedSlot)
                ) : (
                  <Button size="sm" className="h-8 text-xs" onClick={() => { setConfirmTime("18:00"); setConfirming(true); }}>
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
