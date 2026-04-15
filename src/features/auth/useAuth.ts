"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "./auth-store";
import { authApi, profilesApi, clearTokens } from "@/lib/bkend";
import { mergeToUser } from "./merge-user";

/**
 * Authentication hook.
 * NOTE: onAuthStateChanged is handled solely by AuthProvider.
 * This hook only provides login/logout actions and reads from the store.
 */
export function useAuth() {
  const { user, isLoading, setUser, setLoading, logout: clearUser } = useAuthStore();
  const router = useRouter();

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        // Firebase는 이메일 로그인만 지원.
        // 이메일 형식이면 그대로, 아니면 학번(username) → 프로필 조회로 실제 이메일 확보.
        let email = username;
        if (!username.includes("@")) {
          try {
            const res = await fetch(`/api/auth/resolve-email?username=${encodeURIComponent(username)}`);
            const json = await res.json();
            email = json?.email || `${username}@yonsei.ac.kr`;
          } catch {
            email = `${username}@yonsei.ac.kr`;
          }
        }

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
      } catch (err) {
        // Firebase 에러 코드를 사용자 친화적 메시지로 변환
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
          throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
        }
        if (msg.includes("auth/too-many-requests")) {
          throw new Error("로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
        }
        if (msg.includes("auth/user-disabled")) {
          throw new Error("비활성화된 계정입니다. 관리자에게 문의하세요.");
        }
        if (msg.includes("auth/invalid-email")) {
          throw new Error("올바른 이메일 형식이 아닙니다.");
        }
        throw new Error("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading],
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
