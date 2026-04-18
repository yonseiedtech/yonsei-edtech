"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { researchProposalsApi } from "@/lib/bkend";
import type { ResearchProposal } from "@/types";

export function useResearchProposal(userId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["research_proposal", userId ?? "guest"],
    queryFn: async () => {
      if (!userId) return undefined;
      const res = await researchProposalsApi.listByUser(userId);
      const sorted = [...res.data].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
      );
      return sorted[0] as ResearchProposal | undefined;
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
  return { proposal: data, isLoading };
}

export function useEnsureResearchProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<ResearchProposal> => {
      const res = await researchProposalsApi.listByUser(userId);
      if (res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) =>
          (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
        );
        return sorted[0];
      }
      const created = await researchProposalsApi.create({
        userId,
        titleKo: "",
        titleEn: "",
        purpose: "",
        scope: "",
        method: "",
        content: "",
        referencePaperIds: [],
      });
      return created;
    },
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ["research_proposal", userId] });
    },
  });
}

export function useUpdateResearchProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      researchProposalsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research_proposal"] });
    },
  });
}
