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

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, PartyPopper, Check, Flame } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { useGradActivityData } from "@/features/mypage/useGradActivityData";
import { weeklyGoalsApi, weeklyGoalRecordsApi } from "@/lib/bkend";
import {
  WEEKLY_GOAL_PRESETS,
  WEEKLY_GOAL_CHANNELS,
  currentWeekKey,
  addWeeks,
  countGoalDaysInWeek,
  judgeWeeklyGoal,
  computeGoalStreak,
  recentWeekBars,
} from "@/lib/weekly-goal";
import type { WeeklyGoalChannel } from "@/types/weekly-goal";
import { SEMANTIC } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * 주차 마감 기록(weekly_goal_records) 축적 위에 연속·추세·회고를 보여주는 공용 푸터 (v6-H3).
 * 두 브랜치(목표 설정됨 / 미설정) 모두에서 동일하게 렌더된다. 자체 쿼리로 독립.
 * 기록이 없으면(목표를 세운 적 없음) 아무것도 렌더하지 않는다.
 */
function GoalHistory({ userId, prevWeekKey }: { userId: string; prevWeekKey: string }) {
  const qc = useQueryClient();
  const { data: records } = useQuery({
    queryKey: ["weekly-goal-records", userId],
    queryFn: () => weeklyGoalRecordsApi.listByUser(userId, 12),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const prevRecord = useMemo(
    () => records?.find((r) => r.weekKey === prevWeekKey) ?? null,
    [records, prevWeekKey],
  );
  const [reflectionDraft, setReflectionDraft] = useState<string | null>(null);
  const reflection = reflectionDraft ?? prevRecord?.reflection ?? "";

  const saveReflection = useMutation({
    mutationFn: (text: string) => weeklyGoalRecordsApi.saveReflection(userId, prevWeekKey, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weekly-goal-records", userId] }),
  });

  if (!records || records.length === 0) return null;

  const streak = computeGoalStreak(records, prevWeekKey);
  const bars = recentWeekBars(records, prevWeekKey, 6);

  const cellClass = (met: boolean | null) =>
    met === true ? "bg-primary" : met === false ? "bg-muted-foreground/30" : "bg-muted";
  const cellLabel = (met: boolean | null) =>
    met === true ? "달성" : met === false ? "미달" : "목표 없음";

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center gap-2">
        {streak >= 2 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
            <Flame size={12} className="text-primary" aria-hidden="true" />
            연속 달성 {streak}주
          </span>
        )}
        <div
          className="ml-auto flex items-end gap-1"
          role="img"
          aria-label={`최근 6주 목표 달성 추세: ${bars.map((b) => cellLabel(b.met)).join(", ")}`}
        >
          {bars.map((b) => (
            <span
              key={b.weekKey}
              title={`${b.weekKey} · ${cellLabel(b.met)}`}
              className={cn("h-4 w-2 rounded-sm", cellClass(b.met))}
            />
          ))}
        </div>
      </div>

      {prevRecord && (
        <div className="mt-2.5">
          <label htmlFor="weekly-goal-reflection" className="text-xs font-medium text-muted-foreground">
            지난주 회고 한 줄
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="weekly-goal-reflection"
              type="text"
              value={reflection}
              maxLength={140}
              onChange={(e) => setReflectionDraft(e.target.value)}
              placeholder="예: 논문 3편 완독! 다음 주도 이어가자"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => saveReflection.mutate(reflection)}
              disabled={saveReflection.isPending || reflection.trim().length === 0}
              className="shrink-0 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
            >
              {saveReflection.isSuccess && reflectionDraft === null ? "저장됨" : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`이번 주 ${preset.area} 목표 진행률`}
          aria-valuemin={0}
          aria-valuemax={j.target}
          aria-valuenow={count}
          aria-valuetext={`${j.target}일 중 ${count}일 달성`}
        >
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

        <GoalHistory userId={userId} prevWeekKey={prevWeekKey} />
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

      <GoalHistory userId={userId} prevWeekKey={prevWeekKey} />
    </div>
  );
}
