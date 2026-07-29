"use client";

/**
 * CoachingSlot — 코칭/넛지 단일 슬롯 오케스트레이터 (대시보드 개선 P1-1).
 *
 * 문제: 고정 스택에 6종 넛지(InactivityCoaching·WeeklyGoal·WeeklyReturnNudge·
 *  ThesisCompletionNudge·Kudos·StageRec)가 개별 나열되어 조건이 겹치면 2~3개가
 *  동시에 세로로 쌓였다(넛지 피로 + 첫인상 과밀의 실제 주범).
 *
 * 해결: 6종을 이 단일 컨테이너로 감싸 "시점당 우선순위 최고 non-null 1개"만 렌더한다.
 *  - 방식: predicate(활성 판정) 기반 선택 — 각 후보를 고정 순서의 `useXxxCandidate()`
 *    훅으로 등록하고(hooks 순서 고정 → rules-of-hooks 안전), 각 훅이 `{ active, node }`
 *    를 반환한다. 슬롯은 우선순위 배열에서 첫 `active` 후보의 `node` 만 출력한다.
 *  - 활성 판정은 각 카드가 읽는 동일 데이터/쿼리 키(useGradActivityData·useUserDiagnostics·
 *    useGraduationSummary·cohort kudos 훅)와 동일 순수 판정(assessWeeklyReturnRisk·
 *    assessThesisRetention·pickInactivityCoaching 등)을 재사용 → 추가 read 0.
 *    (기존에도 6장이 empty:hidden 로 항상 마운트되어 동일 쿼리를 이미 실행했다.)
 *  - 카드 내부 렌더/판정 로직은 무변경. 슬롯은 "선택"만 추가한다.
 *
 * 우선순위(제안서 §3 + WeeklyGoal 예외):
 *   1) ThesisCompletion(이탈 임박)  2) InactivityCoaching(14일 정체)
 *   3) WeeklyReturnNudge(끊기기 직전)  4) StageRec(추천)  5) Kudos(사회적)
 *   6) WeeklyGoal(능동 목표) — "항상 렌더" 성격이라 §3 명시대로 최하위 fallback 으로 강등
 *      (상위 후보가 활성일 땐 억제, 아무것도 없을 때만 노출 → StageRec/Kudos 도달성 보존).
 *
 * 사용자 제어권: 각 카드의 per-user 닫기(localStorage)·페르소나 게이트는 그대로 유지.
 *  닫힌/비활성 후보는 non-active 로 취급 → 닫으면 그 자리에 하위 우선순위 넛지가 뜬다.
 *  (C1/C2 는 카드의 닫기 버튼이 onDismiss 로 슬롯 상태를 갱신해 즉시 다음 후보로 넘어감.)
 */

import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import { useUserDiagnostics } from "@/features/dashboard/useUserDiagnostics";
import { useGradActivityData } from "@/features/mypage/useGradActivityData";
import { useGraduationSummary } from "@/features/mypage/useGraduationSummary";
import { useCohortPeers } from "@/features/kudos/useCohortPeers";
import { useCohortKudos } from "@/features/kudos/useCohortKudos";
import { useReceivedKudos } from "@/features/kudos/useReceivedKudos";
import { getMemberStage } from "@/lib/member-stage";
import { isAlumni } from "@/features/dashboard/widget-visibility";
import { daysSinceJoinKst } from "@/lib/newcomer-sequence";
import { currentWeekKey } from "@/lib/weekly-goal";
import { parseFreezes, frozenWeekSet } from "@/lib/streak-freeze";
import { assessWeeklyReturnRisk } from "@/lib/weekly-return";
import {
  assessThesisRetention,
  isThesisStageSemester,
  THESIS_RESEARCH_LABELS,
} from "@/lib/thesis-retention";
import { getEffectiveSemesterCount } from "@/lib/interview-target";
import { JOURNEY_STAGES } from "@/features/research/ThesisJourney";
import { pickInactivityCoaching } from "@/lib/inactivity-coaching";
import InactivityCoachingCard from "@/features/dashboard/InactivityCoachingCard";
import WeeklyGoalCard from "@/features/dashboard/WeeklyGoalCard";
import WeeklyReturnNudgeCard from "@/features/dashboard/WeeklyReturnNudgeCard";
import ThesisCompletionNudgeCard from "@/features/dashboard/ThesisCompletionNudgeCard";
import StageRecommendationPanel from "@/features/dashboard/StageRecommendationPanel";
import KudosWidget from "@/features/dashboard/KudosWidget";

