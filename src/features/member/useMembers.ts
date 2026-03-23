"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profilesApi, dataApi } from "@/lib/bkend";
import type { User, UserRole } from "@/types";

// ── 승인된 회원 목록 ──

export function useMembers(options?: {
  generation?: number;
  role?: UserRole;
  approved?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["members", options],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = {
        limit: 200,
        // sort를 제거: Firestore에서 where + orderBy 복합 인덱스 없이 사용 불가
      };
      if (options?.approved !== undefined) {
        params["filter[approved]"] = String(options.approved);
      } else {
        params["filter[approved]"] = "true";
      }
      if (options?.generation) {
        params["filter[generation]"] = options.generation;
      }
      if (options?.role) {
        params["filter[role]"] = options.role;
      }
      const res = await profilesApi.list(params);
      const members = res.data as unknown as User[];
      // 클라이언트 정렬 (기수 내림차순, 이름 오름차순)
      members.sort((a, b) => {
        if (a.generation !== b.generation) return (b.generation ?? 0) - (a.generation ?? 0);
        return (a.name ?? "").localeCompare(b.name ?? "");
      });
      return { members, total: res.total };
    },
    retry: false,
  });

  return {
    members: data?.members ?? [],
    total: data?.total ?? 0,
    isLoading,
  };
}

// ── 전체 회원 (승인 여부 무관, 관리자용) ──

export function useAllMembers() {
  const { data, isLoading } = useQuery({
    queryKey: ["members", "all"],
    queryFn: async () => {
      const res = await profilesApi.list({
        limit: 500,
      });
      const users = res.data as unknown as User[];
      return users.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    },
    retry: false,
  });

  return { members: data ?? [], isLoading };
}

// ── 미승인 회원 (관리자용) ──

export function usePendingMembers() {
  const { data, isLoading } = useQuery({
    queryKey: ["members", "pending"],
    queryFn: async () => {
      // sort를 제거: Firestore에서 where + orderBy 복합 인덱스 없이 사용 불가
      const res = await profilesApi.list({
        "filter[approved]": "false",
        limit: 100,
      });
      const users = res.data as unknown as User[];
      // 클라이언트 정렬 (최신순)
      return users.sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
      );
    },
    retry: false,
  });

  return { pendingMembers: data ?? [], isLoading };
}

// ── 프로필 수정 ──

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return await profilesApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  return { updateProfile: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── 회원 승인 ──

export function useApproveMember() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      return await profilesApi.approve(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  return { approveMember: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── 회원 거부 ──

export function useRejectMember() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      return await profilesApi.update(id, { approved: false, rejected: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  return { rejectMember: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── 역할 변경 ──

export function useChangeRole() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      return await profilesApi.update(id, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  return { changeRole: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── 수기 회원 추가 ──

export function useCreateMember() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      username: string;
      role: UserRole;
      generation: number;
      field: string;
    }) => {
      return await dataApi.create("users", {
        ...data,
        approved: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  return { createMember: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── 일괄 역할 변경 (운영진 교체) ──

export function useBulkChangeRoles() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (changes: { id: string; role: UserRole }[]) => {
      return await Promise.all(
        changes.map((c) => profilesApi.update(c.id, { role: c.role }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  return { bulkChangeRoles: mutation.mutateAsync, isLoading: mutation.isPending };
}
