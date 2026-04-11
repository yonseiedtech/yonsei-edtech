"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { seminarsApi, sessionsApi, attendeesApi, profilesApi, waitlistApi } from "@/lib/bkend";
import { syncAttendeeIds } from "@/lib/bkend";
import { getComputedStatus } from "@/lib/seminar-utils";
import { notifyNewSeminar, notifyWaitlistPromoted } from "@/features/notifications/notify";
import type { WaitlistEntry } from "@/types";
import type { Seminar, SeminarSession, SeminarAttendee, User } from "@/types";

// ── List ──

export function useSeminars(status?: Seminar["status"]) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["seminars", status],
    queryFn: async () => {
      // 전체 조회 후 getComputedStatus로 클라이언트 필터링 (DB status는 날짜 기반 자동 계산과 불일치 가능)
      const res = await seminarsApi.list({ limit: 200 });
      const all = res.data as unknown as Seminar[];
      if (!status) return all;
      return all.filter((s) => getComputedStatus(s) === status);
    },
    retry: false,
  });

  return { seminars: data ?? [], isLoading, error };
}

// ── Detail ──

export function useSeminar(id: string) {
  const { data } = useQuery({
    queryKey: ["seminars", id],
    queryFn: async () => {
      const res = await seminarsApi.get(id);
      return res as unknown as Seminar;
    },
    retry: false,
    enabled: !!id,
  });

  return data ?? null;
}

// ── Create ──

export function useCreateSeminar() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: Omit<Seminar, "id" | "attendeeIds" | "createdAt" | "updatedAt">) => {
      const res = await seminarsApi.create(data as unknown as Record<string, unknown>);
      const created = res as unknown as Seminar;
      notifyNewSeminar(data.title, created.id, data.createdBy);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
    },
  });

  return { createSeminar: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Update ──

export function useUpdateSeminar() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Seminar> }) => {
      return await seminarsApi.update(id, data as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
    },
  });

  return { updateSeminar: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Delete ──

export function useDeleteSeminar() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      return await seminarsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
    },
  });

  return { deleteSeminar: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Toggle Attendance ──

export function useToggleAttendance() {
  const queryClient = useQueryClient();

  function invalidateAll(seminarId: string) {
    queryClient.invalidateQueries({ queryKey: ["seminars"] });
    queryClient.invalidateQueries({ queryKey: ["attendees"] });
    queryClient.invalidateQueries({ queryKey: ["waitlist", seminarId] });
  }

  /** 대기열 1번을 참가자로 승격 */
  async function promoteFromWaitlist(seminarId: string, seminarTitle: string) {
    try {
      const wlRes = await waitlistApi.list(seminarId);
      const waiting = (wlRes.data as unknown as WaitlistEntry[]).filter((w) => w.status === "waiting");
      if (waiting.length === 0) return;
      const first = waiting.sort((a, b) => a.position - b.position)[0];
      // 참가자로 추가
      const res = await attendeesApi.add(seminarId, first.userId);
      const newId = (res as Record<string, unknown>)?.id as string;
      try {
        await syncAttendeeIds(seminarId, first.userId, "add");
      } catch {
        if (newId) try { await attendeesApi.remove(newId); } catch { /* best effort */ }
        return;
      }
      // 대기열 상태 변경
      await waitlistApi.update(first.id, { status: "promoted", promotedAt: new Date().toISOString() });
      // 알림
      notifyWaitlistPromoted(first.userId, seminarTitle, seminarId);
    } catch {
      // 승격 실패는 메인 로직 블로킹하지 않음
    }
  }

  async function toggle(seminarId: string, userId: string, seminarTitle?: string) {
    const existing = await attendeesApi.check(seminarId, userId);
    if (existing.data.length > 0) {
      // 참석 취소
      const attendeeId = (existing.data[0] as Record<string, unknown>).id as string;
      try {
        await attendeesApi.remove(attendeeId);
        await syncAttendeeIds(seminarId, userId, "remove");
      } catch (err) {
        try { await attendeesApi.add(seminarId, userId); } catch { /* best effort */ }
        throw err;
      }
      // 대기열에서 자동 승격
      if (seminarTitle) await promoteFromWaitlist(seminarId, seminarTitle);
    } else {
      let newAttendeeId: string | undefined;
      try {
        const res = await attendeesApi.add(seminarId, userId);
        newAttendeeId = (res as Record<string, unknown>)?.id as string;
        await syncAttendeeIds(seminarId, userId, "add");
      } catch (err) {
        if (newAttendeeId) {
          try { await attendeesApi.remove(newAttendeeId); } catch { /* best effort */ }
        }
        throw err;
      }
    }
    invalidateAll(seminarId);
  }

  return { toggleAttendance: toggle };
}

// ── Waitlist ──

export function useWaitlist(seminarId: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["waitlist", seminarId],
    queryFn: async () => {
      const res = await waitlistApi.list(seminarId);
      return res.data as unknown as WaitlistEntry[];
    },
    retry: false,
    enabled: !!seminarId,
  });

  return { waitlist: (data ?? []).filter((w) => w.status === "waiting"), allWaitlist: data ?? [], isLoading, refetch };
}

