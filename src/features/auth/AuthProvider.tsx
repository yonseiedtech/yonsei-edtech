"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "./auth-store";
import { profilesApi } from "@/lib/bkend";
import type { User } from "@/types";

function mergeToUser(
  firebaseUser: { uid: string; email: string | null; displayName: string | null },
  profile?: Record<string, unknown>,
): User {
  return {
    id: (profile?.id as string) ?? firebaseUser.uid,
    username: (profile?.username as string) ?? (firebaseUser.email?.split("@")[0] || ""),
    email: firebaseUser.email || undefined,
    name: (profile?.name as string) ?? firebaseUser.displayName ?? "",
    role: (profile?.role as User["role"]) ?? "member",
    generation: (profile?.generation as number) ?? 0,
    field: (profile?.field as string) ?? "",
    profileImage: profile?.profileImage as string | undefined,
    bio: profile?.bio as string | undefined,
    approved: (profile?.approved as boolean) ?? false,
    createdAt: (profile?.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (profile?.updatedAt as string) ?? new Date().toISOString(),
  };
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialized, setUser, setInitialized } = useAuthStore();

  useEffect(() => {
    if (initialized) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let profile: Record<string, unknown> | undefined;
          try {
            const res = await profilesApi.getByEmail(firebaseUser.email!);
            profile = res.data[0];
          } catch {
            // 프로필 조회 실패 시 인증 정보만으로 진행
          }
          setUser(mergeToUser(firebaseUser, profile));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setInitialized(true);
    });

    return () => unsubscribe();
  }, [initialized, setUser, setInitialized]);

  return <>{children}</>;
}
