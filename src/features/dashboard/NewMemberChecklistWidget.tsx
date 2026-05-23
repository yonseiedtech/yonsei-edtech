"use client";

/**
 * NewMemberChecklistWidget — Phase C 신규 회원 6단계 체크리스트.
 *
 * 노출 조건 (OR):
 *  - 가입 후 30일 이내 (user.createdAt 기준)
 *  - 프로필 완성도 < 60% (6단계 중 4개 미만 완료)
 *
 * 5개 체크 항목 (프로필 사진 제거 — 2026-05-23 사용자 요청):
 *  1) 자기소개 작성       (user.bio)
 *  2) 관심 분야 선택      (researchInterests OR interestKeywords 1개 이상)
 *  3) 학술활동 둘러보기   (localStorage 방문 기록)
 *  4) 세미나 1회 출석     (attendeesApi.listByUser, checkedIn=true 1건+)
 *  5) 아카이브 즐겨찾기 1편 (archiveFavoritesApi.listByUser 1건+)
 *
 * UI: 가로 progress bar (N/5) + 미완료 항목 클릭 시 해당 페이지로 이동.
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
  X,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { attendeesApi, archiveFavoritesApi, activityParticipationsApi } from "@/lib/bkend";
import type { SeminarAttendee, ArchiveFavorite, ActivityParticipation } from "@/types";
import WidgetCard from "@/components/ui/widget-card";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const COMPLETION_THRESHOLD = 0.6; // 60%
const ACTIVITY_VISIT_KEY = "yedu_onboarding_visited_activities";
const DISMISS_KEY_PREFIX = "yedu_new_member_checklist_dismissed";

interface ChecklistItem {
  key: string;
  label: string;
  href: string;
  icon: typeof Star;
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
  // useSyncExternalStore 로 localStorage 를 외부 스토어로 구독 — set-state-in-effect 회피.
  const activityVisited = useLocalBoolean(ACTIVITY_VISIT_KEY);
  const dismissedKey = userId ? `${DISMISS_KEY_PREFIX}.${userId}` : `${DISMISS_KEY_PREFIX}.__none__`;
  const dismissedStored = useLocalBoolean(dismissedKey);
  // 클릭 시 즉시 닫히도록 in-memory override 도 유지.
  const [dismissedOverride, setDismissedOverride] = useState<boolean>(false);
  const dismissed = dismissedStored || dismissedOverride;
  // 가입 30일 이내 판정용 — lazy initializer 로 마운트 시점 1회 캡처.
  // 렌더 중 Date.now() 호출이 아니므로 react-hooks/purity 규칙을 위반하지 않는다.
  const [nowMs] = useState<number>(() => (typeof window === "undefined" ? 0 : Date.now()));

  // 세미나 출석 이력 1건 이상 여부
  const { data: attendeesRes } = useQuery({
    queryKey: ["onboarding-checklist", "seminar-attendees", userId],
    queryFn: async () => {
      if (!userId) return { data: [] as SeminarAttendee[], total: 0 };
      return attendeesApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  // 아카이브 즐겨찾기 1건 이상 여부
  const { data: favoritesRes } = useQuery({
    queryKey: ["onboarding-checklist", "archive-favorites", userId],
    queryFn: async () => {
      if (!userId) return { data: [] as ArchiveFavorite[], total: 0 };
      return archiveFavoritesApi.listByUser(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  // 학술활동 참여 1건 이상 여부 (참여 안 했어도 둘러보기 localStorage 로도 인정)
  const { data: participationsRes } = useQuery({
    queryKey: ["onboarding-checklist", "activity-participations", userId],
    queryFn: async () => {
      if (!userId) return { data: [] as ActivityParticipation[], total: 0 };
      return activityParticipationsApi.listByUser(userId);
    },
    enabled: !!userId,
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

  const hasActivityEngagement = useMemo(() => {
    const list = (participationsRes?.data ?? []) as ActivityParticipation[];
    if (list.length > 0) return true;
    return activityVisited;
  }, [participationsRes, activityVisited]);

  const items: ChecklistItem[] = useMemo(() => {
    if (!user) return [];
    const hasBio = Boolean(user.bio && user.bio.trim().length > 0);
    const interests = Array.isArray(user.researchInterests) ? user.researchInterests : [];
    const interestKw = Array.isArray(user.interestKeywords) ? user.interestKeywords : [];
    const hasInterests = interests.length >= 1 || interestKw.length >= 1;

    return [
      { key: "bio", label: "자기소개 작성", href: "/mypage/edit", icon: PenSquare, completed: hasBio },
      { key: "interests", label: "관심 분야 선택", href: "/mypage/edit", icon: Heart, completed: hasInterests },
      { key: "activities", label: "학술활동 둘러보기", href: "/activities", icon: UsersIcon, completed: hasActivityEngagement },
      { key: "seminar", label: "세미나 1회 출석", href: "/seminars", icon: CalendarCheck, completed: hasAttendedSeminar },
      { key: "favorite", label: "아카이브 즐겨찾기 1편", href: "/archive", icon: Star, completed: hasFavoriteArchive },
    ];
  }, [user, hasActivityEngagement, hasAttendedSeminar, hasFavoriteArchive]);

  const completedCount = items.filter((it) => it.completed).length;
  const total = items.length;
  const progress = total > 0 ? completedCount / total : 0;

  // 노출 조건: 가입 30일 이내 OR 완료율 < 60%
  const shouldShow = useMemo(() => {
    if (!user || dismissed) return false;
    if (items.length === 0) return false;
    // 모든 항목 완료 시 자동 숨김
    if (completedCount >= total) return false;
    const createdAtMs = parseTimestamp((user as { createdAt?: unknown }).createdAt);
    // nowMs === 0 (마운트 전) 이면 진척률 조건만으로 판정
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
            <li key={it.key}>
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
