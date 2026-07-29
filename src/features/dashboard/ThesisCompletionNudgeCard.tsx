"use client";

/**
 * ThesisCompletionNudgeCard — 논문 완주 임박자 이탈 방지 (성장 백로그 v19 §C2, in-app 전용).
 *
 * 논문 단계(4학기+·디펜스 임박) 회원이 불안·정체로 이탈하면 커뮤니티의 "완주 스토리"
 * (추천 자산)를 잃는다. 완주 경로에 특화해:
 *  - 정체(연구/논문 3주+ 무진전): 지지적으로 "완주까지 다음 한 걸음"(디펜스 연습)을 리마인드.
 *  - 완주(졸업요건 충족): 축하 + "학기 회고(Wrapped) 공유"로 D1 추천 루프에 연결.
 * 정상 진행 중이면 노출하지 않는다(진행도 "표시"는 ThesisProgressWidget 담당 — 중복 회피).
 *
 * 페르소나 게이트(엄격 — 논문 단계가 아닌 회원에겐 절대 노출 금지):
 *  - 로그인 + 논문 단계(getEffectiveSemesterCount ≥ 4) + 비졸업생.
 *  - 신입은 4학기+ 조건이 원천 배제(가입 초기 회원은 학기차 미달) → 별도 신입 가드 불필요.
 *  - 위 조건 불충족·정상 진행·닫음이면 null 렌더(자동 숨김).
 *
 * 기존 위젯과 역할 구분(중복 아님) — thesis-retention.ts 헤더 및 하기 참조:
 *  - ThesisProgressWidget: 논문 X% 상시 "표시". 본 카드는 정체/완주라는 "이유"가 있을 때만.
 *  - InactivityCoachingCard(M4, 14일 일반)·WeeklyReturnNudgeCard(C1, 이번 주 리듬 일반)와
 *    창·대상(논문 단계)·목적(완주 지원)이 달라 자연히 상호 배타적(C1 은 직전 주 연속을 전제).
 *
 * 데이터: 잔디 집계(useGradActivityData — C1/M4 와 동일 캐시 공유, 추가 read 0)에서 연구 활동
 *  최근성만, 졸업요건은 useGraduationSummary(대상 세그먼트에서만 쿼리 실행)로 파생. 신규 저장 없음.
 * Date 순수성: 렌더 경로에서 new Date()/Date.now() 직접 호출 없음 — 학기·주차·판정은 순수 유틸의
 *  기본 인자로 위임하고 useMemo 로 감싼다(WeeklyReturnNudgeCard 동일 패턴, warning 래칫 보호).
 * 닫기: per-user localStorage(useSyncExternalStore, SSR-safe) — 정체는 주간 스코프(다음 주 재노출),
 *  완주는 1회성(done) 스코프.
 */

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { GraduationCap, Sparkles, ArrowRight, Share2, X } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { useGradActivityData } from "@/features/mypage/useGradActivityData";
import { useGraduationSummary } from "@/features/mypage/useGraduationSummary";
import { isAlumni } from "@/features/dashboard/widget-visibility";
import { getEffectiveSemesterCount } from "@/lib/interview-target";
import { currentWeekKey } from "@/lib/weekly-goal";
import {
  assessThesisRetention,
  isThesisStageSemester,
  THESIS_RESEARCH_LABELS,
} from "@/lib/thesis-retention";

const DISMISS_KEY_PREFIX = "yedu_thesis_completion_nudge_dismissed";

/** 완주까지 다음 한 걸음 — 디펜스 연습(steppingstone). */
const DEFENSE_HREF = "/steppingstone/thesis-defense";
/** 완주 축하 → 학기 회고(Wrapped) 공유 유도(D1 추천 루프 연결). */
const WRAPPED_HREF = "/mypage/wrapped";

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

