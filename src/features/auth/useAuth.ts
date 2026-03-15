"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "./auth-store";
import { authApi, profilesApi, clearTokens } from "@/lib/bkend";
import type { User } from "@/types";

/** bkend /auth/me + /data/users 결과를 User 타입으로 합침 */
function mergeToUser(
  authUser: { id: string; email: string; name: string },
  profile?: Record<string, unknown>
): User {
  return {
    id: profile?.id as string ?? authUser.id,
    username: (profile?.username as string) ?? authUser.email.split("@")[0],
    email: authUser.email,
    name: (profile?.name as string) ?? authUser.name,
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

export function useAuth() {
  const { user, isLoading, initialized, setUser, setLoading, setInitialized, logout: clearUser } =
    useAuthStore();
  const router = useRouter();

  // Firebase onAuthStateChanged로 세션 복원
  useEffect(() => {
    if (initialized) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let profile: Record<string, unknown> | undefined;
          try {
            const profileRes = await profilesApi.getByEmail(firebaseUser.email!);
            profile = profileRes.data[0];
          } catch {
            // 프로필 조회 실패 시 인증 정보만으로 진행
          }
          setUser(
            mergeToUser(
              { id: firebaseUser.uid, email: firebaseUser.email || "", name: firebaseUser.displayName || "" },
              profile
            )
          );
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

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        // Firebase는 이메일 로그인만 지원 — 이메일 형식이 아니면 @yonsei.ac.kr 추가
        const email = username.includes("@") ? username : `${username}@yonsei.ac.kr`;

        await authApi.login({ email, password });
        const authUser = await authApi.me();

        let profile: Record<string, unknown> | undefined;
        try {
          const profileRes = await profilesApi.getByEmail(authUser.email);
          profile = profileRes.data[0];
        } catch {
          // 프로필 조회 실패 시 인증 정보만으로 진행
        }

        const loggedInUser = mergeToUser(authUser, profile);
        setUser(loggedInUser);
        return loggedInUser;
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // 로그아웃 API 실패해도 로컬은 정리
    }
    clearTokens();
    clearUser();
    router.push("/");
  }, [clearUser, router]);

  return { user, isLoading, login, logout };
}
