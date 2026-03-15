"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSeminarStore } from "./seminar-store";
import { seminarsApi, sessionsApi, attendeesApi } from "@/lib/bkend";
import type { Seminar, SeminarSession, SeminarAttendee } from "@/types";

// ── List ──

export function useSeminars(status?: Seminar["status"]) {
  const storeSeminars = useSeminarStore((s) => s.seminars);

  const { data, isLoading } = useQuery({
    queryKey: ["seminars", status],
    queryFn: async () => {
      const res = await seminarsApi.list({ status, limit: 100 });
      return res.data as unknown as Seminar[];
    },
    placeholderData: () => {
      if (!status) return storeSeminars;
      return storeSeminars.filter((s) => s.status === status);
    },
    retry: false,
  });

  const seminars = data ?? (
    !status ? storeSeminars : storeSeminars.filter((s) => s.status === status)
  );

  return { seminars, isLoading };
}

// ── Detail ──

export function useSeminar(id: string) {
  const storeSeminar = useSeminarStore((s) => s.seminars.find((sem) => sem.id === id));

  const { data } = useQuery({
    queryKey: ["seminars", id],
    queryFn: async () => {
      const res = await seminarsApi.get(id);
      return res as unknown as Seminar;
    },
    placeholderData: () => storeSeminar,
    retry: false,
    enabled: !!id,
  });

  return data ?? storeSeminar;
}

// ── Create ──

export function useCreateSeminar() {
  const queryClient = useQueryClient();
  const addSeminar = useSeminarStore((s) => s.addSeminar);

  const mutation = useMutation({
    mutationFn: async (data: Omit<Seminar, "id" | "attendeeIds" | "createdAt" | "updatedAt">) => {
      try {
        return await seminarsApi.create(data as unknown as Record<string, unknown>);
      } catch {
        addSeminar(data);
        return null;
      }
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
  const updateSeminar = useSeminarStore((s) => s.updateSeminar);

  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Seminar> }) => {
      try {
        return await seminarsApi.update(id, data as unknown as Record<string, unknown>);
      } catch {
        updateSeminar(id, data);
        return null;
      }
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
  const deleteSeminar = useSeminarStore((s) => s.deleteSeminar);

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await seminarsApi.delete(id);
      } catch {
        deleteSeminar(id);
        return null;
      }
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
  const toggleAttendance = useSeminarStore((s) => s.toggleAttendance);

  async function toggle(seminarId: string, userId: string, userName?: string, userGeneration?: number) {
    // Store 업데이트 (즉시 UI 반영)
    toggleAttendance(seminarId, userId, userName, userGeneration);

    // bkend API 시도
    try {
      const existing = await attendeesApi.check(seminarId, userId);
      if (existing.data.length > 0) {
        const attendeeId = (existing.data[0] as Record<string, unknown>).id as string;
        await attendeesApi.remove(attendeeId);
      } else {
        await attendeesApi.add(seminarId, userId);
      }
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
      queryClient.invalidateQueries({ queryKey: ["attendees"] });
    } catch {
      // bkend 실패 → store만 사용 (이미 업데이트됨)
    }
  }

  return { toggleAttendance: toggle };
}

// ── Attendees ──

export function useAttendees(seminarId: string) {
  const storeAttendees = useSeminarStore((s) => s.getAttendees(seminarId));

  const { data, isLoading } = useQuery({
    queryKey: ["attendees", seminarId],
    queryFn: async () => {
      const res = await attendeesApi.list(seminarId);
      return res.data as unknown as SeminarAttendee[];
    },
    placeholderData: () => storeAttendees,
    retry: false,
    enabled: !!seminarId,
  });

  const attendees = data ?? storeAttendees;

  return { attendees, isLoading };
}

export function useAttendee(seminarId: string, userId: string) {
  const storeAttendee = useSeminarStore((s) => s.getAttendee(seminarId, userId));

  const { data } = useQuery({
    queryKey: ["attendees", seminarId, userId],
    queryFn: async () => {
      const res = await attendeesApi.check(seminarId, userId);
      return (res.data[0] as unknown as SeminarAttendee) ?? undefined;
    },
    placeholderData: () => storeAttendee,
    retry: false,
    enabled: !!seminarId && !!userId,
  });

  return data ?? storeAttendee;
}

export function useCheckinStats(seminarId: string) {
  const storeStats = useSeminarStore((s) => s.getCheckinStats(seminarId));
  // For now, delegate to store since bkend may not have checkin fields
  return storeStats;
}

// ── Sessions ──

export function useSessions(seminarId: string) {
  const storeSeminar = useSeminarStore((s) => s.seminars.find((sem) => sem.id === seminarId));
  const storeSessions = storeSeminar?.sessions ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["sessions", seminarId],
    queryFn: async () => {
      const res = await sessionsApi.list(seminarId);
      return res.data as unknown as SeminarSession[];
    },
    placeholderData: () => storeSessions,
    retry: false,
    enabled: !!seminarId,
  });

  return { sessions: data ?? storeSessions, isLoading };
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const addSession = useSeminarStore((s) => s.addSession);

  const mutation = useMutation({
    mutationFn: async ({ seminarId, data }: { seminarId: string; data: Omit<SeminarSession, "id" | "seminarId"> }) => {
      try {
        return await sessionsApi.create({ seminarId, ...data } as unknown as Record<string, unknown>);
      } catch {
        addSession(seminarId, data);
        return null;
      }
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
  const updateSession = useSeminarStore((s) => s.updateSession);

  const mutation = useMutation({
    mutationFn: async ({ seminarId, sessionId, data }: { seminarId: string; sessionId: string; data: Partial<SeminarSession> }) => {
      try {
        return await sessionsApi.update(sessionId, data as unknown as Record<string, unknown>);
      } catch {
        updateSession(seminarId, sessionId, data);
        return null;
      }
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
  const deleteSession = useSeminarStore((s) => s.deleteSession);

  const mutation = useMutation({
    mutationFn: async ({ seminarId, sessionId }: { seminarId: string; sessionId: string }) => {
      try {
        return await sessionsApi.delete(sessionId);
      } catch {
        deleteSession(seminarId, sessionId);
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
    },
  });

  return { deleteSession: mutation.mutateAsync, isLoading: mutation.isPending };
}
