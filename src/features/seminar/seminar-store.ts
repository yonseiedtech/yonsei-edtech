import { create } from "zustand";
import { collection, query, where, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SeminarAttendee, CheckinResult } from "@/types";
import { attendeesApi, dataApi, streakEventsApi } from "@/lib/bkend";

/**
 * Checkin-focused store.
 * Attendees are loaded from Firestore via onSnapshot for real-time sync.
 * Local state is used for real-time QR checkin UX.
 */

interface CheckinState {
  attendees: SeminarAttendee[];
  loaded: boolean;

  /** Subscribe to real-time attendee updates for a given seminar */
  loadAttendees: (seminarId: string) => Promise<void>;

  /** Unsubscribe from real-time listener */
  unsubscribe: () => void;

  /** Process QR checkin locally + persist to Firestore */
  checkinByToken: (token: string, staffUserId: string) => CheckinResult;

  /** Process self checkin by name + studentId */
  checkinBySelfInfo: (name: string, studentId: string, staffUserId: string) => CheckinResult;

  getAttendee: (seminarId: string, userId: string) => SeminarAttendee | undefined;
  getAttendees: (seminarId: string) => SeminarAttendee[];
  getCheckinStats: (seminarId: string) => { total: number; checkedIn: number; remaining: number };
}

let _unsubscribe: Unsubscribe | null = null;

export const useSeminarStore = create<CheckinState>((set, get) => ({
  attendees: [],
  loaded: false,

  loadAttendees: async (seminarId: string) => {
    // Clean up previous listener
    if (_unsubscribe) {
      _unsubscribe();
      _unsubscribe = null;
    }

    try {
      const q = query(
        collection(db, "seminar_attendees"),
        where("seminarId", "==", seminarId),
      );

      _unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const attendees = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as unknown as SeminarAttendee[];
          set({ attendees, loaded: true });
        },
        (err) => {
          console.error("[checkin-store] onSnapshot error:", err);
          // Fallback to one-time read
          attendeesApi.list(seminarId).then((res) => {
            const attendees = (res.data ?? []) as unknown as SeminarAttendee[];
            set({ attendees, loaded: true });
          }).catch(() => set({ loaded: true }));
        },
      );
    } catch (err) {
      console.error("[checkin-store] Failed to subscribe:", err);
      // Fallback to one-time read
      try {
        const res = await attendeesApi.list(seminarId);
        const attendees = (res.data ?? []) as unknown as SeminarAttendee[];
        set({ attendees, loaded: true });
      } catch {
        set({ loaded: true });
      }
    }
  },

  unsubscribe: () => {
    if (_unsubscribe) {
      _unsubscribe();
      _unsubscribe = null;
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

    // Persist to Firestore — 실패 시 로컬 상태 롤백
    dataApi
      .patch("seminar_attendees", attendee.id, {
        checkedIn: true,
        checkedInAt: now,
        checkedInBy: staffUserId,
      })
      .then(() => {
        // 보상 원장 통일(2026-07-04): 출석 +10 을 리더보드 원장(streak_events)에 이중 기록
        if (attendee.userId) void streakEventsApi.mirror(attendee.userId, "attend", 10, attendee.seminarId);
        // C-4(2026-07-04): 체크인 직후 후기 유도 — D+1 크론보다 기억이 생생한 당일 터치
        if (attendee.userId) void sendDayOfReviewNudge(attendee.userId, attendee.seminarId);
      })
      .catch((err) => {
        console.error("[checkin-store] Failed to persist checkin:", err);
        set((state) => ({
          attendees: state.attendees.map((a) =>
            a.id === attendee.id ? { ...a, checkedIn: false, checkedInAt: null, checkedInBy: null } : a,
          ),
        }));
      });

    return { success: true, attendee: updated };
  },

  checkinBySelfInfo: (name: string, studentId: string, staffUserId: string) => {
    const state = get();
    // 이름+학번 매칭 (학번 우선, 없으면 이름만)
    let attendee = studentId
      ? state.attendees.find((a) => a.studentId === studentId && a.userName === name)
      : undefined;
    if (!attendee && studentId) {
      attendee = state.attendees.find((a) => a.studentId === studentId);
    }
    if (!attendee) {
      attendee = state.attendees.find((a) => a.userName === name);
    }

    if (!attendee) {
      return { success: false, message: "일치하는 참석자를 찾을 수 없습니다." } as CheckinResult;
    }

    if (attendee.checkedIn) {
      return { success: false, alreadyCheckedIn: true, attendee } as CheckinResult;
    }

    const now = new Date().toISOString();
    const updated: SeminarAttendee = {
      ...attendee,
      checkedIn: true,
      checkedInAt: now,
      checkedInBy: `self_${staffUserId}`,
    };

    set((s) => ({
      attendees: s.attendees.map((a) => (a.id === attendee!.id ? updated : a)),
    }));

    dataApi
      .patch("seminar_attendees", attendee.id, {
        checkedIn: true,
        checkedInAt: now,
        checkedInBy: `self_${staffUserId}`,
      })
      .then(() => {
        if (attendee!.userId) {
          void streakEventsApi.mirror(attendee!.userId, "attend", 10, attendee!.seminarId);
          // QA-v3: 셀프 체크인도 당일 후기 유도 발송 (기존엔 스태프 스캔 경로만 — 비대칭)
          void sendDayOfReviewNudge(attendee!.userId, attendee!.seminarId);
        }
      })
      .catch((err) => {
        console.error("[checkin-store] self checkin persist error:", err);
        set((s) => ({
          attendees: s.attendees.map((a) =>
            a.id === attendee!.id ? { ...a, checkedIn: false, checkedInAt: null, checkedInBy: null } : a,
          ),
        }));
      });

    return { success: true, attendee: updated } as CheckinResult;
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

/** QA-v3: 당일 후기 유도 — 발송 전 refId 기준 dedupe (크론 경로·기기 중복 스캔과 교차 방지) */
async function sendDayOfReviewNudge(userId: string, seminarId: string): Promise<void> {
  try {
    const existing = await dataApi.list("notifications", {
      "filter[userId]": userId,
      "filter[type]": "seminar_review_request",
      "filter[refId]": seminarId,
      limit: 1,
    });
    if (existing.data.length > 0) return;
    await dataApi.create("notifications", {
      userId,
      type: "seminar_review_request",
      refId: seminarId,
      title: "출석 확인 완료 — 오늘 세미나 어떠셨나요?",
      message: "기억이 생생할 때 한 줄 후기를 남겨주세요. 다음 세미나 기획에 큰 도움이 됩니다.",
      link: `/seminars/${seminarId}/review`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch {
    /* 알림 실패는 체크인에 영향 없음 */
  }
}
