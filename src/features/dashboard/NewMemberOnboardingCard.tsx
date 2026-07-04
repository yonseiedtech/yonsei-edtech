"use client";

/**
 * NewMemberOnboardingCard — 신입 온보딩 레이어 (UX 보고서 H1).
 *
 * "환영 + 첫 3가지 핵심 할 일"을 대시보드 최상단(Next Action 영역 위)에 노출.
 *
 * 설계 원칙 (UX 보고서 H1·L4):
 *  - 만료성 배너가 아니다 — 가입 후 N일 같은 시간 게이트 없이 "미완료 시 상시 노출".
 *    → "지각 신규(가입 후 늦게 첫 로그인)"도 커버.
 *  - 완료 여부는 실제 데이터로 판단 (Firestore 콘솔 설정에 의존하지 않는 자족 컴포넌트).
 *  - 3가지 핵심 항목이 모두 완료되면 카드 자동 숨김.
 *  - 사용자가 명시적으로 닫으면 localStorage 로 기억 (per-user).
 *
 * 3가지 핵심 항목 (보고서 예시: 프로필 완성 · 진단평가 시작 · 관심 분야 설정):
 *  1. profile     — user.bio 작성 (프로필 자기소개, /profile/me)
 *  2. diagnosis   — diagnostic_results 1건+ (진단평가 시작, /diagnosis)
 *  3. interests   — user.researchInterests / interestKeywords 1개+ (관심 분야, /profile/me)
 *
 * 기존 NewMemberChecklistWidget(Firestore 설정 기반, 다수 항목) 와 역할 분리:
 *  - 본 카드는 "첫 3걸음"만 — 최상단에서 Next Action 우선화의 시각적 1순위.
 *  - 콘솔 설정 의존 없이 항상 동작하므로 설정 미비 환경에서도 온보딩 보장.
 */

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  X,
  ArrowRight,
  PenSquare,
  Heart,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { diagnosticResultsApi } from "@/lib/bkend";

const DISMISS_KEY_PREFIX = "yedu_onboarding_card_dismissed";

interface OnboardingStep {
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

export default function NewMemberOnboardingCard() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const dismissedKey = userId
    ? `${DISMISS_KEY_PREFIX}.${userId}`
    : `${DISMISS_KEY_PREFIX}.__none__`;
  const dismissedStored = useLocalBoolean(dismissedKey);
  const [dismissedOverride, setDismissedOverride] = useState(false);
  const dismissed = dismissedStored || dismissedOverride;

  // 진단평가 이력 1건+ 여부 — DiagnosisReadinessWidget 와 동일 staleTime.
  const { data: hasDiagnosis } = useQuery({
    queryKey: ["onboarding-card-diagnosis", userId],
    queryFn: async () => {
      if (!userId) return false;
      const res = await diagnosticResultsApi.listByUser(userId);
      const list = Array.isArray(res.data) ? res.data : [];
      return list.length > 0;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const steps: OnboardingStep[] = useMemo(() => {
    if (!user) return [];
    const hasBio = Boolean(user.bio && user.bio.trim().length > 0);
    const interests = Array.isArray(user.researchInterests)
      ? user.researchInterests
      : [];
    const keywords = Array.isArray(user.interestKeywords)
      ? user.interestKeywords
      : [];
    const hasInterests = interests.length >= 1 || keywords.length >= 1;
    return [
      {
        id: "profile",
        label: "프로필 완성",
        description: "자기소개를 작성해 학회원에게 나를 소개하세요.",
        href: "/mypage/edit",
        icon: PenSquare,
        completed: hasBio,
      },
      {
        id: "diagnosis",
        label: "진단평가 시작",
        description: "연구 준비도를 진단해 약점을 확인하세요.",
        href: "/diagnosis",
        icon: ClipboardCheck,
        completed: hasDiagnosis === true,
      },
      {
        id: "interests",
        label: "관심 분야 설정",
        description: "관심 연구 키워드를 등록해 맞춤 추천을 받으세요.",
        href: "/mypage/edit",
        icon: Heart,
        completed: hasInterests,
      },
    ];
  }, [user, hasDiagnosis]);

  const completedCount = steps.filter((s) => s.completed).length;
  const total = steps.length;

  const handleDismiss = useCallback(() => {
    setDismissedOverride(true);
    if (!userId) return;
    try {
      window.localStorage.setItem(`${DISMISS_KEY_PREFIX}.${userId}`, "1");
    } catch {
      // ignore
    }
  }, [userId]);

  // 노출 조건: 로그인 + 미닫힘 + 미완료 항목 존재 (만료성 게이트 없음 — 상시).
  if (!user || dismissed) return null;
  if (total === 0 || completedCount >= total) return null;

  const progressPct = Math.round((completedCount / total) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-sky-500/5 to-primary/5 p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500 sm:p-6">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="온보딩 카드 닫기"
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X size={14} />
      </button>

      {/* 환영 헤더 */}
      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            환영합니다
          </p>
          <h2 className="mt-0.5 text-base font-bold tracking-tight sm:text-lg">
            {user.name}님, 먼저 이 세 가지부터 시작해 볼까요?
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            첫 3걸음을 완료하면 맞춤 추천과 연구 준비도 진단을 바로 활용할 수
            있어요.
          </p>
        </div>
      </div>

      {/* 진행도 바 */}
      <div
        className="mt-4"
        aria-label={`온보딩 진행도 ${progressPct}%`}
      >
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {completedCount}/{total} 완료 — 남은 항목을 눌러 채워보세요.
        </p>
      </div>

      {/* 3단계 카드 */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          const StatusIcon = step.completed ? CheckCircle2 : Circle;
          return (
            <li key={step.id}>
              {step.completed ? (
                <div
                  className="flex h-full items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/60 p-3 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                  aria-label={`${step.label} 완료`}
                >
                  <StatusIcon
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-800 line-through dark:text-emerald-200">
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-300/70">
                      완료했어요
                    </p>
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
    </div>
  );
}
