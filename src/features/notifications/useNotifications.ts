"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isWidgetMuted, useDashboardLayout } from "@/lib/dashboard-layout";
import type { AppNotification, NotificationType } from "@/types";
import type { DashboardWidgetKey } from "@/types/dashboard-layout";

const QUERY_KEY = "notifications";

/** 알림 타입 → 위젯 키 매핑 (mute 가드 용) */
function mapTypeToWidgetKey(type: NotificationType): DashboardWidgetKey | null {
  switch (type) {
    case "seminar_reminder":
    case "seminar_new":
    case "seminar_review_request":
      return "seminars";
    case "activity_reminder":
      return "myAcademicActivities";
    case "class_reminder":
      return "dailyTimeline";
    case "weekly_digest":
      return "statCards";
    default:
      return null;
  }
}

/** 알림 타입 → 이모지 아이콘 */
const TYPE_ICONS: Partial<Record<NotificationType, string>> = {
  member_approved: "🎉",
  member_rejected: "📋",
  comment: "💬",
  notice: "📢",
  certificate: "🏆",
  seminar_new: "📅",
  seminar_reminder: "⏰",
  seminar_review_request: "✍️",
  waitlist_promoted: "🎟️",
  newsletter: "📰",
  class_reminder: "🎓",
  activity_reminder: "📚",
  weekly_digest: "🗒️",
};

const TOAST_MAX = 3; // 동시 최대 toast 개수

export function useNotifications() {
  const { user } = useAuthStore();
  const userId = user?.id ?? "";
  const router = useRouter();
  const layout = useDashboardLayout(userId || undefined);

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: () => notificationsApi.list(userId),
    enabled: !!userId,
    refetchInterval: 30_000, // 30초 폴링
  });

  const rawData = (data?.data ?? []) as unknown;
  const notifications: AppNotification[] = Array.isArray(rawData)
    ? (rawData as AppNotification[])
    : [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  // 첫 마운트 baseline 추적 — 신규 알림만 toast 표시
  const prevNotificationIdsRef = useRef<Set<string>>(new Set());
  // baseline 세팅 완료 여부 — 첫 fetch 결과는 toast 없이 기록만
  const baselineSetRef = useRef(false);

  useEffect(() => {
    if (notifications.length === 0 && !baselineSetRef.current) return;

    const currentIds = new Set(notifications.map((n) => n.id));

    // 첫 마운트: baseline 만 기록하고 toast 없이 종료
    if (!baselineSetRef.current) {
      prevNotificationIdsRef.current = currentIds;
      baselineSetRef.current = true;
      return;
    }

    // toast 전역 OFF 시 skip
    const toastEnabled = user?.notificationPrefs?.toastEnabled;
    if (toastEnabled === false) {
      prevNotificationIdsRef.current = currentIds;
      return;
    }

    // 신규 알림: 이전 목록에 없던 미읽음 항목
    const newlyArrived = notifications.filter(
      (n) => !n.read && !prevNotificationIdsRef.current.has(n.id),
    );

    prevNotificationIdsRef.current = currentIds;

    if (newlyArrived.length === 0) return;

    // mute 가드: 위젯 알림 꺼진 타입 필터
    const toShow = newlyArrived.filter((n) => {
      const widgetKey = mapTypeToWidgetKey(n.type);
      if (widgetKey === null) return true; // 매핑 없는 타입은 항상 표시
      return !isWidgetMuted(layout, widgetKey);
    });

    if (toShow.length === 0) return;

    // 최대 TOAST_MAX 개만 toast, 초과분은 통합 toast
    const visible = toShow.slice(0, TOAST_MAX);
    const overflow = toShow.length - visible.length;

    visible.forEach((n) => {
      const icon = TYPE_ICONS[n.type] ?? "🔔";
      toast.info(`${icon} ${n.title}`, {
        description: n.message,
        ...(n.link
          ? {
              action: {
                label: "보기",
                onClick: () => router.push(n.link!),
              },
            }
          : {}),
        duration: 5000,
      });
    });

    if (overflow > 0) {
      toast.info(`🔔 외 ${overflow}건의 새 알림이 있습니다`, {
        duration: 4000,
      });
    }
  }, [notifications, layout, router, user?.notificationPrefs?.toastEnabled]);

  return { notifications, unreadCount, isLoading };
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useMarkAllRead() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(user?.id ?? ""),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

/** 알림 생성 유틸 (서버 사이드나 클라이언트에서 호출) */
export async function createNotification(params: {
  userId: string;
  type: AppNotification["type"];
  title: string;
  message: string;
  link?: string;
}) {
  return notificationsApi.create({
    ...params,
    read: false,
    createdAt: new Date().toISOString(),
  });
}