export default function ThesisCompletionNudgeCard() {
  const { user } = useAuthStore();
  const userId = user?.id;

  // 논문 단계(4학기+) — getEffectiveSemesterCount 는 내부 now 기본값 사용(렌더 순수성 보호).
  const inThesisStage = useMemo(
    () => (user ? isThesisStageSemester(getEffectiveSemesterCount(user)) : false),
    [user],
  );
  const alumni = user ? isAlumni(user) : false;
  const active = !!userId && !alumni && inThesisStage;

  // 졸업요건 충족 여부 — 비대상 세그먼트에선 userId=undefined 로 개인 쿼리 미실행.
  const { summary, remainingCount } = useGraduationSummary(active ? userId : undefined);
  const graduationMet = active && summary != null && remainingCount === 0;

  // 연구 활동 집계 — C1/InactivityCoaching 과 동일 캐시 키(useGradActivityData) 공유(추가 read 0).
  const { activityByDay, isLoading } = useGradActivityData(active ? userId : undefined);

  // activityByDay(일자→라벨→점수)에서 "연구/논문" 라벨이 있는 날만 추출 → 최근성 판정 입력.
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

  // 닫기 스코프: 정체는 이번 주차(다음 주 재노출), 완주는 1회성(done).
  const weekKey = useMemo(() => currentWeekKey(), []);
  const scope = state.phase === "stall" ? weekKey : "done";
  const dismissedKey = userId
    ? `${DISMISS_KEY_PREFIX}.${userId}.${state.phase}.${scope}`
    : `${DISMISS_KEY_PREFIX}.__none__`;
  const dismissedStored = useLocalBoolean(dismissedKey);
  const [dismissedOverride, setDismissedOverride] = useState(false);
  const dismissed = dismissedStored || dismissedOverride;

  const handleDismiss = useCallback(() => {
    setDismissedOverride(true);
    try {
      window.localStorage.setItem(dismissedKey, "1");
    } catch {
      // ignore
    }
  }, [dismissedKey]);

  if (!user || !active || isLoading || dismissed) return null;
  if (state.phase === "hidden") return null;

  // ── 완주 축하 + Wrapped 공유(D1 추천 루프) ──
  if (state.phase === "completion") {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl"
        />
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="완주 축하 카드 닫기"
          className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-primary-foreground/70 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
        >
          <X size={14} aria-hidden="true" />
        </button>

        <div className="relative flex items-start gap-3 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Sparkles size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary-foreground/80">완주를 축하해요</p>
            <h2 className="mt-0.5 text-sm font-bold tracking-tight sm:text-base">
              {user.name}님, 졸업요건을 모두 채웠어요!
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-primary-foreground/80">
              긴 여정을 완주한 지금, 이번 학기의 발자취를 후배·동기에게 나눠보세요. 당신의 완주
              이야기가 누군가에게는 시작할 용기가 됩니다.
            </p>
          </div>
        </div>

        <Link
          href={WRAPPED_HREF}
          className="relative mt-3.5 flex items-center justify-between gap-2 rounded-xl bg-primary-foreground px-3.5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-1 focus-visible:ring-offset-primary"
          aria-label="학기 회고(Wrapped) 열어 공유하기"
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Share2 size={15} className="shrink-0" aria-hidden="true" />
            <span className="truncate">학기 회고 공유하기</span>
          </span>
          <ArrowRight size={15} className="shrink-0" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  // ── 정체(연구 3주+ 무진전) 지지적 격려 + 디펜스 연습 리마인드 ──
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-primary/5 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500 sm:p-5">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="논문 완주 격려 넛지 닫기"
        className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X size={14} aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <GraduationCap size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary">완주까지 함께해요</p>
          <h2 className="mt-0.5 text-sm font-bold tracking-tight text-foreground sm:text-base">
            {user.name}님, 논문은 마라톤이에요. 잠시 쉬어도 괜찮아요.
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            디펜스가 막막하게 느껴질 땐 예상 질문에 소리 내어 답해보는 것부터가 가장 가벼운 다음
            한 걸음이에요. 부담 없이 5분만 연습해볼까요?
          </p>
        </div>
      </div>

      <Link
        href={DEFENSE_HREF}
        className="mt-3.5 flex items-center justify-between gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-label="디펜스 예상 질문 연습으로 다음 한 걸음 시작하기"
      >
        <span className="min-w-0 truncate">디펜스 예상 질문 연습하기</span>
        <ArrowRight size={15} className="shrink-0" aria-hidden="true" />
      </Link>
    </div>
  );
}
