"use client";

/**
 * WeeklyGoalCard — 주간 학습 목표 설정·달성 루프 (service-enhancement-plan-v5 M1).
 *
 * 비활성 코칭(InactivityCoachingCard)이 "멈춘 습관 1건"만 제안하던 것을,
 * 회원이 스스로 세우는 "이번 주 목표 → 잔디 자동 달성 판정 → 주말 회고" 루프로
 * 확장한다. 코칭 카드의 형제 위젯으로, 활동이 고른 회원도 목표를 세울 수 있다.
 *
 *  - 데이터: useGradActivityData(잔디 집계 재사용) — 달성 판정에 추가 fetch 0.
 *  - 저장  : weekly_goals 컬렉션, 결정적 id `${userId}_${weekKey}` (1주 1건).
 *  - 판정  : countGoalDaysInWeek(순수 함수) — 해당 주 채널 활동 "일수".
 *  - 상태  : 미설정 → 프리셋 3종 CTA(+지난주 회고 1줄) / 설정됨 → 진행 바·달성 축하.
 *  - 색상  : 시맨틱 토큰(SEMANTIC)만 사용(신규 파일 raw 팔레트 금지).
 */

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, PartyPopper, Check } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { useGradActivityData } from "@/features/mypage/useGradActivityData";
import { weeklyGoalsApi } from "@/lib/bkend";
import {
  WEEKLY_GOAL_PRESETS,
  WEEKLY_GOAL_CHANNELS,
  currentWeekKey,
  addWeeks,
  countGoalDaysInWeek,
  judgeWeeklyGoal,
} from "@/lib/weekly-goal";
import type { WeeklyGoalChannel } from "@/types/weekly-goal";
import { SEMANTIC } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function WeeklyGoalCard() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const qc = useQueryClient();

  const weekKey = useMemo(() => currentWeekKey(), []);
  const prevWeekKey = useMemo(() => addWeeks(weekKey, -1), [weekKey]);

  const { activityByDay, isLoading: activityLoading } = useGradActivityData(userId);

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ["weekly-goal", userId, weekKey],
    queryFn: async () => {
      const [current, previous] = await Promise.all([
        weeklyGoalsApi.getByKey(userId as string, weekKey),
        weeklyGoalsApi.getByKey(userId as string, prevWeekKey),
      ]);
      return { current, previous };
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const setGoal = useMutation({
    mutationFn: (channel: WeeklyGoalChannel) =>
      weeklyGoalsApi.set(userId as string, weekKey, channel, WEEKLY_GOAL_PRESETS[channel].target),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weekly-goal", userId, weekKey] }),
  });

  // 로딩 중에는 미노출 — 데이터 확정 후에만 나타나 깜빡임(flash) 방지.
  if (!userId) return null;
  if (activityLoading || goalsLoading) return null;

  const current = goals?.current ?? null;
  const previous = goals?.previous ?? null;

  // ── 목표 설정됨 → 진행 바 + 달성 축하 ──
  if (current) {
    const preset = WEEKLY_GOAL_PRESETS[current.channel];
    const count = countGoalDaysInWeek(activityByDay, current.channel, weekKey);
    const j = judgeWeeklyGoal(current.target, count);
    const tone = j.achieved ? SEMANTIC.success : SEMANTIC.info;

    return (
      <div className={cn("rounded-2xl border p-4 shadow-sm", tone.bg, tone.border)}>
        <div className="flex items-center gap-2">
          {j.achieved ? (
            <PartyPopper size={16} className={tone.accent} aria-hidden="true" />
          ) : (
            <Target size={16} className={tone.accent} aria-hidden="true" />
          )}
          <p className={cn("text-xs font-semibold", tone.text)}>
            이번 주 목표 · {preset.area}
          </p>
          <span
            className={cn(
              "ml-auto rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
              tone.chip,
            )}
          >
            {count}/{j.target}일
          </span>
        </div>

        {/* 진행 바 */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${Math.round(j.ratio * 100)}%` }}
          />
        </div>

        <p className={cn("mt-2 text-sm", tone.textMuted)}>
          {j.achieved ? (
            <span className="inline-flex items-center gap-1">
              <Check size={14} aria-hidden="true" />
              목표 달성! 이번 주 {preset.area} {j.target}일을 채웠어요 🎉
            </span>
          ) : (
            <>
              {preset.area} {j.target}일 중 <b>{count}일</b> 달성 — 남은 {j.target - count}일,
              오늘 이어가 볼까요?
            </>
          )}
        </p>
      </div>
    );
  }

  // ── 미설정 → 지난주 회고 1줄(있으면) + 프리셋 3종 CTA ──
  let retro: string | null = null;
  if (previous) {
    const prevPreset = WEEKLY_GOAL_PRESETS[previous.channel];
    const prevCount = countGoalDaysInWeek(activityByDay, previous.channel, prevWeekKey);
    const pj = judgeWeeklyGoal(previous.target, prevCount);
    retro = pj.achieved
      ? `지난주 ${prevPreset.area} 목표 달성! (${prevCount}/${pj.target}일) 🎉 이번 주도 이어가요.`
      : `지난주 ${prevPreset.area} 목표는 ${prevCount}/${pj.target}일. 이번 주 다시 도전해 볼까요?`;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Target size={16} className="text-primary" aria-hidden="true" />
        <p className="text-xs font-semibold text-foreground">이번 주 목표 세우기</p>
      </div>
      {retro ? (
        <p className="mt-1.5 text-sm text-muted-foreground">{retro}</p>
      ) : (
        <p className="mt-1.5 text-sm text-muted-foreground">
          작은 목표 하나가 꾸준함을 만듭니다. 이번 주 도전할 습관을 골라보세요.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {WEEKLY_GOAL_CHANNELS.map((channel) => {
          const preset = WEEKLY_GOAL_PRESETS[channel];
          return (
            <button
              key={channel}
              type="button"
              onClick={() => setGoal.mutate(channel)}
              disabled={setGoal.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
