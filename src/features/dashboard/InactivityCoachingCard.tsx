"use client";

/**
 * InactivityCoachingCard — 잔디 비활성 영역 자동 코칭 (service-ux-gap-plan M4).
 *
 * 학습 잔디/활동 데이터를 개인 코칭으로 환류한다. 최근 14일간 멈춘 연구 습관
 * 하나를 골라 "가벼운 다음 한 걸음" 한 줄 카드로 능동 제안한다.
 *
 *  - 데이터: useGradActivityData(잔디 집계 재사용, 추가 fetch 최소화)
 *  - 판정  : pickInactivityCoaching(순수 함수) — 최대 1개 제안, 없으면 미노출
 *  - 신입 가드: 가입 60일 이내(getMemberStage === "newcomer")에겐 미노출
 *    → 비활성 잔소리 대신 온보딩 표면에 맡긴다.
 */

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sprout, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { diagnosticResultsApi } from "@/lib/bkend";
import { getMemberStage } from "@/lib/member-stage";
import { useGradActivityData } from "@/features/mypage/useGradActivityData";
import { pickInactivityCoaching } from "@/lib/inactivity-coaching";
import type { DiagnosticResult } from "@/types";

export default function InactivityCoachingCard() {
  const { user } = useAuthStore();
  const userId = user?.id;

  // 진단 이력 — QuickLinks/StageRecommendationPanel 과 동일 캐시 키 재사용(추가 로드 0)
  const { data: diagnostics } = useQuery({
    queryKey: ["stage-rec-diagnostics", userId],
    queryFn: async () =>
      (await diagnosticResultsApi.listByUser(userId as string)).data as DiagnosticResult[],
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const { activityByDay } = useGradActivityData(userId);

  const suggestion = useMemo(
    () => pickInactivityCoaching(activityByDay),
    [activityByDay],
  );

  if (!userId) return null;
  // 신입에게는 비활성 잔소리 미노출 (diagnostics 로딩 중이면 가입일 기준만 적용)
  if (getMemberStage(user, diagnostics?.length) === "newcomer") return null;
  if (!suggestion) return null;

  return (
    <Link
      href={suggestion.href}
      className="group flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
        <Sprout size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          {suggestion.area} 코칭
        </p>
        <p className="mt-0.5 text-sm text-foreground/90">{suggestion.message}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-emerald-700">
        {suggestion.cta}
        <ArrowRight size={12} aria-hidden="true" />
      </span>
    </Link>
  );
}
