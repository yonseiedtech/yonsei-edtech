import { create } from "zustand";
import type { Seminar, SeminarSession } from "@/types";
import { MOCK_SEMINARS } from "./seminar-data";

interface SeminarState {
  seminars: Seminar[];
  addSeminar: (seminar: Omit<Seminar, "id" | "attendeeIds" | "createdAt" | "updatedAt">) => void;
  updateSeminar: (id: string, data: Partial<Seminar>) => void;
  deleteSeminar: (id: string) => void;
  toggleAttendance: (seminarId: string, userId: string) => void;
  addSession: (seminarId: string, session: Omit<SeminarSession, "id" | "seminarId">) => void;
  updateSession: (seminarId: string, sessionId: string, data: Partial<SeminarSession>) => void;
  deleteSession: (seminarId: string, sessionId: string) => void;
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

  addSession: (seminarId, session) =>
    set((state) => ({
      seminars: state.seminars.map((s) => {
        if (s.id !== seminarId) return s;
        const newSession: SeminarSession = {
          ...session,
          id: `ss${Date.now()}`,
          seminarId,
        };
        return {
          ...s,
          sessions: [...(s.sessions ?? []), newSession],
          updatedAt: new Date().toISOString(),
        };
      }),
    })),

  updateSession: (seminarId, sessionId, data) =>
    set((state) => ({
      seminars: state.seminars.map((s) => {
        if (s.id !== seminarId) return s;
        return {
          ...s,
          sessions: (s.sessions ?? []).map((sess) =>
            sess.id === sessionId ? { ...sess, ...data } : sess
          ),
          updatedAt: new Date().toISOString(),
        };
      }),
    })),

  deleteSession: (seminarId, sessionId) =>
    set((state) => ({
      seminars: state.seminars.map((s) => {
        if (s.id !== seminarId) return s;
        return {
          ...s,
          sessions: (s.sessions ?? []).filter((sess) => sess.id !== sessionId),
          updatedAt: new Date().toISOString(),
        };
      }),
    })),
}));
