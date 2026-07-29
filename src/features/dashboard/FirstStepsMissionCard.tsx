"use client";

/**
 * FirstStepsMissionCard — 신입 First-7-Days 핵심행동 유도 (성장 백로그 v19 §B1).
 *
 * 가입 직후 정보 과부하 대신 첫 성공 경험("아하 모먼트")까지의 도달을 앞당기기 위해,
 * 활성화의 3핵심행동을 단일 미션 카드 하나로 유도한다:
 *   1) 연구 준비도 진단 1회   → diagnostic_results 1건+ (useUserDiagnostics 공통 훅 재사용)
 *   2) 러닝 가이드 1개 살펴보기 → guide_progress completedItems 1건+ (NewcomerProgressWidget 판정 재사용)
 *   3) 논문 읽기 타이머 1회    → paper_reading_logs 1건+ (paperReadingLogsApi 재사용)
 *
 * 노출 조건(정보 과부하 방지):
 *  - 로그인 + 계정 생성 7일 이내(daysSinceJoinKst) + 졸업생 제외.
 *  - 3핵심행동 모두 완료 또는 7일 경과 시 null 렌더로 자동 숨김(graceful).
 *  - 사용자가 닫으면 localStorage 로 기억(per-user, SSR 안전).
 *
 * 판정은 전부 기존 데이터 읽기 재사용(DB/rules/컬렉션 무변경). 진단·가이드 쿼리는
 * 대시보드 상주 위젯과 캐시 키를 공유해 추가 read 를 만들지 않고, 읽기 로그만 신입(7일 이내)
 * 한정으로 1회 읽는다.
 */

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Rocket,
  Activity,
  BookOpen,
  Timer,
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { useUserDiagnostics } from "@/features/dashboard/useUserDiagnostics";
import { hasGuideStarted } from "@/features/dashboard/journey-stages";
import { isAlumni } from "@/features/dashboard/widget-visibility";
import { daysSinceJoinKst } from "@/lib/newcomer-sequence";
import { guideProgressApi, paperReadingLogsApi } from "@/lib/bkend";

const DISMISS_KEY_PREFIX = "yedu_first_steps_mission_dismissed";

/** 신입 First-7-Days 창(가입 7일 이내). */
const FIRST_WEEK_DAYS = 7;

interface MissionStep {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  completed: boolean;
}

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

