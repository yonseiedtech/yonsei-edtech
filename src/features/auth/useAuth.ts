"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "./auth-store";
import { authApi, profilesApi, saveTokens, clearTokens } from "@/lib/bkend";
import type { User } from "@/types";

// ── 데모 계정 (개발 환경에서만 활성화) ──
const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_ACCOUNTS: Record<string, User> = DEMO_ENABLED ? {
  admin: {
    id: "1", username: "admin", email: "admin@yonsei.ac.kr", name: "관리자",
    role: "admin", generation: 1, field: "교육공학", approved: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  president: {
    id: "2", username: "president", email: "president@yonsei.ac.kr", name: "김회장",
    role: "president", generation: 12, field: "교수설계", approved: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  staff: {
    id: "3", username: "staff", email: "staff@yonsei.ac.kr", name: "이운영",
    role: "staff", generation: 12, field: "에듀테크", approved: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  alumni: {
    id: "4", username: "alumni", email: "alumni@yonsei.ac.kr", name: "박졸업",
    role: "alumni", generation: 5, field: "학습과학", approved: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  advisor: {
    id: "5", username: "advisor", email: "advisor@yonsei.ac.kr", name: "최자문",
    role: "advisor", generation: 1, field: "교육공학", approved: true,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
} : {};

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

/** bkend API로 로그인 시도, 실패 시 데모 fallback */
async function tryBkendLogin(email: string, password: string): Promise<User> {
  const tokens = await authApi.login({ email, password });
  saveTokens(tokens.accessToken, tokens.refreshToken);

  const authUser = await authApi.me(tokens.accessToken);

  // 프로필 조회 실패 시에도 인증 정보만으로 로그인 허용
  let profile: Record<string, unknown> | undefined;
  try {
    const profileRes = await profilesApi.getByEmail(authUser.email);
    profile = profileRes.data[0];
  } catch {
    // 데이터 API 미프로비저닝 등 — 인증만으로 진행
  }

  return mergeToUser(authUser, profile);
}

function demoLogin(username: string, password: string): User {
  if (username === "admin" && password === "admin123") return DEMO_ACCOUNTS.admin;
  if (password === "test123" && DEMO_ACCOUNTS[username]) return DEMO_ACCOUNTS[username];
  if (username && password === "test123") {
    return {
      id: "100", username, name: "테스트 회원", role: "member",
      generation: 3, field: "에듀테크", approved: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  }
  throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
}

export function useAuth() {
  const { user, isLoading, initialized, setUser, setLoading, setInitialized, logout: clearUser } =
    useAuthStore();
  const router = useRouter();

  // 앱 시작 시 세션 복원
  useEffect(() => {
    if (initialized) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("bkend_access_token") : null;
    if (!token) {
      setInitialized(true);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        clearTokens();
        setUser(null);
        setInitialized(true);
      }
    }, 5000);

    (async () => {
      try {
        const authUser = await authApi.me(token);
        const profileRes = await profilesApi.getByEmail(authUser.email);
        if (!cancelled) setUser(mergeToUser(authUser, profileRes.data[0]));
      } catch {
        if (!cancelled) {
          clearTokens();
          setUser(null);
        }
      }
      if (!cancelled) setInitialized(true);
      clearTimeout(timeout);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [initialized, setUser, setInitialized]);

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        // 이메일 형식이면 bkend API 시도
        const isEmail = username.includes("@");
        let loggedInUser: User;

        if (isEmail) {
          try {
            loggedInUser = await tryBkendLogin(username, password);
          } catch {
            // bkend 실패 → 데모 fallback
            loggedInUser = demoLogin(username, password);
          }
        } else {
          // 아이디 로그인 → 데모 먼저, bkend에 email로도 시도
          try {
            loggedInUser = demoLogin(username, password);
          } catch {
            loggedInUser = await tryBkendLogin(username, password);
          }
        }

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
