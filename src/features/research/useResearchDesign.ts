"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { researchDesignsApi } from "@/lib/bkend";
import { EMPTY_PARTICIPANTS } from "@/types/research-design";
import type { ResearchDesign } from "@/types";

export function useResearchDesign(userId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["research_design", userId ?? "guest"],
    queryFn: async () => {
      if (!userId) return null;
      const res = await researchDesignsApi.listByUser(userId);
      // react-query v5 는 undefined resolve 를 에러로 처리 — 문서 0건이면 null
      return (res.data[0] ?? null) as ResearchDesign | null;
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
  return { design: data, isLoading };
}

export function useEnsureResearchDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<ResearchDesign> => {
      const res = await researchDesignsApi.listByUser(userId);
      if (res.data.length > 0) return res.data[0];
      const created = await researchDesignsApi.create({
        userId,
        approach: "",
        participants: { ...EMPTY_PARTICIPANTS },
        procedureSteps: [],
        instruments: [],
        dataCollection: "",
        dataAnalysis: "",
      });
      return created;
    },
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ["research_design", userId] });
    },
  });
}

export function useUpdateResearchDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      researchDesignsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research_design"] });
    },
  });
}
