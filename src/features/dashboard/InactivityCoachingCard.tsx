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
import { Sprout, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { useUserDiagnostics } from "@/features/dashboard/useUserDiagnostics";
import { getMemberStage } from "@/lib/member-stage";
import { useGradActivityData } from "@/features/mypage/useGradActivityData";
import { pickInactivityCoaching } from "@/lib/inactivity-coaching";

export default function InactivityCoachingCard() {
  const { user } = useAuthStore();
  const userId = user?.id;

  // 진단 이력 — 공통 useUserDiagnostics 훅으로 대시보드 전 위젯과 캐시 공유(추가 로드 0)
  const { data: diagnostics } = useUserDiagnostics(userId);

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
      className="group flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 shadow-sm transition-colors hover:border-success/50 hover:bg-success/15"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
        <Sprout size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-success">
          {suggestion.area} 코칭
        </p>
        <p className="mt-0.5 text-sm text-foreground/90">{suggestion.message}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-success/90">
        {suggestion.cta}
        <ArrowRight size={12} aria-hidden="true" />
      </span>
    </Link>
  );
}
