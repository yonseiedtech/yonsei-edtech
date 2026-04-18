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

interface StudyTimerState {
  active: ActiveSession | null;
  elapsed: number;
  isPaused: boolean;
  pausedAt: number | null;
  showEndDialog: boolean;

  start: (session: ActiveSession) => void;
  pause: () => void;
  resume: () => void;
  requestStop: () => void;
  confirmStop: () => void;
  cancelStop: () => void;
  tick: () => void;
  restore: () => void;
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
  showEndDialog: false,

  start: (session) => {
    set({ active: session, elapsed: 0, isPaused: false, pausedAt: null, showEndDialog: false });
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

  requestStop: () => set({ showEndDialog: true }),

  confirmStop: () => set({ showEndDialog: false }),

  cancelStop: () => set({ showEndDialog: false }),

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
      localStorage.removeItem(LS_KEY);
      return;
    }
    const elapsed = pausedAt
      ? Math.floor((pausedAt - active.startTime) / 1000)
      : Math.floor((Date.now() - active.startTime) / 1000);
    set({ active, elapsed, isPaused: !!pausedAt, pausedAt });
  },

  clear: () => {
    set({ active: null, elapsed: 0, isPaused: false, pausedAt: null, showEndDialog: false });
    localStorage.removeItem(LS_KEY);
  },
}));
