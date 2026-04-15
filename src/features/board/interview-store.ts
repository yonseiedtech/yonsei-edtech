"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataApi } from "@/lib/bkend";
import type { InterviewResponse, InterviewAnswer } from "@/types";

const TABLE = "interview_responses";

function docToResponse(doc: Record<string, unknown>): InterviewResponse {
  let answers: InterviewAnswer[] = [];
  if (typeof doc.answers === "string") {
    try { answers = JSON.parse(doc.answers); } catch { answers = []; }
  } else if (Array.isArray(doc.answers)) {
    answers = doc.answers as InterviewAnswer[];
  }
  return {
    id: doc.id as string,
    postId: (doc.postId as string) ?? "",
    respondentId: (doc.respondentId as string) ?? "",
    respondentName: (doc.respondentName as string) ?? "",
    respondentRole: (doc.respondentRole as string) ?? undefined,
    status: (doc.status as "draft" | "submitted") ?? "draft",
    answers,
    createdAt: (doc.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (doc.updatedAt as string) ?? undefined,
    submittedAt: (doc.submittedAt as string) ?? undefined,
  };
}

async function listByPost(postId: string): Promise<InterviewResponse[]> {
  const res = await dataApi.list<Record<string, unknown>>(TABLE, {
    "filter[postId]": postId,
    limit: 200,
  });
  return res.data.map(docToResponse);
}

async function listByRespondent(respondentId: string): Promise<InterviewResponse[]> {
  const res = await dataApi.list<Record<string, unknown>>(TABLE, {
    "filter[respondentId]": respondentId,
    limit: 200,
  });
  return res.data.map(docToResponse);
}

export function useInterviewResponses(postId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["interview_responses", "post", postId],
    queryFn: () => listByPost(postId),
    enabled: !!postId,
    staleTime: 1000 * 30,
  });
  return { responses: data ?? [], isLoading };
}

export function useMyInterviewResponses(userId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["interview_responses", "mine", userId ?? "guest"],
    queryFn: () => listByRespondent(userId!),
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
  return { responses: data ?? [], isLoading };
}

export function useMyInterviewForPost(postId: string, userId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["interview_responses", "mine", postId, userId ?? "guest"],
    queryFn: async () => {
      const res = await dataApi.list<Record<string, unknown>>(TABLE, {
        "filter[postId]": postId,
        "filter[respondentId]": userId!,
        limit: 1,
      });
      return res.data[0] ? docToResponse(res.data[0]) : null;
    },
    enabled: !!postId && !!userId,
    staleTime: 1000 * 10,
  });
  return { response: data ?? null, isLoading };
}

export function useSaveInterviewResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      postId: string;
      respondentId: string;
      respondentName: string;
      respondentRole?: string;
      answers: InterviewAnswer[];
      status: "draft" | "submitted";
    }) => {
      const payload: Record<string, unknown> = {
        postId: input.postId,
        respondentId: input.respondentId,
        respondentName: input.respondentName,
        respondentRole: input.respondentRole,
        status: input.status,
        answers: JSON.stringify(input.answers),
      };
      if (input.status === "submitted") {
        payload.submittedAt = new Date().toISOString();
      }
      if (input.id) {
        const doc = await dataApi.update<Record<string, unknown>>(TABLE, input.id, payload);
        return docToResponse(doc);
      } else {
        const doc = await dataApi.create<Record<string, unknown>>(TABLE, payload);
        return docToResponse(doc);
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["interview_responses", "post", vars.postId] });
      qc.invalidateQueries({ queryKey: ["interview_responses", "mine"] });
    },
  });
}
