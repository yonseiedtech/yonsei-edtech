import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  initialized: false,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (initialized) => set({ initialized, isLoading: false }),
  logout: () => set({ user: null, initialized: false, isLoading: false }),
}));
