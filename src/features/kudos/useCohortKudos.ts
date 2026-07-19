"use client";

/**
 * useCohortKudos — 코호트 동기 학습 응원 보내기 로직 (v8-H2).
 *
 * v7-H5 에서 온보딩 CohortSection 에만 있던 응원 전송 로직을 훅으로 추출해
 * 대시보드 KudosWidget 과 온보딩 CohortSection 이 공유한다(중복 방지).
 *
 * "활동 사실"만 사용: 이번 주 streak_events 존재 여부로 대상만 추린다(점수·수치 비노출).
 * 멱등: kudosApi.send 는 결정적 docId 로 주 1회만 — 호출부에서 이미 보낸 대상은 선차단.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { kudosApi, streakEventsApi } from "@/lib/bkend";
import { currentWeekKey } from "@/lib/weekly-goal";
import { notifyKudos } from "@/features/notifications/notify";
import type { User } from "@/types";

export interface CohortKudos {
  /** 이번 주 학습 활동을 이어간 동기 — 응원 대상 */
  kudosTargets: User[];
  /** 이번 주 이미 응원했는지 (본인 발신분 + 낙관적 반영) */
  isSent: (peerId: string) => boolean;
  /** 전송 진행 중인 대상 id */
  isSending: (peerId: string) => boolean;
  /** 응원 1건 전송 (멱등, 주 1회) */
  sendKudos: (peer: User) => Promise<void>;
}

export function useCohortKudos(me: User | null | undefined, peers: User[]): CohortKudos {
  const activityWeekKey = useMemo(() => currentWeekKey(), []);
  const myId = me?.id;

  // 이번 주 학습 활동이 있는 회원 id 집합 (범위 쿼리로 이번 주만 좁혀 읽음)
  const { data: activeIds } = useQuery({
    queryKey: ["cohort-kudos-active", activityWeekKey],
    queryFn: async () => {
      const events = await streakEventsApi.listSince(activityWeekKey);
      return new Set(events.map((e) => e.userId).filter(Boolean));
    },
    enabled: peers.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // 내가 이번 주에 이미 보낸 응원 대상(본인 발신분만 read 됨)
  const { data: sentDocs } = useQuery({
    queryKey: ["cohort-kudos-sent", myId, activityWeekKey],
    queryFn: () => kudosApi.listSentByUser(myId as string),
    enabled: peers.length > 0 && !!myId,
    staleTime: 60_000,
    retry: false,
  });
  const sentThisWeek = useMemo(() => {
    const s = new Set<string>();
    for (const k of sentDocs?.data ?? []) {
      if (k.weekKey === activityWeekKey) s.add(k.toUserId);
    }
    return s;
  }, [sentDocs, activityWeekKey]);

  // 응원 대상: 이번 주 학습 활동 있음 + 리더보드 비공개(showInLeaderboard=false) 아님 + 나 제외.
  const kudosTargets = useMemo(
    () =>
      activeIds
        ? peers.filter((p) => activeIds.has(p.id) && p.showInLeaderboard !== false)
        : [],
    [peers, activeIds],
  );

  const [optimisticSent, setOptimisticSent] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  async function sendKudos(peer: User) {
    if (!me?.id) return;
    setSending(peer.id);
    try {
      await kudosApi.send(me.id, me.name, peer.id, activityWeekKey);
      void notifyKudos(peer.id, me.name);
      setOptimisticSent((prev) => new Set(prev).add(peer.id));
      toast.success(`${peer.name}님에게 응원을 보냈어요 👏`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "응원 전송에 실패했어요.");
    } finally {
      setSending(null);
    }
  }

  return {
    kudosTargets,
    isSent: (peerId: string) => sentThisWeek.has(peerId) || optimisticSent.has(peerId),
    isSending: (peerId: string) => sending === peerId,
    sendKudos,
  };
}
