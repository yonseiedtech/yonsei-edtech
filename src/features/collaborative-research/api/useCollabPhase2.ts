// ────────────────────────────────────────────────────────────
// features/collaborative-research/api/useCollabPhase2.ts
//
// React Query hooks for Phase 2: chapters / comments / meetings / milestones.
// ────────────────────────────────────────────────────────────

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  collabChaptersApi,
  collabCommentsApi,
  collabMeetingsApi,
  collabMilestonesApi,
  dataApi,
} from "@/lib/bkend";
import type {
  CreateChapterInput,
  UpdateChapterInput,
  CreateCommentInput,
  CreateMeetingInput,
  UpdateMeetingInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  StreakEvent,
} from "@/types";

// ── Query keys ──
export const collabPhase2Keys = {
  chapters: (researchId: string | undefined) =>
    ["collab-research", researchId, "chapters"] as const,
  chapter: (id: string | undefined) =>
    ["collab-research", "chapter", id] as const,
  comments: (chapterId: string | undefined) =>
    ["collab-research", "chapter", chapterId, "comments"] as const,
  mentionsInbox: (userId: string | undefined) =>
    ["collab-research", "mentions-inbox", userId] as const,
  meetings: (researchId: string | undefined) =>
    ["collab-research", researchId, "meetings"] as const,
  milestones: (researchId: string | undefined) =>
    ["collab-research", researchId, "milestones"] as const,
  myMilestones: (userId: string | undefined) =>
    ["collab-research", "my-milestones", userId] as const,
};

// ── Helper: streak +N 멱등 적재 ──
async function logStreak(
  userId: string,
  type: "collab-chapter-edit" | "collab-meeting" | "collab-milestone",
  refId: string,
  points: number,
): Promise<void> {
  try {
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10);
    const streakId = `${userId}__${type}__${refId}__${ymd}`; // day-bucketed 멱등
    await dataApi.upsert<StreakEvent>("streak_events", streakId, {
      userId,
      type,
      refId,
      points,
      ymd,
      occurredAt: now.toISOString(),
    });
  } catch (err) {
    console.warn(`[streak ${type}] failed (non-fatal)`, err);
  }
}

// ── Chapters ──

export function useChapters(researchId: string | undefined) {
  return useQuery({
    queryKey: collabPhase2Keys.chapters(researchId),
    queryFn: () => (researchId ? collabChaptersApi.listByResearch(researchId) : []),
    enabled: !!researchId,
    staleTime: 15_000,
  });
}

export function useChapter(id: string | undefined) {
  return useQuery({
    queryKey: collabPhase2Keys.chapter(id),
    queryFn: () =>
      id ? collabChaptersApi.get(id) : Promise.resolve(null as never),
    enabled: !!id,
    staleTime: 5_000,
  });
}

export function useCreateChapter(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChapterInput) => collabChaptersApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.chapters(researchId) });
      toast.success("챕터가 추가되었습니다");
    },
  });
}

export function useUpdateChapter(researchId: string, chapterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateChapterInput) => collabChaptersApi.update(chapterId, patch),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.chapter(chapterId) });
      qc.invalidateQueries({ queryKey: collabPhase2Keys.chapters(researchId) });
      void logStreak(vars.lastEditedBy, "collab-chapter-edit", chapterId, 2);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "저장 실패");
    },
  });
}

export function useDeleteChapter(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chapterId: string) => collabChaptersApi.remove(chapterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.chapters(researchId) });
      toast.success("챕터가 삭제되었습니다");
    },
  });
}

// ── Comments ──

export function useChapterComments(researchId: string, chapterId: string | undefined) {
  return useQuery({
    queryKey: collabPhase2Keys.comments(chapterId),
    queryFn: () => (chapterId ? collabCommentsApi.listByChapter(researchId, chapterId) : []),
    enabled: !!chapterId,
    staleTime: 10_000,
    refetchInterval: 30_000, // 30초마다 새 댓글 polling
  });
}

export function useMentionsInbox(userId: string | undefined) {
  return useQuery({
    queryKey: collabPhase2Keys.mentionsInbox(userId),
    queryFn: () => (userId ? collabCommentsApi.listMentioningMe(userId) : []),
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
}

export function useCreateComment(chapterId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => collabCommentsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.comments(chapterId) });
    },
  });
}

export function useToggleResolveComment(chapterId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; resolverId: string | null }) =>
      collabCommentsApi.toggleResolve(params.id, params.resolverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.comments(chapterId) });
    },
  });
}

export function useDeleteComment(chapterId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => collabCommentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.comments(chapterId) });
    },
  });
}

// ── Meetings ──

export function useMeetings(researchId: string | undefined) {
  return useQuery({
    queryKey: collabPhase2Keys.meetings(researchId),
    queryFn: () => (researchId ? collabMeetingsApi.listByResearch(researchId) : []),
    enabled: !!researchId,
    staleTime: 15_000,
  });
}

export function useCreateMeeting(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeetingInput) => collabMeetingsApi.create(input),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.meetings(researchId) });
      toast.success("회의가 기록되었습니다");
      void logStreak(created.recordedBy, "collab-meeting", created.id, 3);
    },
  });
}

export function useUpdateMeeting(researchId: string, meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateMeetingInput) => collabMeetingsApi.update(meetingId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.meetings(researchId) });
    },
  });
}

export function useDeleteMeeting(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => collabMeetingsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.meetings(researchId) });
      toast.success("회의 기록이 삭제되었습니다");
    },
  });
}

// ── Milestones ──

export function useMilestones(researchId: string | undefined) {
  return useQuery({
    queryKey: collabPhase2Keys.milestones(researchId),
    queryFn: () => (researchId ? collabMilestonesApi.listByResearch(researchId) : []),
    enabled: !!researchId,
    staleTime: 15_000,
  });
}

export function useMyMilestones(userId: string | undefined) {
  return useQuery({
    queryKey: collabPhase2Keys.myMilestones(userId),
    queryFn: () => (userId ? collabMilestonesApi.listByAssignee(userId) : []),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useCreateMilestone(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneInput) => collabMilestonesApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.milestones(researchId) });
      toast.success("마일스톤이 추가되었습니다");
    },
  });
}

export function useUpdateMilestone(researchId: string, milestoneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateMilestoneInput) => collabMilestonesApi.update(milestoneId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.milestones(researchId) });
    },
  });
}

export function useCompleteMilestone(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; assigneeIds: string[] }) =>
      collabMilestonesApi.complete(params.id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.milestones(researchId) });
      toast.success("마일스톤 완료");
      // 모든 assignee 에게 +5 streak
      for (const uid of vars.assigneeIds) {
        void logStreak(uid, "collab-milestone", vars.id, 5);
      }
    },
  });
}

export function useDeleteMilestone(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => collabMilestonesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabPhase2Keys.milestones(researchId) });
    },
  });
}
