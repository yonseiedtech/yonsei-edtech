"use client";

/**
 * 오늘 카드 (Phase 3) — 대시보드 최상단 개인 액션 히어로.
 *
 * "오늘 뭘 하면 되는지"를 결정할 필요 없는 진입점 하나로 압축:
 *   1. 오늘 복습할 암기카드 (SM-2 dueAt ≤ 오늘) → /flashcards
 *   2. 논문 이어쓰기 (마지막 편집 장) → /mypage/research?tab=writing
 *   3. 지도 노트 미반영 → /mypage/research?tab=feedback
 *   4. 내 참석 모임 D-day (attending RSVP) → /gatherings
 *
 * 영역별 카운트는 DashboardCommandCenter 담당 — 여기는 "내 것·오늘 것"만.
 * 액션이 하나도 없으면 렌더하지 않는다 (조용한 카드).
 */

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sunrise, Layers, PenLine, ClipboardList, PartyPopper, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDday } from "@/lib/dday";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  flashcardsApi,
  advisorFeedbackApi,
  writingPaperHistoryApi,
  networkingRsvpsApi,
  networkingEventsApi,
} from "@/lib/bkend";
import { isDueToday } from "@/lib/flashcard-srs";
import { FEEDBACK_CHAPTER_LABELS } from "@/types/research-paper";
import type {
  Flashcard,
  AdvisorFeedbackNote,
  WritingPaperHistory,
  NetworkingRsvp,
  NetworkingEvent,
} from "@/types";

interface TodayItem {
  key: string;
  icon: typeof Layers;
  href: string;
  text: string;
  accent: string;
}

export default function TodayCard() {
  const { user } = useAuthStore();
  const uid = user?.id ?? "";

  const { data: cards = [] } = useQuery({
    queryKey: ["today-flashcards", uid],
    queryFn: async () => (await flashcardsApi.listByUser(uid)).data as Flashcard[],
    enabled: !!uid,
    staleTime: 5 * 60_000,
  });
  const { data: feedbackNotes = [] } = useQuery({
    queryKey: ["today-advisor-feedback", uid],
    queryFn: async () => (await advisorFeedbackApi.listByUser(uid)).data as AdvisorFeedbackNote[],
    enabled: !!uid,
    staleTime: 5 * 60_000,
  });
  const { data: writingHistory = [] } = useQuery({
    queryKey: ["today-writing-history", uid],
    queryFn: async () => (await writingPaperHistoryApi.listByUser(uid)).data as WritingPaperHistory[],
    enabled: !!uid,
    staleTime: 5 * 60_000,
  });
  const { data: myRsvps = [] } = useQuery({
    queryKey: ["today-networking-rsvps", uid],
    queryFn: async () => (await networkingRsvpsApi.listByUser(uid)).data as NetworkingRsvp[],
    enabled: !!uid,
    staleTime: 5 * 60_000,
  });
  const { data: events = [] } = useQuery({
    queryKey: ["networking-events-published"],
    queryFn: async () => (await networkingEventsApi.listPublished()).data as NetworkingEvent[],
    enabled: myRsvps.some((r) => r.status === "attending"),
    staleTime: 5 * 60_000,
  });

  const items = useMemo<TodayItem[]>(() => {
    const list: TodayItem[] = [];

    // 1) 암기카드 복습
    const due = cards.filter((c) => isDueToday(c)).length;
    if (due > 0) {
      list.push({
        key: "flashcards",
        icon: Layers,
        href: "/flashcards",
        text: `오늘 복습할 암기카드 ${due}장`,
        accent: "text-blue-700 dark:text-blue-300",
      });
    }

    // 2) 논문 이어쓰기 — 최근 자동 저장 이력의 마지막 편집 장
    const latest = [...writingHistory].sort((a, b) =>
      (b.savedAt ?? b.createdAt ?? "").localeCompare(a.savedAt ?? a.createdAt ?? ""),
    )[0];
    if (latest?.lastChapter) {
      list.push({
        key: "writing",
        icon: PenLine,
        href: "/mypage/research?tab=writing",
        text: `이어쓰기 — ${FEEDBACK_CHAPTER_LABELS[latest.lastChapter]}`,
        accent: "text-violet-700 dark:text-violet-300",
      });
    }

    // 3) 지도 노트 미반영
    const pending = feedbackNotes.filter((n) => n.status === "pending").length;
    if (pending > 0) {
      list.push({
        key: "feedback",
        icon: ClipboardList,
        href: "/mypage/research?tab=feedback",
        text: `지도 노트 미반영 ${pending}건`,
        accent: "text-amber-700 dark:text-amber-300",
      });
    }

    // 4) 내 참석 모임 D-day (D-7 이내)
    const attendingIds = new Set(
      myRsvps.filter((r) => r.status === "attending").map((r) => r.eventId),
    );
    const nowIso = new Date().toISOString();
    const nextEvent = events
      .filter((e) => attendingIds.has(e.id) && (e.startAt ?? "") >= nowIso && e.status !== "cancelled")
      .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
    if (nextEvent) {
      const dday = formatDday(nextEvent.startAt.slice(0, 10));
      if (dday && dday.diffDays >= 0 && dday.diffDays <= 7) {
        list.push({
          key: "gathering",
          icon: PartyPopper,
          href: "/gatherings",
          text: `${dday.kind === "today" ? "오늘" : dday.label} · ${nextEvent.title} (참석 예정)`,
          accent: "text-rose-700 dark:text-rose-300",
        });
      }
    }

    return list;
  }, [cards, writingHistory, feedbackNotes, myRsvps, events]);

  if (!user || items.length === 0) return null;

  return (
    <div className="mb-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
        <Sunrise size={14} />
        오늘 할 일
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className="group inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow"
          >
            <it.icon size={13} className={cn("shrink-0", it.accent)} />
            <span className="truncate">{it.text}</span>
            <ArrowRight
              size={11}
              className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
