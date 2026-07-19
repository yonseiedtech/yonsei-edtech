"use client";

/**
 * NewcomerProgressWidget — 신입 첫 2주 진행 위젯 (v8-H5).
 *
 * 현재 학기 코호트 + 가입 14일 이내 신입에게 첫 2주 시퀀스(프로필→온보딩→진단→아카이브)
 * 진행 단계를 한눈에 보여준다. 완료 판정은 M2 cron 스킵 조건과 동일한 순수 유틸
 * (newcomer-sequence.ts)을 재사용해 서버 넛지와 어긋나지 않게 한다.
 *
 * 미노출: 신입 창(14일) 밖 · 코호트 미상 · 4단계 전부 완료 시 → null 렌더.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Sparkles, ArrowRight } from "lucide-react";
import WidgetCard from "@/components/ui/widget-card";
import { useAuthStore } from "@/features/auth/auth-store";
import { useUserDiagnostics } from "@/features/dashboard/useUserDiagnostics";
import { archiveFavoritesApi, guideProgressApi } from "@/lib/bkend";
import { cohortKeyOf, currentSemesterKey } from "@/lib/semester";
import {
  isNewcomerWindow,
  isProfileComplete,
  judgeNewcomerSteps,
} from "@/lib/newcomer-sequence";

export default function NewcomerProgressWidget() {
  const { user } = useAuthStore();
  const userId = user?.id;

  // 신입 창(현재 학기 코호트 + 14일 이내) 여부 — 동기 계산(추가 fetch 전 게이트)
  const windowOpen = useMemo(() => {
    if (!user) return false;
    return isNewcomerWindow(
      cohortKeyOf(user),
      currentSemesterKey(),
      (user as { createdAt?: string | null }).createdAt ?? null,
    );
  }, [user]);

  // D+3 온보딩 시작: guide_progress 중 completedItems 1건+ (본인 문서만 read)
  const { data: onboardingStarted } = useQuery({
    queryKey: ["newcomer-onboarding-started", userId],
    queryFn: async () => {
      const docs = await guideProgressApi.listByUser(userId as string);
      return docs.some((d) => Object.keys(d.completedItems ?? {}).length > 0);
    },
    enabled: !!userId && windowOpen,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // D+7 진단 완료: 진단 결과 1건+ (대시보드 공통 훅 재사용 — read 공유)
  const { data: diagnosticDone } = useUserDiagnostics(
    windowOpen ? userId : undefined,
    (list) => list.length > 0,
  );

  // D+10 아카이브 즐겨찾기 1건+
  const { data: archiveFavorited } = useQuery({
    queryKey: ["newcomer-archive-favorited", userId],
    queryFn: async () => {
      const res = await archiveFavoritesApi.listByUser(userId as string);
      return (res.data ?? []).length > 0;
    },
    enabled: !!userId && windowOpen,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const steps = useMemo(
    () =>
      judgeNewcomerSteps({
        profileComplete: user ? isProfileComplete(user) : false,
        onboardingStarted: onboardingStarted === true,
        diagnosticDone: diagnosticDone === true,
        archiveFavorited: archiveFavorited === true,
      }),
    [user, onboardingStarted, diagnosticDone, archiveFavorited],
  );

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = doneCount >= total;

  if (!user || !windowOpen) return null;
  // 전 단계 완료 시 미노출
  if (allDone) return null;

  const pct = Math.round((doneCount / total) * 100);
  const nextStep = steps.find((s) => !s.done);

  return (
    <WidgetCard
      title="신입 첫 2주 여정"
      icon={Sparkles}
      semantic="info"
      actions={
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {doneCount}/{total}
        </span>
      }
    >
      <div className="mt-3" aria-label={`첫 2주 진행률 ${pct}%`}>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          가입 첫 2주 동안 이 단계를 밟으면 학회 활동에 빠르게 적응할 수 있어요.
        </p>
      </div>

      <ul className="mt-4 grid gap-1 sm:grid-cols-2">
        {steps.map((s) => {
          const StatusIcon = s.done ? CheckCircle2 : Circle;
          return (
            <li key={s.key}>
              {s.done ? (
                <div
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground"
                  aria-label={`${s.label} 완료`}
                >
                  <StatusIcon size={16} className="shrink-0 text-success" aria-hidden />
                  <span className="truncate line-through">{s.label}</span>
                </div>
              ) : (
                <Link
                  href={s.href}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/40"
                  aria-label={`${s.label} 시작하기`}
                >
                  <StatusIcon size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate font-medium">{s.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {nextStep && (
        <div className="mt-3 flex justify-end">
          <Link href={nextStep.href}>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              다음 단계: {nextStep.label}
              <ArrowRight size={12} aria-hidden />
            </span>
          </Link>
        </div>
      )}

      <p className="mt-3 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
        네 단계를 마치면 가입 2주째 “첫 2주 회고”로 여정을 돌아봐요.
      </p>
    </WidgetCard>
  );
}
