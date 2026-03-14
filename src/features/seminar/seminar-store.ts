import { create } from "zustand";
import type { Seminar, SeminarSession, SeminarAttendee, CheckinResult } from "@/types";
import { MOCK_SEMINARS } from "./seminar-data";

interface SeminarState {
  seminars: Seminar[];
  attendees: SeminarAttendee[];
  addSeminar: (seminar: Omit<Seminar, "id" | "attendeeIds" | "createdAt" | "updatedAt">) => void;
  updateSeminar: (id: string, data: Partial<Seminar>) => void;
  deleteSeminar: (id: string) => void;
  toggleAttendance: (seminarId: string, userId: string, userName?: string, userGeneration?: number) => void;
  addSession: (seminarId: string, session: Omit<SeminarSession, "id" | "seminarId">) => void;
  updateSession: (seminarId: string, sessionId: string, data: Partial<SeminarSession>) => void;
  deleteSession: (seminarId: string, sessionId: string) => void;
  checkinByToken: (token: string, staffUserId: string) => CheckinResult;
  getAttendee: (seminarId: string, userId: string) => SeminarAttendee | undefined;
  getAttendees: (seminarId: string) => SeminarAttendee[];
  getCheckinStats: (seminarId: string) => { total: number; checkedIn: number; remaining: number };
}

// 기존 MOCK_SEMINARS의 attendeeIds로부터 초기 attendees 생성
function buildInitialAttendees(): SeminarAttendee[] {
  const result: SeminarAttendee[] = [];
  const names = ["관리자", "회장님", "운영진A", "졸업생A", "자문위원A", "회원A"];
  for (const sem of MOCK_SEMINARS) {
    for (const uid of sem.attendeeIds) {
      result.push({
        id: `att-${sem.id}-${uid}`,
        seminarId: sem.id,
        userId: uid,
        userName: names[Number(uid) - 1] || `회원${uid}`,
        userGeneration: Number(uid) <= 5 ? 14 : 15,
        qrToken: crypto.randomUUID(),
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null,
        createdAt: sem.createdAt,
      });
    }
  }
  return result;
}

const INITIAL_ATTENDEES = buildInitialAttendees();

export const useSeminarStore = create<SeminarState>((set, get) => ({
  seminars: MOCK_SEMINARS,
  attendees: INITIAL_ATTENDEES,

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
      attendees: state.attendees.filter((a) => a.seminarId !== id),
    })),

  toggleAttendance: (seminarId, userId, userName, userGeneration) =>
    set((state) => {
      const existing = state.attendees.find(
        (a) => a.seminarId === seminarId && a.userId === userId
      );

      if (existing) {
        // 취소: attendee 제거 + attendeeIds에서 제거
        return {
          attendees: state.attendees.filter((a) => a.id !== existing.id),
          seminars: state.seminars.map((s) => {
            if (s.id !== seminarId) return s;
            return {
              ...s,
              attendeeIds: s.attendeeIds.filter((id) => id !== userId),
              updatedAt: new Date().toISOString(),
            };
          }),
        };
      }

      // 신청: attendee 추가 + attendeeIds에 추가
      const newAttendee: SeminarAttendee = {
        id: `att-${Date.now()}-${userId}`,
        seminarId,
        userId,
        userName: userName ?? "회원",
        userGeneration: userGeneration ?? 15,
        qrToken: crypto.randomUUID(),
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null,
        createdAt: new Date().toISOString(),
      };

      return {
        attendees: [...state.attendees, newAttendee],
        seminars: state.seminars.map((s) => {
          if (s.id !== seminarId) return s;
          return {
            ...s,
            attendeeIds: [...s.attendeeIds, userId],
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }),

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

  checkinByToken: (token, staffUserId) => {
    const state = get();
    const attendee = state.attendees.find((a) => a.qrToken === token);

    if (!attendee) {
      return { success: false, message: "등록되지 않은 QR코드입니다." };
    }

    if (attendee.checkedIn) {
      return { success: false, alreadyCheckedIn: true, attendee };
    }

    const updated: SeminarAttendee = {
      ...attendee,
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
      checkedInBy: staffUserId,
    };

    set((state) => ({
      attendees: state.attendees.map((a) => (a.id === attendee.id ? updated : a)),
    }));

    return { success: true, attendee: updated };
  },

  getAttendee: (seminarId, userId) => {
    return get().attendees.find(
      (a) => a.seminarId === seminarId && a.userId === userId
    );
  },

  getAttendees: (seminarId) => {
    return get().attendees.filter((a) => a.seminarId === seminarId);
  },

  getCheckinStats: (seminarId) => {
    const atts = get().attendees.filter((a) => a.seminarId === seminarId);
    const checkedIn = atts.filter((a) => a.checkedIn).length;
    return { total: atts.length, checkedIn, remaining: atts.length - checkedIn };
  },
}));
