"use client";

/**
 * 로얄티 스냅샷 조회 훅 (Sprint 71).
 *
 * `loyalty_snapshots` 컬렉션을 읽어 period(YYYY-MM-DD) 오름차순으로 정렬해 반환.
 * cron 이 주 1회 적재하므로 staleTime 을 길게 둔다.
 */

import { useQuery } from "@tanstack/react-query";
import { dataApi } from "@/lib/bkend";
import type { LoyaltySnapshot } from "./loyalty-snapshot-types";

export interface UseLoyaltySnapshotsResult {
  snapshots: LoyaltySnapshot[];
  isLoading: boolean;
  refetch: () => void;
}

export function useLoyaltySnapshots(enabled: boolean): UseLoyaltySnapshotsResult {
  const { data, isLoading, refetch } = useQuery({
    enabled,
    queryKey: ["loyalty-snapshots"],
    queryFn: () =>
      dataApi.list<LoyaltySnapshot>("loyalty_snapshots", { limit: 200 }),
    staleTime: 10 * 60_000,
  });

  const snapshots = ((data?.data ?? []) as LoyaltySnapshot[])
    .slice()
    .sort((a, b) => a.period.localeCompare(b.period));

  return { snapshots, isLoading, refetch: () => void refetch() };
}
