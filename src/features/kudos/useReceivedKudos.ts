"use client";

/**
 * useReceivedKudos — 내가 받은 응원 조회 (v8-H2).
 *
 * rules: 수신자 본인·운영진만 read. fromName 은 denorm 되어 있어 추가 회원 조회 없이 발신자 이름 표시.
 * thisWeek: 이번 주(currentWeekKey) 받은 응원만 — 대시보드 위젯 요약용.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { kudosApi } from "@/lib/bkend";
import { currentWeekKey } from "@/lib/weekly-goal";
import type { Kudos } from "@/types/kudos";

export function useReceivedKudos(userId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["received-kudos", userId],
    queryFn: async () => {
      if (!userId) return [] as Kudos[];
      const res = await kudosApi.listReceivedByUser(userId);
      return (res.data ?? []) as Kudos[];
    },
    enabled: !!userId,
    staleTime: 60_000,
    retry: false,
  });

  const all = useMemo(() => {
    const list = data ?? [];
    // 최신순 (createdAt 문자열/타임스탬프 혼재 방어 — weekKey 보조 정렬)
    return [...list].sort((a, b) => {
      const at = String(a.createdAt ?? "");
      const bt = String(b.createdAt ?? "");
      if (at !== bt) return bt.localeCompare(at);
      return (b.weekKey ?? "").localeCompare(a.weekKey ?? "");
    });
  }, [data]);

  const thisWeek = useMemo(() => {
    const wk = currentWeekKey();
    return all.filter((k) => k.weekKey === wk);
  }, [all]);

  const thisWeekSenders = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const k of thisWeek) {
      const name = (k.fromName ?? "").trim();
      if (!name || seen.has(k.fromUserId)) continue;
      seen.add(k.fromUserId);
      names.push(name);
    }
    return names;
  }, [thisWeek]);

  return {
    all,
    thisWeek,
    thisWeekCount: thisWeek.length,
    thisWeekSenders,
    isLoading,
  };
}
