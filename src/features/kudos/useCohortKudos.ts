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

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { streakEventsApi } from "@/lib/bkend";
import { currentWeekKey } from "@/lib/weekly-goal";
import { useKudosSend, type KudosTarget } from "./useKudosSend";
import type { User } from "@/types";

export interface CohortKudos {
  /** 이번 주 학습 활동을 이어간 동기 — 응원 대상 */
  kudosTargets: User[];
  /** 이번 주 이미 응원했는지 (본인 발신분 + 낙관적 반영) */
  isSent: (peerId: string) => boolean;
  /** 전송 진행 중인 대상 id */
  isSending: (peerId: string) => boolean;
  /** 응원 1건 전송 (멱등, 주 1회). User 도 그대로 대입 가능(KudosTarget 상위호환). */
  sendKudos: (peer: KudosTarget) => Promise<void>;
}

export function useCohortKudos(me: User | null | undefined, peers: User[]): CohortKudos {
  const activityWeekKey = useMemo(() => currentWeekKey(), []);

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

  // 응원 대상: 이번 주 학습 활동 있음 + 리더보드 비공개(showInLeaderboard=false) 아님 + 나 제외.
  const kudosTargets = useMemo(
    () =>
      activeIds
        ? peers.filter((p) => activeIds.has(p.id) && p.showInLeaderboard !== false)
        : [],
    [peers, activeIds],
  );

  // 전송·dedup·알림은 공통 훅에 위임 — 코호트는 대상 산정만 담당한다(v11-H2).
  const { isSent, isSending, sendKudos } = useKudosSend(me, "cohort");

  return { kudosTargets, isSent, isSending, sendKudos };
}
