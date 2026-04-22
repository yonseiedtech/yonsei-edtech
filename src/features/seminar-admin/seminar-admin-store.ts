import { create } from "zustand";

const STORAGE_KEY = "seminar-admin-active-id";

function loadInitial(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persist(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) sessionStorage.setItem(STORAGE_KEY, id);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage 차단(시크릿 모드 등) 무시
  }
}

interface SeminarAdminContextState {
  activeSeminarId: string | null;
  setActiveSeminarId: (id: string | null) => void;
  clear: () => void;
}

export const useSeminarAdminContext = create<SeminarAdminContextState>((set) => ({
  activeSeminarId: loadInitial(),
  setActiveSeminarId: (id) => {
    persist(id);
    set({ activeSeminarId: id });
  },
  clear: () => {
    persist(null);
    set({ activeSeminarId: null });
  },
}));
