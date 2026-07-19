"use client";

import { useQuery } from "@tanstack/react-query";
import { diagnosticResultsApi } from "@/lib/bkend";
import type { DiagnosticResult } from "@/types";

/**
 * H4(v7): 대시보드 진단 이력 공통 훅 — 배치 fetch 통합.
 *
 * 이전에는 아래 7개 위젯이 `diagnosticResultsApi.listByUser(userId)` 를
 * 서로 다른 queryKey 로 각각 호출해 대시보드 1회 진입에 동일 컬렉션을 최대 4중 read 했다:
 *   - ["dashboard-diagnosis-readiness", userId]  (DiagnosisReadinessWidget)
 *   - ["my-growth-diagnosis", userId]            (MyGrowthWidget)
 *   - ["onboarding-card-diagnosis", userId]      (NewMemberOnboardingCard)
 *   - ["stage-rec-diagnostics", userId]          (StageRecommendationPanel·NextActionBanner·InactivityCoachingCard·QuickLinks)
 *
 * 단일 canonical key(["user-diagnostics", userId])로 통일해 react-query 캐시를 공유한다.
 * 위젯별로 필요한 형태(최신 1건·boolean·전체 배열)는 `select` 로 파생 — 네트워크 read 는 1회.
 * staleTime 은 기존 모든 소비처와 동일한 5분을 유지해 동작 불변.
 */
export const USER_DIAGNOSTICS_STALE_TIME = 5 * 60_000;

export function useUserDiagnostics<TData = DiagnosticResult[]>(
  userId: string | undefined,
  select?: (list: DiagnosticResult[]) => TData,
) {
  return useQuery<DiagnosticResult[], Error, TData>({
    queryKey: ["user-diagnostics", userId],
    queryFn: async (): Promise<DiagnosticResult[]> => {
      if (!userId) return [];
      const res = await diagnosticResultsApi.listByUser(userId);
      return Array.isArray(res.data) ? (res.data as DiagnosticResult[]) : [];
    },
    enabled: !!userId,
    staleTime: USER_DIAGNOSTICS_STALE_TIME,
    select,
  });
}
