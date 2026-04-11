"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { AppNotification } from "@/types";

const QUERY_KEY = "notifications";

export function useNotifications() {
  const { user } = useAuthStore();
  const userId = user?.id ?? "";

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: () => notificationsApi.list(userId),
    enabled: !!userId,
    refetchInterval: 30_000, // 30초 폴링
  });

  const notifications = (data?.data ?? []) as unknown as AppNotification[];
  const unreadCount = notifications.filter((n) => !n.read).length;

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
