"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { writingPaperHistoryApi } from "@/lib/bkend";
import type { WritingPaperHistory, WritingPaperChapterKey } from "@/types";

const THROTTLE_MS = 5 * 60 * 1000; // 5분

export function useWritingPaperHistory(userId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["writing_paper_history", userId ?? "guest"],
    queryFn: async (): Promise<WritingPaperHistory[]> => {
      if (!userId) return [];
      const res = await writingPaperHistoryApi.listByUser(userId);
      return [...res.data].sort((a, b) =>
        (b.savedAt ?? "").localeCompare(a.savedAt ?? "")
      );
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
  return { history: data ?? [], isLoading };
}

interface LogActivityArgs {
  userId: string;
  paperId: string;
  charCount: number;
  lastChapter?: WritingPaperChapterKey;
  title?: string;
}

/**
 * 5분 쓰로틀로 writing_paper_history에 1행 적재.
 * 마지막 history.savedAt이 5분 이내면 skip (네트워크 호출 자체 안 함).
 */
export function useLogWritingActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: LogActivityArgs): Promise<WritingPaperHistory | null> => {
      const cacheKey = ["writing_paper_history", args.userId];
      const cached = qc.getQueryData<WritingPaperHistory[]>(cacheKey) ?? [];
      const last = cached[0];
      if (last) {
        const lastTs = Date.parse(last.savedAt ?? "");
        if (Number.isFinite(lastTs) && Date.now() - lastTs < THROTTLE_MS) {
          return null; // skip
        }
      }
      const now = new Date().toISOString();
      const created = await writingPaperHistoryApi.create({
        userId: args.userId,
        paperId: args.paperId,
        savedAt: now,
        charCount: args.charCount,
        lastChapter: args.lastChapter,
        title: args.title,
      });
      // 낙관적 업데이트: 새 항목을 캐시 맨 앞에 삽입
      qc.setQueryData<WritingPaperHistory[]>(cacheKey, (prev) => {
        const next = prev ? [created, ...prev] : [created];
        return next;
      });
      return created;
    },
  });
}
