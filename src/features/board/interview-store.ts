"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  dataApi,
  interviewResponseReactionsApi,
  interviewResponseCommentsApi,
} from "@/lib/bkend";
import type {
  InterviewResponse,
  InterviewAnswer,
  InterviewResponseReaction,
  InterviewResponseComment,
  InterviewReactionType,
} from "@/types";
import { useAuthStore } from "@/features/auth/auth-store";

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
    totalElapsedMs:
      typeof doc.totalElapsedMs === "number" ? (doc.totalElapsedMs as number) : undefined,
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

export function useDeleteInterviewResponse(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await dataApi.delete(TABLE, id);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview_responses", "post", postId] });
      qc.invalidateQueries({ queryKey: ["interview_responses", "mine"] });
    },
  });
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
      totalElapsedMs?: number;
    }) => {
      const payload: Record<string, unknown> = {
        postId: input.postId,
        respondentId: input.respondentId,
        respondentName: input.respondentName,
        respondentRole: input.respondentRole,
        status: input.status,
        answers: JSON.stringify(input.answers),
      };
      if (typeof input.totalElapsedMs === "number") {
        payload.totalElapsedMs = input.totalElapsedMs;
      }
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

// ── Reactions ──

export function useInterviewResponseReactions(responseId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["interview_response_reactions", responseId],
    queryFn: async () =>
      (await interviewResponseReactionsApi.list(responseId))
        .data as unknown as InterviewResponseReaction[],
    enabled: !!responseId,
    staleTime: 1000 * 30,
    retry: false,
  });
  return { reactions: data ?? [], isLoading };
}

export function useToggleInterviewReaction() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const m = useMutation({
    mutationFn: async ({
      responseId,
      postId,
      type,
      existing,
    }: {
      responseId: string;
      postId: string;
      type: InterviewReactionType;
      existing?: InterviewResponseReaction;
    }) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      // 같은 type → 토글 해제 / 다른 type → 기존 삭제 후 신규
      if (existing?.type === type) {
        await interviewResponseReactionsApi.delete(existing.id);
        return;
      }
      if (existing) {
        await interviewResponseReactionsApi.delete(existing.id);
      }
      await interviewResponseReactionsApi.create({
        responseId,
        postId,
        userId: user.id,
        type,
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["interview_response_reactions", v.responseId] });
    },
  });
  return { toggle: m.mutateAsync, isLoading: m.isPending };
}

// ── Comments ──

export function useInterviewResponseComments(responseId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["interview_response_comments", responseId],
    queryFn: async () =>
      (await interviewResponseCommentsApi.list(responseId))
        .data as unknown as InterviewResponseComment[],
    enabled: !!responseId,
    staleTime: 1000 * 30,
    retry: false,
  });
  return { comments: data ?? [], isLoading };
}

export function useCreateInterviewComment() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const m = useMutation({
    mutationFn: async (data: { responseId: string; postId: string; content: string }) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const payload: Record<string, unknown> = {
        responseId: data.responseId,
        postId: data.postId,
        content: data.content,
        authorId: user.id,
        authorName: user.name,
      };
      if (user.role) payload.authorRole = user.role;
      return await interviewResponseCommentsApi.create(payload);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["interview_response_comments", v.responseId] });
    },
  });
  return { createComment: m.mutateAsync, isLoading: m.isPending };
}

export function useUpdateInterviewComment() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async ({
      id,
      content,
    }: {
      id: string;
      responseId: string;
      content: string;
    }) =>
      await interviewResponseCommentsApi.update(id, {
        content,
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["interview_response_comments", v.responseId] });
    },
  });
  return { updateComment: m.mutateAsync, isLoading: m.isPending };
}

export function useDeleteInterviewComment() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async ({ id }: { id: string; responseId: string }) =>
      await interviewResponseCommentsApi.delete(id),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["interview_response_comments", v.responseId] });
    },
  });
  return { deleteComment: m.mutateAsync, isLoading: m.isPending };
}
