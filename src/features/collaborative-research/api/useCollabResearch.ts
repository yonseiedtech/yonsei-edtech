// ────────────────────────────────────────────────────────────
// features/collaborative-research/api/useCollabResearch.ts
//
// React Query hooks 5종 (목록·단건·멤버·invite·mutations) 한 파일에 모음.
// (별도 파일로 잘게 분리하지 않음 — Phase 1 규모에서는 1 파일 모듈이 더 추적 쉬움)
// ────────────────────────────────────────────────────────────

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifyCollabInvite } from "@/features/notifications/notify";
import { toast } from "sonner";
import {
  collabResearchApi,
  collabMembersApi,
  collabInvitesApi,
} from "@/lib/bkend";
import type {
  CollabMemberRole,
  CollaborativeResearch,
  CreateCollabInviteInput,
  CreateCollabResearchInput,
  CreditRole,
  UpdateCollabResearchInput,
} from "@/types";

// ── Query keys ──
export const collabResearchKeys = {
  all: ["collab-research"] as const,
  list: (userId: string | undefined) =>
    [...collabResearchKeys.all, "list", userId] as const,
  detail: (researchId: string | undefined) =>
    [...collabResearchKeys.all, "detail", researchId] as const,
  members: (researchId: string | undefined) =>
    [...collabResearchKeys.all, "members", researchId] as const,
  society: () => [...collabResearchKeys.all, "society"] as const,
};

export const collabInviteKeys = {
  all: ["collab-invites"] as const,
  inbox: (userId: string | undefined) =>
    [...collabInviteKeys.all, "inbox", userId] as const,
  sent: (researchId: string | undefined) =>
    [...collabInviteKeys.all, "sent", researchId] as const,
};

// ── Queries ──

/** 내가 참여 중인 연구 목록 */
export function useCollabResearchList(userId: string | undefined) {
  return useQuery({
    queryKey: collabResearchKeys.list(userId),
    queryFn: async () => (userId ? collabResearchApi.listByUser(userId) : []),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/** 단일 연구 상세 */
export function useCollabResearch(researchId: string | undefined) {
  return useQuery({
    queryKey: collabResearchKeys.detail(researchId),
    queryFn: () =>
      researchId
        ? collabResearchApi.get(researchId)
        : Promise.resolve(null as CollaborativeResearch | null),
    enabled: !!researchId,
    staleTime: 10_000,
  });
}

/** 연구의 멤버 목록 */
export function useCollabMembers(researchId: string | undefined) {
  return useQuery({
    queryKey: collabResearchKeys.members(researchId),
    queryFn: () => (researchId ? collabMembersApi.listByResearch(researchId) : []),
    enabled: !!researchId,
    staleTime: 15_000,
  });
}

/** 내 inbox (받은 초대 pending) — 1분 폴링 */
export function useCollabInboxInvites(userId: string | undefined) {
  return useQuery({
    queryKey: collabInviteKeys.inbox(userId),
    queryFn: () => (userId ? collabInvitesApi.listInbox(userId) : []),
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** 연구에서 보낸 초대 목록 (leader 화면용) */
export function useCollabSentInvites(researchId: string | undefined) {
  return useQuery({
    queryKey: collabInviteKeys.sent(researchId),
    queryFn: () => (researchId ? collabInvitesApi.listSent(researchId) : []),
    enabled: !!researchId,
    staleTime: 20_000,
  });
}

// ── Mutations ──

export function useCreateCollabResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCollabResearchInput) => collabResearchApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabResearchKeys.all });
      toast.success("연구팀이 생성되었습니다");
    },
    onError: (err) => {
      console.error("[useCreateCollabResearch]", err);
      toast.error("연구팀 생성 실패 — 잠시 후 다시 시도");
    },
  });
}

export function useUpdateCollabResearch(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateCollabResearchInput) =>
      collabResearchApi.update(researchId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabResearchKeys.detail(researchId) });
      qc.invalidateQueries({ queryKey: collabResearchKeys.all });
      toast.success("저장되었습니다");
    },
  });
}

export function useDeleteCollabResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (researchId: string) => collabResearchApi.remove(researchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabResearchKeys.all });
      toast.success("연구팀이 삭제되었습니다");
    },
  });
}

export function useCreateCollabInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      input: CreateCollabInviteInput & {
        senderId: string;
        senderName: string;
        researchTitle: string;
        recipientEmail?: string;
      },
    ) => collabInvitesApi.create(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: collabInviteKeys.sent(vars.researchId) });
      toast.success("초대를 보냈습니다");
      // 리텐션(2026-07-04): 수신자 인앱 알림 — /collab 에 들어가야만 보이던 초대를 벨로 연결
      void notifyCollabInvite(vars.recipientId, vars.senderName, vars.researchTitle);
    },
    onError: (err) => {
      console.error("[useCreateCollabInvite]", err);
      toast.error("초대 발송 실패");
    },
  });
}

export function useAcceptCollabInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { inviteId: string; recipientId: string }) =>
      collabInvitesApi.accept(params.inviteId, params.recipientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabResearchKeys.all });
      qc.invalidateQueries({ queryKey: collabInviteKeys.all });
      toast.success("연구팀에 참여했습니다");
    },
    onError: (err) => {
      console.error("[useAcceptCollabInvite]", err);
      toast.error("수락 실패 — 잠시 후 다시 시도");
    },
  });
}

export function useRejectCollabInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => collabInvitesApi.reject(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabInviteKeys.all });
      toast("초대를 거절했습니다");
    },
  });
}

export function useCancelCollabInvite(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => collabInvitesApi.cancel(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabInviteKeys.sent(researchId) });
      toast("초대를 취소했습니다");
    },
  });
}

export function useUpdateMemberRole(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { memberId: string; role: CollabMemberRole }) =>
      collabMembersApi.updateRole(params.memberId, params.role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabResearchKeys.members(researchId) });
    },
  });
}

export function useUpdateMemberCreditRoles(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { memberId: string; creditRoles: CreditRole[] }) =>
      collabMembersApi.updateCreditRoles(params.memberId, params.creditRoles),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabResearchKeys.members(researchId) });
    },
  });
}

export function useUpdateSelfMemberMeta(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      memberId: string;
      affiliation?: string;
      orcidId?: string;
    }) =>
      collabMembersApi.updateSelfMeta(params.memberId, {
        affiliation: params.affiliation,
        orcidId: params.orcidId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabResearchKeys.members(researchId) });
      toast.success("저장되었습니다");
    },
  });
}

export function useRemoveMember(researchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => collabMembersApi.remove(memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabResearchKeys.members(researchId) });
      qc.invalidateQueries({ queryKey: collabResearchKeys.detail(researchId) });
      toast.success("멤버가 제거되었습니다");
    },
  });
}

export function useLeaveCollabResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => collabMembersApi.leave(memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabResearchKeys.all });
      toast("연구팀에서 탈퇴했습니다");
    },
  });
}
