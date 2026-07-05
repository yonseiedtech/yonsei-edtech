"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { writingPapersApi } from "@/lib/bkend";
import type { WritingPaper } from "@/types";

export function useWritingPaper(userId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["writing_paper", userId ?? "guest"],
    queryFn: async () => {
      // QA-v3 M: react-query v5 는 undefined resolve 를 에러로 처리 — null 로
      if (!userId) return null;
      const res = await writingPapersApi.listByUser(userId);
      const sorted = [...res.data].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
      );
      return sorted[0] ?? null;
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
  return { paper: data, isLoading };
}

export function useEnsureWritingPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<WritingPaper> => {
      const res = await writingPapersApi.listByUser(userId);
      if (res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) =>
          (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
        );
        return sorted[0];
      }
      const created = await writingPapersApi.create({
        userId,
        chapters: {},
      });
      return created;
    },
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ["writing_paper", userId] });
    },
  });
}

export function useUpdateWritingPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      writingPapersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["writing_paper"] });
    },
  });
}