export function useJoinWaitlist() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ seminarId, userId, userName }: { seminarId: string; userId: string; userName: string }) => {
      // 이미 대기 중인지 확인
      const existing = await waitlistApi.check(seminarId, userId);
      const waiting = (existing.data as unknown as WaitlistEntry[]).filter((w) => w.status === "waiting");
      if (waiting.length > 0) throw new Error("이미 대기열에 등록되어 있습니다.");
      // 현재 대기열 최대 순번
      const all = await waitlistApi.list(seminarId);
      const maxPos = (all.data as unknown as WaitlistEntry[]).reduce((m, w) => Math.max(m, w.position), 0);
      return await waitlistApi.create({
        seminarId,
        userId,
        userName,
        position: maxPos + 1,
        status: "waiting",
      });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["waitlist", vars.seminarId] });
    },
  });

  return { joinWaitlist: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useCancelWaitlist() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ entryId, seminarId }: { entryId: string; seminarId: string }) => {
      await waitlistApi.update(entryId, { status: "cancelled" });
      return seminarId;
    },
    onSuccess: (seminarId) => {
      queryClient.invalidateQueries({ queryKey: ["waitlist", seminarId] });
    },
  });

  return { cancelWaitlist: mutation.mutateAsync, isLoading: mutation.isPending };
}

// ── Attendees ──

export function useAttendees(seminarId: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["attendees", seminarId],
    queryFn: async () => {
      const res = await attendeesApi.list(seminarId);
      return res.data as unknown as SeminarAttendee[];
    },
    retry: false,
    enabled: !!seminarId,
  });

  return { attendees: data ?? [], isLoading, refetch };
}

export function useAttendee(seminarId: string, userId: string) {
  const { data } = useQuery({
    queryKey: ["attendees", seminarId, userId],
    queryFn: async () => {
      const res = await attendeesApi.check(seminarId, userId);
      return (res.data[0] as unknown as SeminarAttendee) ?? null;
    },
    retry: false,
    enabled: !!seminarId && !!userId,
  });

  return data ?? null;
}

export function useCheckinStats(seminarId: string) {
  const { attendees } = useAttendees(seminarId);
  const total = attendees.length;
  const checkedIn = attendees.filter((a) => a.checkedIn).length;
  return { total, checkedIn, remaining: total - checkedIn };
}

// ── Staff Members (운영진 목록) ──

export function useStaffMembers() {
  const { data, isLoading } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const [staff, presidents, admins] = await Promise.all([
        profilesApi.list({ "filter[role]": "staff", "filter[approved]": "true", limit: 50 }),
        profilesApi.list({ "filter[role]": "president", "filter[approved]": "true", limit: 10 }),
        profilesApi.list({ "filter[role]": "admin", "filter[approved]": "true", limit: 10 }),
      ]);
      return [
        ...presidents.data,
        ...staff.data,
        ...admins.data,
      ] as unknown as User[];
    },
    retry: false,
  });

  return { staffMembers: data ?? [], isLoading };
}

// ── Sessions ──

export function useSessions(seminarId: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sessions", seminarId],
    queryFn: async () => {
      const res = await sessionsApi.list(seminarId);
      return res.data as unknown as SeminarSession[];
    },
    retry: false,
    enabled: !!seminarId,
  });

  return { sessions: data ?? [], isLoading, refetch };
}

function invalidateSessions(qc: ReturnType<typeof useQueryClient>, seminarId?: string) {
  if (seminarId) qc.invalidateQueries({ queryKey: ["sessions", seminarId] });
  qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "sessions" });
  qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "seminars" });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ seminarId, data }: { seminarId: string; data: Omit<SeminarSession, "id" | "seminarId"> }) => {
      return await sessionsApi.create({ seminarId, ...data } as unknown as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      invalidateSessions(queryClient, variables.seminarId);
    },
  });

  return { createSession: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ sessionId, data }: { seminarId: string; sessionId: string; data: Partial<SeminarSession> }) => {
      return await sessionsApi.update(sessionId, data as unknown as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      invalidateSessions(queryClient, variables.seminarId);
    },
  });

  return { updateSession: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ sessionId }: { seminarId: string; sessionId: string }) => {
      return await sessionsApi.delete(sessionId);
    },
    onSuccess: (_data, variables) => {
      invalidateSessions(queryClient, variables.seminarId);
    },
  });

  return { deleteSession: mutation.mutateAsync, isLoading: mutation.isPending };
}
