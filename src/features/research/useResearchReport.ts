"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { researchReportsApi } from "@/lib/bkend";
import type { ResearchReport } from "@/types";

export function useResearchReport(userId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["research_report", userId ?? "guest"],
    queryFn: async () => {
      if (!userId) return undefined;
      const res = await researchReportsApi.listByUser(userId);
      const sorted = [...res.data].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
      );
      return sorted[0] as ResearchReport | undefined;
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
  return { report: data, isLoading };
}

export function useEnsureResearchReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<ResearchReport> => {
      const res = await researchReportsApi.listByUser(userId);
      if (res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) =>
          (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
        );
        return sorted[0];
      }
      const created = await researchReportsApi.create({
        userId,
        fieldDescription: "",
        fieldProblem: "",
        problemPhenomenon: "",
        problemEvidence: "",
        problemCause: "",
        problemDefinition: "",
        theoryType: "",
        theoryDefinition: "",
        theoryConnection: "",
        priorResearchAnalysis: "",
        priorResearchPaperIds: [],
        priorResearchGroups: [],
      });
      return created;
    },
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ["research_report", userId] });
    },
  });
}

export function useUpdateResearchReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      researchReportsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research_report"] });
    },
  });
}
