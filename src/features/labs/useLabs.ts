"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { labsApi, labReactionsApi, labCommentsApi } from "@/lib/bkend";
import type { Lab, LabReaction, LabComment, LabEmoji } from "@/types";
import { useAuthStore } from "@/features/auth/auth-store";

export function useLabs() {
  const { data, isLoading } = useQuery({
    queryKey: ["labs"],
    queryFn: async () => {
      const res = await labsApi.list();
      return res.data as unknown as Lab[];
    },
    retry: false,
  });
  return { labs: data ?? [], isLoading };
}

export function useLab(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["labs", id],
    queryFn: async () => (await labsApi.get(id)) as unknown as Lab,
    enabled: !!id,
    retry: false,
  });
  return { lab: data ?? null, isLoading };
}

export function useCreateLab() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const m = useMutation({
    mutationFn: async (data: Partial<Lab>) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const payload: Record<string, unknown> = {
        kind: data.kind ?? "external",
        title: data.title ?? "",
        description: data.description ?? "",
        status: data.status ?? "testing",
        ownerId: user.id,
        ownerName: user.name,
        reactionSummary: {},
        commentCount: 0,
      };
      if (data.externalUrl) payload.externalUrl = data.externalUrl;
      if (data.thumbnailUrl) payload.thumbnailUrl = data.thumbnailUrl;
      if (data.featureFlag) payload.featureFlag = data.featureFlag;
      if (data.previewRoute) payload.previewRoute = data.previewRoute;
      if (data.tags?.length) payload.tags = data.tags;
      if (data.allowedUserIds?.length) payload.allowedUserIds = data.allowedUserIds;
      return await labsApi.create(payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labs"] }),
  });
  return { createLab: m.mutateAsync, isLoading: m.isPending };
}

export function useUpdateLab() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lab> }) =>
      await labsApi.update(id, data as Record<string, unknown>),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["labs"] });
      qc.invalidateQueries({ queryKey: ["labs", v.id] });
    },
  });
  return { updateLab: m.mutateAsync, isLoading: m.isPending };
}

export function useDeleteLab() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (id: string) => labsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labs"] }),
  });
  return { deleteLab: m.mutateAsync, isLoading: m.isPending };
}

// ── Reactions ──

export function useLabReactions(labId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["lab_reactions", labId],
    queryFn: async () => (await labReactionsApi.list(labId)).data as unknown as LabReaction[],
    enabled: !!labId,
    retry: false,
  });
  return { reactions: data ?? [], isLoading };
}

export function useToggleReaction() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const m = useMutation({
    mutationFn: async ({ labId, emoji, existingId }: { labId: string; emoji: LabEmoji; existingId?: string }) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      if (existingId) {
        await labReactionsApi.delete(existingId);
      } else {
        await labReactionsApi.create({ labId, userId: user.id, emoji });
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lab_reactions", v.labId] });
      qc.invalidateQueries({ queryKey: ["labs", v.labId] });
    },
  });
  return { toggle: m.mutateAsync, isLoading: m.isPending };
}

// ── Comments ──

export function useLabComments(labId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["lab_comments", labId],
    queryFn: async () => (await labCommentsApi.list(labId)).data as unknown as LabComment[],
    enabled: !!labId,
    retry: false,
  });
  return { comments: data ?? [], isLoading };
}

export function useCreateLabComment() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const m = useMutation({
    mutationFn: async (data: { labId: string; content: string; parentId?: string }) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const payload: Record<string, unknown> = {
        labId: data.labId,
        content: data.content,
        authorId: user.id,
        authorName: user.name,
      };
      if (data.parentId) payload.parentId = data.parentId;
      return await labCommentsApi.create(payload);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lab_comments", v.labId] });
      qc.invalidateQueries({ queryKey: ["labs", v.labId] });
    },
  });
  return { createComment: m.mutateAsync, isLoading: m.isPending };
}

export function useDeleteLabComment() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async ({ id }: { id: string; labId: string }) => await labCommentsApi.delete(id),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lab_comments", v.labId] });
    },
  });
  return { deleteComment: m.mutateAsync, isLoading: m.isPending };
}