interface Candidate {
  active: boolean;
  node: ReactNode;
}

/** 신입 창(가입 7일 이내)은 B1(FirstStepsMissionCard) 담당 — C1 과 동일 상수. */
const C1_NEWCOMER_DAYS = 7;
const C1_DISMISS_PREFIX = "yedu_weekly_return_nudge_dismissed";
const C2_DISMISS_PREFIX = "yedu_thesis_completion_nudge_dismissed";

/** localStorage 1개 키를 useSyncExternalStore 로 구독 — SSR 안전 + 탭 간 동기화 (카드와 동일 패턴). */
function readLocalRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function useLocalBoolean(key: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === "undefined") return () => {};
      const onStorage = (e: StorageEvent) => {
        if (e.key === key || e.key === null) cb();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
    [key],
  );
  const getSnapshot = useCallback(() => readLocalRaw(key) === "1", [key]);
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── (1) ThesisCompletionNudgeCard — 논문 완주 임박자 이탈 방지 (C2) ──
function useThesisCompletionCandidate(): Candidate {
  const { user } = useAuthStore();
  const userId = user?.id;

  const inThesisStage = useMemo(
    () => (user ? isThesisStageSemester(getEffectiveSemesterCount(user)) : false),
    [user],
  );
  const alumni = user ? isAlumni(user) : false;
  const active = !!userId && !alumni && inThesisStage;

  const { summary, remainingCount } = useGraduationSummary(active ? userId : undefined);
  const graduationMet = active && summary != null && remainingCount === 0;

  const { activityByDay, isLoading } = useGradActivityData(active ? userId : undefined);

  const researchDays = useMemo(() => {
    const set = new Set<string>();
    for (const [ymd, labels] of activityByDay) {
      for (const label of labels.keys()) {
        if (THESIS_RESEARCH_LABELS.has(label)) {
          set.add(ymd);
          break;
        }
      }
    }
    return set;
  }, [activityByDay]);

  const state = useMemo(
    () => assessThesisRetention(researchDays, graduationMet),
    [researchDays, graduationMet],
  );

  const weekKey = useMemo(() => currentWeekKey(), []);
  const scope = state.phase === "stall" ? weekKey : "done";
  const dismissedKey = userId
    ? `${C2_DISMISS_PREFIX}.${userId}.${state.phase}.${scope}`
    : `${C2_DISMISS_PREFIX}.__none__`;
  const dismissedStored = useLocalBoolean(dismissedKey);
  const [dismissedOverride, setDismissedOverride] = useState(false);
  const dismissed = dismissedStored || dismissedOverride;
  const onDismiss = useCallback(() => setDismissedOverride(true), []);

  const isActive =
    !!user && active && !isLoading && !dismissed && state.phase !== "hidden";

  return { active: isActive, node: <ThesisCompletionNudgeCard onDismiss={onDismiss} /> };
}

// ── (2) InactivityCoachingCard — 잔디 비활성 영역 자동 코칭 (M4) ──
function useInactivityCandidate(): Candidate {
  const { user } = useAuthStore();
  const userId = user?.id;

  const { data: diagnostics } = useUserDiagnostics(userId);
  const { activityByDay } = useGradActivityData(userId);
  const suggestion = useMemo(
    () => pickInactivityCoaching(activityByDay),
    [activityByDay],
  );

  const isNewcomer = user
    ? getMemberStage(user, diagnostics?.length) === "newcomer"
    : true;
  const isActive = !!userId && !isNewcomer && !!suggestion;

  return { active: isActive, node: <InactivityCoachingCard /> };
}

