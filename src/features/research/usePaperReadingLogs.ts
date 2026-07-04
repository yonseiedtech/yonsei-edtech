"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paperReadingLogsApi, streakEventsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { PaperReadingLog } from "@/types/paper-reading";

/** 본인 논문 읽기 기록 — readAt 최신순 */
export function usePaperReadingLogs() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const { data: logs = [], ...rest } = useQuery({
    queryKey: ["paper-reading-logs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await paperReadingLogsApi.listByUser(userId);
      return (res.data as unknown as PaperReadingLog[]).sort((a, b) =>
        (b.readAt ?? "").localeCompare(a.readAt ?? ""),
      );
    },
    enabled: !!userId,
  });

  return { logs, ...rest };
}

export function useCreateReadingLog() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (
      data: Omit<PaperReadingLog, "id" | "userId" | "createdAt" | "updatedAt">,
    ) => {
      if (!user) throw new Error("로그인이 필요합니다");
      const now = new Date().toISOString();
      const res = await paperReadingLogsApi.create({
        ...data,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      });
      // 보상 원장 통일(2026-07-04): 읽기 기록 1일 +4 리더보드 이중 기록
      if (user?.id) void streakEventsApi.mirror(user.id, "reading", 4);
      return res as unknown as PaperReadingLog;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paper-reading-logs"] }),
  });
}

export function useUpdateReadingLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<PaperReadingLog>;
    }) => {
      await paperReadingLogsApi.update(id, {
        ...patch,
        updatedAt: new Date().toISOString(),
      });
      return { id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paper-reading-logs"] }),
  });
}

export function useDeleteReadingLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await paperReadingLogsApi.delete(id);
      return { id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paper-reading-logs"] }),
  });
}
