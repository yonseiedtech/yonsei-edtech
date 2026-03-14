"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSeminarStore } from "./seminar-store";
import { seminarsApi, sessionsApi, attendeesApi } from "@/lib/bkend";
import type { Seminar } from "@/types";

export function useSeminars(status?: Seminar["status"]) {
  const storeSeminars = useSeminarStore((s) => s.seminars);

  const { data } = useQuery({
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

  return seminars;
}

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

  return { createSeminar: mutation.mutateAsync };
}

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
        // 이미 등록됨 → 삭제
        const attendeeId = (existing.data[0] as Record<string, unknown>).id as string;
        await attendeesApi.remove(attendeeId);
      } else {
        // 미등록 → 추가
        await attendeesApi.add(seminarId, userId);
      }
      queryClient.invalidateQueries({ queryKey: ["seminars"] });
    } catch {
      // bkend 실패 → store만 사용 (이미 업데이트됨)
    }
  }

  return { toggleAttendance: toggle };
}