export default function FirstStepsMissionCard() {
  const { user } = useAuthStore();
  const userId = user?.id;

  // 계정 나이(가입 후 경과 일수) — daysSinceJoinKst 는 KST 기준 순수 유틸(내부 now 기본값 사용,
  // 렌더 경로에서 직접 Date 호출 없음 → react-hooks/purity 위반 회피). NewcomerProgressWidget 와 동일 패턴.
  const daysSinceJoin = useMemo(() => {
    const createdAt = (user as { createdAt?: string | null } | null)?.createdAt ?? null;
    return daysSinceJoinKst(createdAt);
  }, [user]);
  const isNewcomer =
    daysSinceJoin != null && daysSinceJoin >= 0 && daysSinceJoin <= FIRST_WEEK_DAYS;

  // 졸업생은 진단·가이드·읽기 여정 대상이 아니므로 제외. read 게이트로도 활용.
  const alumni = user ? isAlumni(user) : false;
  const active = !!userId && isNewcomer && !alumni;

  const dismissedKey = userId
    ? `${DISMISS_KEY_PREFIX}.${userId}`
    : `${DISMISS_KEY_PREFIX}.__none__`;
  const dismissedStored = useLocalBoolean(dismissedKey);
  const [dismissedOverride, setDismissedOverride] = useState(false);
  const dismissed = dismissedStored || dismissedOverride;

  // (1) 진단 완료 — 대시보드 공통 훅 재사용(캐시 공유, 추가 read 0)
  const { data: diagnosisDone = false } = useUserDiagnostics<boolean>(
    active ? userId : undefined,
    (list) => list.length > 0,
  );

  // (2) 가이드 학습 시작 — NewcomerProgressWidget 과 동일 쿼리 키·판정(캐시 공유, 추가 read 0)
  const { data: guideStarted = false } = useQuery({
    queryKey: ["newcomer-onboarding-started", userId],
    queryFn: async () => {
      const docs = await guideProgressApi.listByUser(userId as string);
      return docs.some((d) => hasGuideStarted(d));
    },
    enabled: active,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // (3) 논문 읽기 타이머 1회 — 신입(7일 이내) 한정 read 1회
  const { data: timerDone = false } = useQuery({
    queryKey: ["first-steps-reading-done", userId],
    queryFn: async () => {
      const res = await paperReadingLogsApi.listByUser(userId as string);
      return (res.data ?? []).length > 0;
    },
    enabled: active,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const steps: MissionStep[] = useMemo(
    () => [
      {
        id: "diagnosis",
        label: "연구 준비도 진단",
        description: "5분 진단으로 내 연구 준비도와 약점을 확인하세요.",
        href: "/diagnosis",
        icon: Activity,
        completed: diagnosisDone,
      },
      {
        id: "guide",
        label: "러닝 가이드 살펴보기",
        description: "관심 주제의 러닝 가이드를 열어 첫 학습을 시작하세요.",
        href: "/learning-guides",
        icon: BookOpen,
        completed: guideStarted,
      },
      {
        id: "timer",
        label: "논문 읽기 타이머",
        description: "논문 한 편을 읽기 타이머와 함께 읽어보세요.",
        href: "/mypage/research?tab=reading",
        icon: Timer,
        completed: timerDone,
      },
    ],
    [diagnosisDone, guideStarted, timerDone],
  );

  const completedCount = steps.filter((s) => s.completed).length;
  const total = steps.length;
  const nextStep = steps.find((s) => !s.completed);

  const handleDismiss = useCallback(() => {
    setDismissedOverride(true);
    if (!userId) return;
    try {
      window.localStorage.setItem(`${DISMISS_KEY_PREFIX}.${userId}`, "1");
    } catch {
      // ignore
    }
  }, [userId]);

  // 노출 게이트: 로그인 + 신입(7일 이내) + 비졸업생 + 미닫힘 + 3핵심행동 미완.
  if (!user || !active || dismissed) return null;
  if (completedCount >= total) return null;

  const progressPct = Math.round((completedCount / total) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-info/5 to-primary/5 p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500 sm:p-6">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="첫 걸음 미션 카드 닫기"
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X size={14} />
      </button>

      {/* 헤더 */}
      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Rocket size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            첫 걸음 미션
          </p>
          <h2 className="mt-0.5 text-base font-bold tracking-tight sm:text-lg">
            {user.name}님, 이 세 가지로 첫 성공을 경험해 보세요
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            진단 · 러닝 가이드 · 읽기 타이머 — 첫 3걸음을 마치면 학회를 200% 활용할
            준비가 끝나요.
          </p>
        </div>
      </div>

      {/* 진행도 바 */}
      <div className="mt-4" aria-label={`첫 걸음 미션 진행도 ${progressPct}%`}>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {completedCount}/{total} 완료 — 남은 미션을 눌러 시작하세요.
        </p>
      </div>

      {/* 3단계 미션 */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          const StatusIcon = step.completed ? CheckCircle2 : Circle;
          return (
            <li key={step.id}>
              {step.completed ? (
                <div
                  className="flex h-full items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 p-3"
                  aria-label={`${step.label} 완료`}
                >
                  <StatusIcon
                    size={18}
                    className="mt-0.5 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-success line-through">
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-success/70">완료했어요</p>
                  </div>
                </div>
              ) : (
                <Link
                  href={step.href}
                  className="group flex h-full items-start gap-2.5 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`${step.label} 시작하기`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-sm font-semibold">
                      <span className="truncate">{step.label}</span>
                      <ArrowRight
                        size={13}
                        className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {/* 다음 한 걸음 단일 CTA */}
      {nextStep && (
        <Link
          href={nextStep.href}
          className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          aria-label={`다음 미션: ${nextStep.label}`}
        >
          <span className="min-w-0 truncate">다음: {nextStep.label}</span>
          <ArrowRight size={15} className="shrink-0" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
