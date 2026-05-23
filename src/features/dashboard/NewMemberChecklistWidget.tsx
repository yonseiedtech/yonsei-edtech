"use client";

/**
 * NewMemberChecklistWidget — 신규 회원 시작하기 체크리스트.
 *
 * 항목은 운영진이 /console/onboarding-checklist 에서 편집하는
 * Firestore onboarding_checklist 컬렉션에서 fetch (enabled=true, order asc).
 * 항목이 0개이면 위젯 자체를 숨김.
 *
 * 노출 조건 (OR):
 *  - 가입 후 30일 이내 (user.createdAt 기준)
 *  - 프로필 완성도 < 60%
 *  - 모든 항목 완료 시 자동 숨김
 *
 * 항목별 completionType 평가:
 *  - profile.bio                 → user.bio 존재
 *  - profile.researchInterests   → researchInterests/interestKeywords 1개+
 *  - profile.image               → user.photoURL 존재
 *  - visited.activities          → localStorage(visited_activities) OR participations 1건+
 *  - visited.archive             → localStorage(visited_archive)
 *  - visited.research            → localStorage(visited_research)
 *  - attended.seminar            → seminar_attendees checkedIn=true 1건+
 *  - favorited.archive           → archive_favorites 1건+
 *  - participated.activity       → activity_participations 1건+
 *  - submitted.research          → research_reports 1건+
 *  - wrote.lectureReview         → course_reviews 1건+
 *
 * UI: 가로 progress bar (N/total) + 미완료 항목 클릭 시 해당 페이지로 이동.
 * 데이터 fetching: React Query staleTime 5분.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Sparkles,
  PenSquare,
  Heart,
  Users as UsersIcon,
  CalendarCheck,
  Star,
  Camera,
  BookOpen,
  FileText,
  GraduationCap,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  attendeesApi,
  archiveFavoritesApi,
  activityParticipationsApi,
  onboardingChecklistApi,
  profilesApi,
  researchReportsApi,
  courseReviewsApi,
  streakEventsApi,
} from "@/lib/bkend";
import type {
  SeminarAttendee,
  ArchiveFavorite,
  ActivityParticipation,
  ChecklistCompletionType,
  ChecklistIcon,
  ChecklistPriority,
  OnboardingChecklistItem,
  ResearchReport,
  CourseReview,
} from "@/types";
import {
  ONBOARDING_BADGE_META,
  type OnboardingBadgeId,
} from "@/types/onboarding-badge";
import { NEXT_CTA_MAP } from "@/lib/onboarding-next-cta";
import WidgetCard from "@/components/ui/widget-card";
import { cn } from "@/lib/utils";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const COMPLETION_THRESHOLD = 0.6; // 60%
const PRIORITY_RANK: Record<ChecklistPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
const ACTIVITY_VISIT_KEY = "yedu_onboarding_visited_activities";
const ARCHIVE_VISIT_KEY = "yedu_onboarding_visited_archive";
const RESEARCH_VISIT_KEY = "yedu_onboarding_visited_research";
const DISMISS_KEY_PREFIX = "yedu_new_member_checklist_dismissed";

const ICON_MAP: Record<ChecklistIcon, LucideIcon> = {
  PenSquare,
  Heart,
  Users: UsersIcon,
  CalendarCheck,
  Star,
  Camera,
  BookOpen,
  FileText,
  GraduationCap,
  Sparkles,
};

interface ResolvedItem {
  id: string;
  /** P1: 학습 잔디 가산점·배지 멱등성을 위한 안정적 식별자 (firestore 문서 rename 무관). */
  completionType: ChecklistCompletionType;
  label: string;
  href: string;
  icon: LucideIcon;
  completed: boolean;
  /** P2: 항목별 우선순위. 미완료 항목 정렬·강조에 사용. 기본 medium. */
  priority: ChecklistPriority;
  /** P2: 정렬 안정성을 위한 원본 order. */
  order: number;
}

function parseTimestamp(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof value === "object" && value && "seconds" in (value as Record<string, unknown>)) {
    const seconds = (value as { seconds?: number }).seconds;
    if (typeof seconds === "number") return seconds * 1000;
  }
  return null;
}

/** localStorage 동기 1회 조회 — SSR 안전. */
function readLocalRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * localStorage 키 1개를 useSyncExternalStore 로 구독.
 * "storage" 이벤트로 탭 간 동기화도 지원하며,
 * SSR 단계에서는 null 을 반환해 hydration mismatch 를 회피한다.
 */
