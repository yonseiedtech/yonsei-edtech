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

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
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
  researchReportsApi,
  courseReviewsApi,
} from "@/lib/bkend";
import type {
  SeminarAttendee,
  ArchiveFavorite,
  ActivityParticipation,
  ChecklistCompletionType,
  ChecklistIcon,
  OnboardingChecklistItem,
  ResearchReport,
  CourseReview,
} from "@/types";
import WidgetCard from "@/components/ui/widget-card";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const COMPLETION_THRESHOLD = 0.6; // 60%
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
  label: string;
  href: string;
  icon: LucideIcon;
  completed: boolean;
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
    return configItems.map((c) => ({
      id: c.id,
      label: c.label,
      href: c.href,
      icon: ICON_MAP[c.icon] ?? Sparkles,
      completed: evalCompletion(c.completionType),
    }));
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
          return (
            <li key={it.id}>
              {it.completed ? (
                <div
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground"
                  aria-label={`${it.label} 완료`}
                >
                  <StatusIcon
                    size={16}
                    className="shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <Icon size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate line-through">{it.label}</span>
                </div>
              ) : (
                <Link
                  href={it.href}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/40"
                  aria-label={`${it.label} 시작하기`}
                >
                  <StatusIcon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  <Icon size={14} className="shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate font-medium">{it.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
