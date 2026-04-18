import { create } from "zustand";
import type { StudySessionType } from "@/types";

const LS_KEY = "studyTimer";

interface ActiveSession {
  id: string;
  type: StudySessionType;
  paperId?: string;
  writingPaperId?: string;
  targetTitle: string;
  startTime: number;
}

type StopHandler = (session: ActiveSession) => void;

interface StudyTimerState {
  active: ActiveSession | null;
  elapsed: number;
  isPaused: boolean;
  pausedAt: number | null;
  /** 4시간 초과로 자동 폐기된 세션의 메타. UI에서 토스트/모달로 안내 후 acknowledgeGhost로 비움. */
  ghost: { targetTitle: string; startTime: number; type: StudySessionType } | null;
  /** ChatWidget이 등록하는 종료 핸들러 (실제 API 호출). */
  onStop: StopHandler | null;
  setStopHandler: (h: StopHandler | null) => void;

  start: (session: ActiveSession) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  tick: () => void;
  restore: () => void;
  acknowledgeGhost: () => void;
  clear: () => void;
}

function save(active: ActiveSession | null, pausedAt: number | null) {
  if (!active) {
    localStorage.removeItem(LS_KEY);
    return;
  }
  localStorage.setItem(LS_KEY, JSON.stringify({ active, pausedAt }));
}

function load(): { active: ActiveSession; pausedAt: number | null } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const useStudyTimerStore = create<StudyTimerState>((set, get) => ({
  active: null,
  elapsed: 0,
  isPaused: false,
  pausedAt: null,
  ghost: null,
  onStop: null,

  setStopHandler: (h) => set({ onStop: h }),

  start: (session) => {
    const prev = get().active;
    if (prev) {
      // 동시 세션 silent guard: 기존 세션 자동 종료
      get().onStop?.(prev);
    }
    set({ active: session, elapsed: 0, isPaused: false, pausedAt: null });
    save(session, null);
  },

  pause: () => {
    const now = Date.now();
    set({ isPaused: true, pausedAt: now });
    save(get().active, now);
  },

  resume: () => {
    const { active, pausedAt } = get();
    if (!active || !pausedAt) return;
    const pauseDuration = Date.now() - pausedAt;
    const adjusted = { ...active, startTime: active.startTime + pauseDuration };
    set({ active: adjusted, isPaused: false, pausedAt: null });
    save(adjusted, null);
  },

  stop: () => {
    const { active, onStop } = get();
    if (!active) return;
    onStop?.(active);
    set({ active: null, elapsed: 0, isPaused: false, pausedAt: null });
    localStorage.removeItem(LS_KEY);
  },

  tick: () => {
    const { active, isPaused } = get();
    if (!active || isPaused) return;
    const now = Date.now();
    set({ elapsed: Math.floor((now - active.startTime) / 1000) });
  },

  restore: () => {
    const saved = load();
    if (!saved) return;
    const { active, pausedAt } = saved;
    const fourHours = 4 * 60 * 60 * 1000;
    if (Date.now() - active.startTime > fourHours) {
      // 4시간 초과 = ghost 세션. 자동 폐기 + UI 안내 큐에 추가
      localStorage.removeItem(LS_KEY);
      set({
        ghost: {
          targetTitle: active.targetTitle,
          startTime: active.startTime,
          type: active.type,
        },
      });
      return;
    }
    const elapsed = pausedAt
      ? Math.floor((pausedAt - active.startTime) / 1000)
      : Math.floor((Date.now() - active.startTime) / 1000);
    set({ active, elapsed, isPaused: !!pausedAt, pausedAt });
  },

  acknowledgeGhost: () => set({ ghost: null }),

  clear: () => {
    set({ active: null, elapsed: 0, isPaused: false, pausedAt: null });
    localStorage.removeItem(LS_KEY);
  },
}));
