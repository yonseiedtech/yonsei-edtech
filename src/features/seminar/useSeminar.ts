"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { seminarsApi, sessionsApi, attendeesApi, profilesApi } from "@/lib/bkend";
import { syncAttendeeIds } from "@/lib/bkend";
import type { Seminar, SeminarSession, SeminarAttendee, User } from "@/types";

// ── List ──

export function useSeminars(status?: Seminar["status"]) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["seminars", status],
    queryFn: async () => {
      const res = await seminarsApi.list({ status, limit: 100 });
      return res.data as unknown as Seminar[];
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
      return await seminarsApi.create(data as unknown as Record<string, unknown>);
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

  async function toggle(seminarId: string, userId: string) {
    const existing = await attendeesApi.check(seminarId, userId);
    if (existing.data.length > 0) {
      const attendeeId = (existing.data[0] as Record<string, unknown>).id as string;
      try {
        await attendeesApi.remove(attendeeId);
        await syncAttendeeIds(seminarId, userId, "remove");
      } catch (err) {
        // Rollback: re-add attendee if sync failed
        try { await attendeesApi.add(seminarId, userId); } catch { /* best effort */ }
        throw err;
      }
    } else {
      let newAttendeeId: string | undefined;
      try {
        const res = await attendeesApi.add(seminarId, userId);
        newAttendeeId = (res as Record<string, unknown>)?.id as string;
        await syncAttendeeIds(seminarId, userId, "add");
      } catch (err) {
        // Rollback: remove attendee if sync failed
        if (newAttendeeId) {
          try { await attendeesApi.remove(newAttendeeId); } catch { /* best effort */ }
        }
        throw err;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["seminars"] });
    queryClient.invalidateQueries({ queryKey: ["attendees"] });
  }

  return { toggleAttendance: toggle };
}

// ── Attendees ──

export function useAttendees(seminarId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["attendees", seminarId],
    queryFn: async () => {
      const res = await attendeesApi.list(seminarId);
      return res.data as unknown as SeminarAttendee[];
    },
    retry: false,
    enabled: !!seminarId,
  });

  return { attendees: data ?? [], isLoading };
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
  const { data, isLoading } = useQuery({
    queryKey: ["sessions", seminarId],
    queryFn: async () => {
      const res = await sessionsApi.list(seminarId);
      return res.data as unknown as SeminarSession[];
    },
    retry: false,
    enabled: !!seminarId,
  });

  return { sessions: data ?? [], isLoading };
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ seminarId, data }: { seminarId: string; data: Omit<SeminarSession, "id" | "seminarId"> }) => {
      return await sessionsApi.create({ seminarId, ...data } as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
    },
  });

  return { deleteSession: mutation.mutateAsync, isLoading: mutation.isPending };
}