// ── (3) WeeklyReturnNudgeCard — 주간 재방문 리듬 & 복귀 넛지 (C1) ──
function useWeeklyReturnCandidate(): Candidate {
  const { user } = useAuthStore();
  const userId = user?.id;

  const daysSinceJoin = useMemo(() => {
    const createdAt = (user as { createdAt?: string | null } | null)?.createdAt ?? null;
    return daysSinceJoinKst(createdAt);
  }, [user]);
  const isNewcomer =
    daysSinceJoin != null && daysSinceJoin >= 0 && daysSinceJoin <= C1_NEWCOMER_DAYS;
  const alumni = user ? isAlumni(user) : false;
  const active = !!userId && !isNewcomer && !alumni;

  const weekKey = useMemo(() => currentWeekKey(), []);
  const dismissedKey = userId
    ? `${C1_DISMISS_PREFIX}.${userId}.${weekKey}`
    : `${C1_DISMISS_PREFIX}.__none__`;
  const dismissedStored = useLocalBoolean(dismissedKey);
  const [dismissedOverride, setDismissedOverride] = useState(false);
  const dismissed = dismissedStored || dismissedOverride;
  const onDismiss = useCallback(() => setDismissedOverride(true), []);

  const frozenWeeks = useMemo(
    () =>
      frozenWeekSet(
        parseFreezes((user as { streakFreezes?: unknown } | null)?.streakFreezes),
      ),
    [user],
  );

  const { scoresByDay, isLoading } = useGradActivityData(active ? userId : undefined);

  const risk = useMemo(
    () => assessWeeklyReturnRisk(scoresByDay, frozenWeeks),
    [scoresByDay, frozenWeeks],
  );

  const isActive =
    !!user && active && !isLoading && !dismissed && risk.atRisk;

  return { active: isActive, node: <WeeklyReturnNudgeCard onDismiss={onDismiss} /> };
}

// ── (4) StageRecommendationPanel — 이번 학기 추천 한 걸음 ──
function useStageRecCandidate(): Candidate {
  const { user } = useAuthStore();

  const stage = useMemo(() => {
    if (!user) return null;
    const override = user.thesisJourneyStage;
    if (typeof override === "number" && override >= 1 && override <= 5) {
      return JOURNEY_STAGES[override - 1];
    }
    const sem = getEffectiveSemesterCount(user);
    if (sem == null) return null;
    return JOURNEY_STAGES[Math.min(Math.max(sem, 1), 5) - 1];
  }, [user]);

  return {
    active: !!user && !!stage,
    node: user ? <StageRecommendationPanel user={user} /> : null,
  };
}

// ── (5) KudosWidget — 이번 주 응원 ──
function useKudosCandidate(): Candidate {
  const { user } = useAuthStore();
  const { peers } = useCohortPeers(user);
  const { kudosTargets } = useCohortKudos(user, peers);
  const { thisWeekCount } = useReceivedKudos(user?.id);

  const isActive = !!user && (thisWeekCount > 0 || kudosTargets.length > 0);
  return { active: isActive, node: <KudosWidget /> };
}

// ── (6) WeeklyGoalCard — 주간 학습 목표(fallback, 항상 렌더) ──
function useWeeklyGoalCandidate(): Candidate {
  const { user } = useAuthStore();
  // 로딩 게이트는 카드가 자체 처리(로딩 중 null) — 슬롯에선 로그인 시 항상 fallback 후보.
  return { active: !!user, node: <WeeklyGoalCard /> };
}

export default function CoachingSlot() {
  const { user } = useAuthStore();

  // hooks 는 항상 고정 순서로 호출(rules-of-hooks) — 우선순위 판정은 아래 배열에서.
  const thesisCompletion = useThesisCompletionCandidate();
  const inactivity = useInactivityCandidate();
  const weeklyReturn = useWeeklyReturnCandidate();
  const stageRec = useStageRecCandidate();
  const kudos = useKudosCandidate();
  const weeklyGoal = useWeeklyGoalCandidate();

  if (!user) return null;

  const winner = [
    thesisCompletion,
    inactivity,
    weeklyReturn,
    stageRec,
    kudos,
    weeklyGoal,
  ].find((c) => c.active);

  return winner ? <>{winner.node}</> : null;
}
