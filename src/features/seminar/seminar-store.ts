import { create } from "zustand";
import type { SeminarAttendee, CheckinResult } from "@/types";
import { attendeesApi, dataApi } from "@/lib/bkend";

/**
 * Checkin-focused store.
 * Attendees are loaded from Firestore, not MOCK data.
 * Local state is used for real-time QR checkin UX.
 */

interface CheckinState {
  attendees: SeminarAttendee[];
  loaded: boolean;

  /** Load attendees from Firestore for a given seminar */
  loadAttendees: (seminarId: string) => Promise<void>;

  /** Process QR checkin locally + persist to Firestore */
  checkinByToken: (token: string, staffUserId: string) => CheckinResult;

  getAttendee: (seminarId: string, userId: string) => SeminarAttendee | undefined;
  getAttendees: (seminarId: string) => SeminarAttendee[];
  getCheckinStats: (seminarId: string) => { total: number; checkedIn: number; remaining: number };
}

export const useSeminarStore = create<CheckinState>((set, get) => ({
  attendees: [],
  loaded: false,

  loadAttendees: async (seminarId: string) => {
    try {
      const res = await attendeesApi.list(seminarId);
      const attendees = (res.data ?? []) as unknown as SeminarAttendee[];
      set({ attendees, loaded: true });
    } catch (err) {
      console.error("[checkin-store] Failed to load attendees:", err);
      set({ loaded: true });
    }
  },

  checkinByToken: (token, staffUserId) => {
    const state = get();
    const attendee = state.attendees.find((a) => a.qrToken === token);

    if (!attendee) {
      return { success: false, message: "등록되지 않은 QR코드입니다." };
    }

    if (attendee.checkedIn) {
      return { success: false, alreadyCheckedIn: true, attendee };
    }

    const now = new Date().toISOString();
    const updated: SeminarAttendee = {
      ...attendee,
      checkedIn: true,
      checkedInAt: now,
      checkedInBy: staffUserId,
    };

    // Update local state immediately for real-time UX
    set((state) => ({
      attendees: state.attendees.map((a) => (a.id === attendee.id ? updated : a)),
    }));

    // Persist to Firestore (fire-and-forget for UX speed)
    dataApi
      .patch("seminar_attendees", attendee.id, {
        checkedIn: true,
        checkedInAt: now,
        checkedInBy: staffUserId,
      })
      .catch((err) => console.error("[checkin-store] Failed to persist checkin:", err));

    return { success: true, attendee: updated };
  },

  getAttendee: (seminarId, userId) => {
    return get().attendees.find(
      (a) => a.seminarId === seminarId && a.userId === userId,
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
