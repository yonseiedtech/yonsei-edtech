import { create } from "zustand";
import type { Seminar } from "@/types";
import { MOCK_SEMINARS } from "./seminar-data";

interface SeminarState {
  seminars: Seminar[];
  addSeminar: (seminar: Omit<Seminar, "id" | "attendeeIds" | "createdAt" | "updatedAt">) => void;
  updateSeminar: (id: string, data: Partial<Seminar>) => void;
  deleteSeminar: (id: string) => void;
  toggleAttendance: (seminarId: string, userId: string) => void;
}

export const useSeminarStore = create<SeminarState>((set) => ({
  seminars: MOCK_SEMINARS,

  addSeminar: (data) =>
    set((state) => ({
      seminars: [
        {
          ...data,
          id: `s${Date.now()}`,
          attendeeIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...state.seminars,
      ],
    })),

  updateSeminar: (id, data) =>
    set((state) => ({
      seminars: state.seminars.map((s) =>
        s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
      ),
    })),

  deleteSeminar: (id) =>
    set((state) => ({
      seminars: state.seminars.filter((s) => s.id !== id),
    })),

  toggleAttendance: (seminarId, userId) =>
    set((state) => ({
      seminars: state.seminars.map((s) => {
        if (s.id !== seminarId) return s;
        const attending = s.attendeeIds.includes(userId);
        return {
          ...s,
          attendeeIds: attending
            ? s.attendeeIds.filter((id) => id !== userId)
            : [...s.attendeeIds, userId],
          updatedAt: new Date().toISOString(),
        };
      }),
    })),
}));
