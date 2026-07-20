"use client";

/**
 * useKudosSend — 관계 무관 응원 전송 공통 로직 (v11-H2).
 *
 * v8-H2 의 useCohortKudos 에서 "대상 산정"을 뺀 공통부(주 1회 dedup·낙관적 반영·전송·알림)를
 * 추출해 코호트 밖 관계(멘토링·스터디·해커톤)에서도 재사용한다. 대상 목록은 각 컨텍스트
 * 화면에서 계산해 넘긴다("대상 산정만 컨텍스트별로").
 *
 * 규율 유지: 결정적 docId(`{from}_{to}_{weekKey}`)로 주 1회 자연 제한·append-only,
 * 자기응원 차단, 양성 전용·순위 없음. 이미 보낸 대상은 호출부에서 isSent 로 선차단한다.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { kudosApi } from "@/lib/bkend";
import { currentWeekKey } from "@/lib/weekly-goal";
import { notifyKudos } from "@/features/notifications/notify";
import type { KudosContext } from "@/types/kudos";

/** 응원 수신 대상 — 전송/표시에 필요한 최소 필드만. User 도 그대로 대입 가능. */
export interface KudosTarget {
  id: string;
  name: string;
  profileImage?: string;
}

export interface KudosSend {
  /** 이번 주 이미 응원했는지 (본인 발신분 + 낙관적 반영) */
  isSent: (targetId: string) => boolean;
  /** 전송 진행 중인 대상 id */
  isSending: (targetId: string) => boolean;
  /** 응원 1건 전송 (멱등, 주 1회, 자기응원 차단) */
  sendKudos: (target: KudosTarget) => Promise<void>;
}

export function useKudosSend(
  me: { id: string; name: string } | null | undefined,
  context: KudosContext,
): KudosSend {
  const weekKey = useMemo(() => currentWeekKey(), []);
  const myId = me?.id;

  // 내가 이번 주에 이미 보낸 응원 대상(본인 발신분만 read). 컨텍스트 무관 공통 queryKey 로 dedup.
  const { data: sentDocs } = useQuery({
    queryKey: ["kudos-sent", myId, weekKey],
    queryFn: () => kudosApi.listSentByUser(myId as string),
    enabled: !!myId,
    staleTime: 60_000,
    retry: false,
  });
  const sentThisWeek = useMemo(() => {
    const s = new Set<string>();
    for (const k of sentDocs?.data ?? []) {
      if (k.weekKey === weekKey) s.add(k.toUserId);
    }
    return s;
  }, [sentDocs, weekKey]);

  const [optimisticSent, setOptimisticSent] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  async function sendKudos(target: KudosTarget) {
    if (!me?.id || target.id === me.id) return;
    setSending(target.id);
    try {
      await kudosApi.send(me.id, me.name, target.id, weekKey, "cheer", context);
      void notifyKudos(target.id, me.name, context);
      setOptimisticSent((prev) => new Set(prev).add(target.id));
      toast.success(`${target.name}님에게 응원을 보냈어요 👏`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "응원 전송에 실패했어요.");
    } finally {
      setSending(null);
    }
  }

  return {
    isSent: (targetId: string) => sentThisWeek.has(targetId) || optimisticSent.has(targetId),
    isSending: (targetId: string) => sending === targetId,
    sendKudos,
  };
}
