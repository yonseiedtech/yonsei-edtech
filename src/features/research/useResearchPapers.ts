"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { researchPapersApi } from "@/lib/bkend";
import type { ResearchPaper } from "@/types";

export function useResearchPapers(userId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["research_papers", userId ?? "guest"],
    queryFn: async () => {
      if (!userId) return [] as ResearchPaper[];
      const res = await researchPapersApi.list(userId);
      return res.data;
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
  return { papers: data ?? [], isLoading };
}

export function useCreateResearchPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => researchPapersApi.create(data),
    onSuccess: (_d, vars) => {
      const userId = (vars as { userId?: string }).userId;
      qc.invalidateQueries({ queryKey: ["research_papers", userId ?? ""] });
    },
  });
}

export function useUpdateResearchPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      researchPapersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research_papers"] });
    },
  });
}

export function useDeleteResearchPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => researchPapersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research_papers"] });
    },
  });
}
