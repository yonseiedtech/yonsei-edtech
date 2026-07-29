"use client";

/**
 * WeeklyReturnNudgeCard — 주간 재방문 리듬 & 복귀 넛지 (성장 백로그 v19 §C1, in-app 전용).
 *
 * 재학연구생의 "이번 주 재방문 리듬"이 끊기기 직전일 때, 로그인 대시보드에서
 * 부드러운(비압박) 복귀 넛지를 1건 노출한다. 이메일/푸시는 범위 밖(⚠️X3 blocked) — in-app 전용.
 *
 * 기존 위젯과 역할 구분(중복 아님):
 *  - InactivityCoachingCard(M4): 최근 14일 완전 비활성 코칭 — "멈춘 습관".
 *  - LearningStreak 복구 넛지(justBroke): 지난주 통째 공백으로 "이미 끊긴" 뒤의 복구.
 *    (게다가 대시보드에선 compact=월별뷰라 해당 넛지 자체가 렌더되지 않는다.)
 *  - WeeklyGoalCard(M1): 회원이 스스로 세우는 능동적 "주간 목표" 루프.
 *  - 본 카드(C1): 직전 주까지 연속(≥2주)이 살아 있으나 이번 주 아직 활동 0인
 *    "끊기기 직전" 예방 — 위 셋이 비우는 갭을 채운다.
 *
 * 노출 게이트(graceful·페르소나 분리):
 *  - 로그인 + 비신입(가입 7일 초과, 신입은 B1 담당) + 졸업생 제외
 *    + 이번 주 리듬 "위험"(assessWeeklyReturnRisk) + 사용자 닫음 아님.
 *  - 자동 숨김: 위험 아님 / 신입 / 졸업생 / 이번 주 얼림 / 닫음 → null 렌더.
 *  - 닫기: per-user + 이번 주차(weekKey) 스코프 localStorage — 다음 주엔 다시 노출.
 *  - useSyncExternalStore 로 SSR-safe(FirstStepsMissionCard 패턴 재사용).
 *
 * 판정은 잔디 집계(useGradActivityData)만 읽어 파생 — 신규 컬렉션·저장 없음.
 * 대시보드 상주 InactivityCoaching/WeeklyGoal 과 동일 캐시 키(useGradActivityData)를
 * 공유하므로 추가 read 를 만들지 않는다(v19 §4 "상태 도달" 원칙).
 */

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Sprout, ArrowRight, X } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { useGradActivityData } from "@/features/mypage/useGradActivityData";
import { isAlumni } from "@/features/dashboard/widget-visibility";
import { daysSinceJoinKst } from "@/lib/newcomer-sequence";
import { currentWeekKey } from "@/lib/weekly-goal";
import { parseFreezes, frozenWeekSet } from "@/lib/streak-freeze";
import { assessWeeklyReturnRisk } from "@/lib/weekly-return";

const DISMISS_KEY_PREFIX = "yedu_weekly_return_nudge_dismissed";

/** 신입 창(가입 7일 이내)은 B1(FirstStepsMissionCard) 담당 — 중복 회피. */
const NEWCOMER_DAYS = 7;

/** 복귀 CTA — 가장 가벼운 첫 걸음(논문 읽기 타이머). FirstStepsMissionCard 와 동일 딥링크. */
const CTA_HREF = "/mypage/research?tab=reading";

/** localStorage 1개 키를 useSyncExternalStore 로 구독 — SSR 안전 + 탭 간 동기화. */
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

export default function WeeklyReturnNudgeCard({
  onDismiss: onSlotDismiss,
}: {
  /** CoachingSlot(P1-1) 제어 시 — 닫으면 슬롯이 다음 우선순위 넛지로 넘어가도록 통지. */
  onDismiss?: () => void;
} = {}) {
  const { user } = useAuthStore();
  const userId = user?.id;

  // 계정 나이 — daysSinceJoinKst 는 KST 기준 순수 유틸(내부 now 기본값 사용,
  // 렌더 경로에서 직접 Date 호출 없음 → react-hooks/purity 위반 회피). FirstStepsMissionCard 동일 패턴.
  const daysSinceJoin = useMemo(() => {
    const createdAt = (user as { createdAt?: string | null } | null)?.createdAt ?? null;
    return daysSinceJoinKst(createdAt);
  }, [user]);
  // 비신입: 가입 7일 초과. 판정 불가(null) 는 기존 회원으로 간주(노출 허용). 신입은 B1 담당.
  const isNewcomer =
    daysSinceJoin != null && daysSinceJoin >= 0 && daysSinceJoin <= NEWCOMER_DAYS;

  const alumni = user ? isAlumni(user) : false;
  const active = !!userId && !isNewcomer && !alumni;

  // 닫기 키는 이번 주차 스코프 — 다음 주엔 새 키가 되어 다시 노출 가능.
  const weekKey = useMemo(() => currentWeekKey(), []);
  const dismissedKey = userId
    ? `${DISMISS_KEY_PREFIX}.${userId}.${weekKey}`
    : `${DISMISS_KEY_PREFIX}.__none__`;
  const dismissedStored = useLocalBoolean(dismissedKey);
  const [dismissedOverride, setDismissedOverride] = useState(false);
  const dismissed = dismissedStored || dismissedOverride;

  // 이번 주 "연구 쉼표"(얼림)면 의도적 휴식 — 판정 유틸에 전달해 넛지 억제.
  const frozenWeeks = useMemo(
    () =>
      frozenWeekSet(
        parseFreezes((user as { streakFreezes?: unknown } | null)?.streakFreezes),
      ),
    [user],
  );

  // 잔디 집계 — InactivityCoaching/WeeklyGoal 과 동일 캐시 키(useGradActivityData) 공유(추가 read 0).
  // 비활성(신입·졸업·미로그인) 상태에선 undefined 로 쿼리 자체를 실행하지 않음.
  const { scoresByDay, isLoading } = useGradActivityData(active ? userId : undefined);

  const risk = useMemo(
    () => assessWeeklyReturnRisk(scoresByDay, frozenWeeks),
    [scoresByDay, frozenWeeks],
  );

  const handleDismiss = useCallback(() => {
    setDismissedOverride(true);
    try {
      window.localStorage.setItem(dismissedKey, "1");
    } catch {
      // ignore
    }
    onSlotDismiss?.();
  }, [dismissedKey, onSlotDismiss]);

  // 노출 게이트: 로그인 + 비신입 + 비졸업 + 로딩 완료 + 이번 주 위험 + 미닫힘.
  if (!user || !active || isLoading || dismissed) return null;
  if (!risk.atRisk) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-info/30 bg-gradient-to-br from-info/10 to-primary/5 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500 sm:p-5">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="이번 주 복귀 넛지 닫기"
        className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X size={14} aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/15 text-info">
          <Sprout size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-info">이번 주 다시 시작</p>
          <h2 className="mt-0.5 text-sm font-bold tracking-tight text-foreground sm:text-base">
            {user.name}님, 이번 주 15분만 다시 시작해볼까요?
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {risk.priorStreakWeeks}주째 이어온 연구 리듬이에요. 이번 주 한 번의 기록이면 흐름이
            그대로 이어집니다.
          </p>
        </div>
      </div>

      <Link
        href={CTA_HREF}
        className="mt-3.5 flex items-center justify-between gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-label="논문 읽기 타이머로 이번 주 다시 시작하기"
      >
        <span className="min-w-0 truncate">논문 읽기 타이머로 15분 시작</span>
        <ArrowRight size={15} className="shrink-0" aria-hidden="true" />
      </Link>
    </div>
  );
}