function useLocalBoolean(key: string): boolean {
  const subscribe = useCallback((cb: () => void) => {
    if (typeof window === "undefined") return () => {};
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) cb();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);
  const getSnapshot = useCallback(() => readLocalRaw(key) === "1", [key]);
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function NewMemberChecklistWidget() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const router = useRouter();
  // 방문 기록 localStorage 키 3종 구독
  const activityVisited = useLocalBoolean(ACTIVITY_VISIT_KEY);
  const archiveVisited = useLocalBoolean(ARCHIVE_VISIT_KEY);
  const researchVisited = useLocalBoolean(RESEARCH_VISIT_KEY);
  const dismissedKey = userId ? `${DISMISS_KEY_PREFIX}.${userId}` : `${DISMISS_KEY_PREFIX}.__none__`;
  const dismissedStored = useLocalBoolean(dismissedKey);
  const [dismissedOverride, setDismissedOverride] = useState<boolean>(false);
  const dismissed = dismissedStored || dismissedOverride;
  const [nowMs] = useState<number>(() => (typeof window === "undefined" ? 0 : Date.now()));

  // 콘솔에서 편집된 체크리스트 항목 (enabled=true, order asc)
  const { data: checklistRes } = useQuery({
    queryKey: ["onboarding-checklist", "enabled"],
    queryFn: () => onboardingChecklistApi.listEnabled(),
    staleTime: 5 * 60_000,
  });
  const configItems = useMemo(
    () => (checklistRes?.data ?? []) as OnboardingChecklistItem[],
    [checklistRes],
  );

  // 완료조건별 fetch 필요 여부 계산 — 불필요한 쿼리는 enabled=false 로 차단
  const needs = useMemo(() => {
    const set = new Set(configItems.map((it) => it.completionType));
    return {
      seminar: set.has("attended.seminar"),
      favorite: set.has("favorited.archive"),
      participation:
        set.has("participated.activity") || set.has("visited.activities"),
      researchReport: set.has("submitted.research"),
      lectureReview: set.has("wrote.lectureReview"),
    };
  }, [configItems]);

  const { data: attendeesRes } = useQuery({
    queryKey: ["onboarding-checklist", "seminar-attendees", userId],
    queryFn: async () => {
      if (!userId) return { data: [] as SeminarAttendee[], total: 0 };
      return attendeesApi.listByUser(userId);
    },
    enabled: !!userId && needs.seminar,
    staleTime: 5 * 60_000,
  });

  const { data: favoritesRes } = useQuery({
    queryKey: ["onboarding-checklist", "archive-favorites", userId],
    queryFn: async () => {
      if (!userId) return { data: [] as ArchiveFavorite[], total: 0 };
      return archiveFavoritesApi.listByUser(userId);
    },
    enabled: !!userId && needs.favorite,
    staleTime: 5 * 60_000,
  });

  const { data: participationsRes } = useQuery({
    queryKey: ["onboarding-checklist", "activity-participations", userId],
    queryFn: async () => {
      if (!userId) return { data: [] as ActivityParticipation[], total: 0 };
      return activityParticipationsApi.listByUser(userId);
    },
    enabled: !!userId && needs.participation,
    staleTime: 5 * 60_000,
  });

  const { data: researchReportRes } = useQuery({
    queryKey: ["onboarding-checklist", "research-reports", userId],
    queryFn: async () => {
      if (!userId) return { data: [] as ResearchReport[], total: 0 };
      return researchReportsApi.listByUser(userId);
    },
    enabled: !!userId && needs.researchReport,
    staleTime: 5 * 60_000,
  });

  const { data: lectureReviewRes } = useQuery({
    queryKey: ["onboarding-checklist", "lecture-reviews", userId],
    queryFn: async () => {
      if (!userId) return { data: [] as CourseReview[], total: 0 };
      return courseReviewsApi.listByAuthor(userId);
    },
    enabled: !!userId && needs.lectureReview,
    staleTime: 5 * 60_000,
  });

  const hasAttendedSeminar = useMemo(() => {
    const list = (attendeesRes?.data ?? []) as SeminarAttendee[];
    return list.some((a) => a.checkedIn === true);
  }, [attendeesRes]);

  const hasFavoriteArchive = useMemo(() => {
    const list = (favoritesRes?.data ?? []) as ArchiveFavorite[];
    return list.length > 0;
  }, [favoritesRes]);

  const hasParticipation = useMemo(() => {
    const list = (participationsRes?.data ?? []) as ActivityParticipation[];
    return list.length > 0;
  }, [participationsRes]);

  const hasResearchReport = useMemo(() => {
    const list = (researchReportRes?.data ?? []) as ResearchReport[];
    return list.length > 0;
  }, [researchReportRes]);

  const hasLectureReview = useMemo(() => {
    const list = (lectureReviewRes?.data ?? []) as CourseReview[];
    return list.length > 0;
  }, [lectureReviewRes]);

  /** completionType 별 평가 — switch case. */
  function evalCompletion(type: ChecklistCompletionType): boolean {
    if (!user) return false;
    switch (type) {
      case "profile.bio":
        return Boolean(user.bio && user.bio.trim().length > 0);
      case "profile.researchInterests": {
        const interests = Array.isArray(user.researchInterests) ? user.researchInterests : [];
        const kw = Array.isArray(user.interestKeywords) ? user.interestKeywords : [];
        return interests.length >= 1 || kw.length >= 1;
      }
      case "profile.image": {
        const photo = (user as { photoURL?: string | null }).photoURL;
        return Boolean(photo && photo.trim().length > 0);
      }
      case "visited.activities":
        return activityVisited || hasParticipation;
      case "visited.archive":
        return archiveVisited;
      case "visited.research":
        return researchVisited;
      case "attended.seminar":
        return hasAttendedSeminar;
      case "favorited.archive":
        return hasFavoriteArchive;
      case "participated.activity":
        return hasParticipation;
      case "submitted.research":
        return hasResearchReport;
      case "wrote.lectureReview":
        return hasLectureReview;
      default:
        return false;
    }
  }

  const items: ResolvedItem[] = useMemo(() => {
    if (!user) return [];
    const mapped: ResolvedItem[] = configItems.map((c) => ({
      id: c.id,
      completionType: c.completionType,
      label: c.label,
      href: c.href,
      icon: ICON_MAP[c.icon] ?? Sparkles,
      completed: evalCompletion(c.completionType),
      priority: c.priority ?? "medium",
      order: c.order,
    }));
    // 미완료: priority high → medium → low, 그 안에서 order asc
    // 완료: 항상 미완료 뒤로, 그 안에서 order asc
    return mapped.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (!a.completed) {
        const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (pr !== 0) return pr;
      }
      return a.order - b.order;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user,
    configItems,
    activityVisited,
    archiveVisited,
    researchVisited,
    hasAttendedSeminar,
    hasFavoriteArchive,
    hasParticipation,
    hasResearchReport,
    hasLectureReview,
  ]);

  const completedCount = items.filter((it) => it.completed).length;
  const total = items.length;
  const progress = total > 0 ? completedCount / total : 0;

  // ── 축하 애니메이션 — 신규 완료 항목 감지 ──
  // 이전 마운트의 completed key set 을 ref 로 보관 (첫 마운트는 축하 X)
  const prevCompletedRef = useRef<Set<string> | null>(null);
  // 방금 완료되어 반짝임 효과를 표시할 항목 id 집합
  const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set());
  // 전체 완료(Boss 축하) 가드 — userId 별 localStorage 1회만
  const bossKey = userId ? `yedu_checklist_boss_celebrated.${userId}` : null;

  const fireConfetti = useCallback((origin?: { x?: number; y?: number }) => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        startVelocity: 30,
        origin: { x: origin?.x ?? 0.5, y: origin?.y ?? 0.6 },
        ticks: 120,
      });
    } catch {
      // ignore confetti failures (e.g. server)
    }
  }, []);

  // 신규 완료 항목 감지 + 축하 효과 (3-layer: 반짝임 + 컨페티 + 토스트)
  // P1 후속: 학습 잔디 가산점(+5/항목) + 마일스톤 배지 부여(first-step/halfway/complete) — 멱등.
  useEffect(() => {
    if (items.length === 0) return;
    const current = new Set(items.filter((it) => it.completed).map((it) => it.id));
    const prev = prevCompletedRef.current;
    // 첫 마운트: 비교 없이 baseline 만 기록
    if (prev === null) {
      prevCompletedRef.current = current;
      return;
    }
    const newlyCompleted = [...current].filter((id) => !prev.has(id));
    if (newlyCompleted.length > 0) {
      // 인라인 반짝임 표시
      setJustCompletedIds((s) => {
        const next = new Set(s);
        newlyCompleted.forEach((id) => next.add(id));
        return next;
      });
      // 1.5초 후 자동 제거
      const t = window.setTimeout(() => {
        setJustCompletedIds((s) => {
          const next = new Set(s);
          newlyCompleted.forEach((id) => next.delete(id));
          return next;
        });
      }, 1500);
      // 컨페티 + 토스트 (각 항목별 토스트, 컨페티는 1회)
      fireConfetti();
      newlyCompleted.forEach((id) => {
        const item = items.find((it) => it.id === id);
        if (!item) return;
        const nextCta = NEXT_CTA_MAP[item.completionType];
        if (nextCta) {
          toast.success(`🎉 ${item.label} 완료!`, {
            description: nextCta.message,
            action: {
              label: nextCta.label,
              onClick: () => router.push(nextCta.href),
            },
            duration: 6000,
          });
        } else {
          toast.success(`🎉 ${item.label} 완료!`, {
            description: "프로필 완성도가 한 단계 올라갔어요.",
            duration: 4000,
          });
        }
      });

      // ── P1 후속: 학습 잔디 가산점 + 마일스톤 배지 부여 (멱등) ──
      // 부수효과는 fire-and-forget. 실패해도 UI 흐름 차단 X.
      if (userId) {
        const currentCount = current.size;
        const newlyCompletedTypes = newlyCompleted
          .map((id) => items.find((it) => it.id === id)?.completionType)
          .filter((t): t is ChecklistCompletionType => Boolean(t));
        const existingBadges: OnboardingBadgeId[] = Array.isArray(user?.onboardingBadges)
          ? (user!.onboardingBadges as OnboardingBadgeId[])
          : [];
        const ratio = items.length > 0 ? currentCount / items.length : 0;

        const newBadges: OnboardingBadgeId[] = [];
        if (currentCount >= 1 && !existingBadges.includes("first-step")) {
          newBadges.push("first-step");
        }
        if (ratio >= COMPLETION_THRESHOLD && !existingBadges.includes("halfway")) {
          newBadges.push("halfway");
        }
        const allComplete = currentCount === items.length && items.length > 0;
        if (allComplete && !existingBadges.includes("complete")) {
          newBadges.push("complete");
        }
        // P2: 가입 7일 이내 전체 완료 시 "신속 적응" 배지 (+30점)
        if (allComplete && !existingBadges.includes("speed-adapter")) {
          const createdAtMs = parseTimestamp(
            (user as { createdAt?: unknown } | null | undefined)?.createdAt,
          );
          if (
            createdAtMs != null &&
            Date.now() - createdAtMs <= SEVEN_DAYS_MS
          ) {
            newBadges.push("speed-adapter");
          }
        }

        const targetUserId = userId;
        void (async () => {
          // 1) 항목별 +5 잔디 가산
          for (const completionType of newlyCompletedTypes) {
            try {
              await streakEventsApi.add({
                userId: targetUserId,
                type: "onboarding-checklist",
                refId: completionType,
                points: 5,
              });
            } catch (err) {
              console.error("[NewMemberChecklistWidget] streak add failed", err);
            }
          }

          // 2) 배지 부여 + 배지 가산점 (각각 멱등)
          if (newBadges.length > 0) {
            const mergedBadges = Array.from(new Set([...existingBadges, ...newBadges]));
            try {
              await profilesApi.update(targetUserId, {
                onboardingBadges: mergedBadges,
              });
            } catch (err) {
              console.error("[NewMemberChecklistWidget] badge update failed", err);
            }
            // 배지 토스트 + 배지 가산점
            for (const badgeId of newBadges) {
              const meta = ONBOARDING_BADGE_META[badgeId];
              const label =
                badgeId === "first-step"
                  ? "🌱 첫걸음 배지 획득!"
                  : badgeId === "halfway"
                  ? "🚀 절반 통과 배지 획득!"
                  : badgeId === "speed-adapter"
                  ? `⚡ 신속 적응 배지 획득! +${meta.points}점`
                  : "🎓 시작하기 마스터 배지 획득!";
              toast.info(label, {
                description: meta.description,
                duration: 5000,
              });
              try {
                await streakEventsApi.add({
                  userId: targetUserId,
                  type: "onboarding-badge",
                  refId: badgeId,
                  points: meta.points,
                });
              } catch (err) {
                console.error("[NewMemberChecklistWidget] badge streak add failed", err);
              }
            }
          }
        })();
      }

      // Boss 축하 — 전체 완료 첫 순간 + localStorage 1회 가드
      if (current.size === items.length && bossKey) {
        try {
          if (window.localStorage.getItem(bossKey) !== "1") {
            window.localStorage.setItem(bossKey, "1");
            // 좌·우 발사 2회
            setTimeout(() => fireConfetti({ x: 0.2, y: 0.6 }), 200);
            setTimeout(() => fireConfetti({ x: 0.8, y: 0.6 }), 400);
            toast.success("🎓 시작하기 체크리스트 완성!", {
              description: "프로필 완성도 100% 달성. 마이페이지에서 확인하세요.",
              duration: 6000,
            });
          }
        } catch {
          // ignore
        }
      }
      prevCompletedRef.current = current;
      return () => window.clearTimeout(t);
    }
    prevCompletedRef.current = current;
  }, [items, bossKey, fireConfetti, userId, user, router]);

  const shouldShow = useMemo(() => {
    if (!user || dismissed) return false;
    if (items.length === 0) return false;
    if (completedCount >= total) return false;
    const createdAtMs = parseTimestamp((user as { createdAt?: unknown }).createdAt);
    const within30Days =
      createdAtMs != null && nowMs > 0 && nowMs - createdAtMs <= THIRTY_DAYS_MS;
    const lowCompletion = progress < COMPLETION_THRESHOLD;
    return within30Days || lowCompletion;
  }, [user, dismissed, items.length, completedCount, total, progress, nowMs]);

  function handleDismiss() {
    if (!userId) return;
    setDismissedOverride(true);
    try {
      window.localStorage.setItem(`${DISMISS_KEY_PREFIX}.${userId}`, "1");
    } catch {
      // ignore
    }
  }

  if (!shouldShow) return null;

  const progressPct = Math.round(progress * 100);

  return (
    <WidgetCard
      title="시작하기 체크리스트"
      icon={Sparkles}
      semantic="info"
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {completedCount}/{total}
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="체크리스트 닫기"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      }
    >
      {/* 진행도 바 */}
      <div className="mt-3" aria-label={`프로필 완성도 ${progressPct}%`}>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          완성도 {progressPct}% — 미완료 항목을 눌러 한 번에 채워보세요.
        </p>
      </div>

      <ul className="mt-4 grid gap-1 sm:grid-cols-2">
        {items.map((it) => {
          const Icon = it.icon;
          const StatusIcon = it.completed ? CheckCircle2 : Circle;
          const justCompleted = justCompletedIds.has(it.id);
          return (
            <li key={it.id}>
              {it.completed ? (
                <div
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-all",
                    justCompleted &&
                      "animate-pulse bg-emerald-50 text-emerald-700 ring-2 ring-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-700/50",
                  )}
                  aria-label={`${it.label} 완료`}
                >
                  <StatusIcon
                    size={16}
                    className={cn(
                      "shrink-0 text-emerald-600 transition-transform",
                      justCompleted && "scale-125",
                    )}
                    aria-hidden="true"
                  />
                  <Icon size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className={cn("truncate", !justCompleted && "line-through")}>
                    {it.label}
                  </span>
                  {justCompleted && (
                    <Sparkles
                      size={14}
                      className="shrink-0 text-emerald-500 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ) : (
                <Link
                  href={it.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/40",
                    it.priority === "high" &&
                      "border-l-2 border-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50",
                    it.priority === "low" && "text-muted-foreground",
                  )}
                  aria-label={`${it.label} 시작하기${it.priority === "high" ? " (우선)" : ""}`}
                >
                  {it.priority === "high" ? (
                    <AlertCircle
                      size={16}
                      className="shrink-0 text-rose-500"
                      aria-hidden="true"
                    />
                  ) : (
                    <StatusIcon
                      size={16}
                      className="shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    size={14}
                    className={cn(
                      "shrink-0",
                      it.priority === "high" ? "text-rose-600" : "text-primary",
                      it.priority === "low" && "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "truncate font-medium",
                      it.priority === "high" && "text-rose-900 dark:text-rose-100",
                    )}
                  >
                    {it.label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
