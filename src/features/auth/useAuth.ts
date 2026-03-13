"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "./auth-store";
import type { User } from "@/types";

// 데모 계정 목록
const DEMO_ACCOUNTS: Record<string, User> = {
  admin: {
    id: "1",
    username: "admin",
    email: "admin@yonsei.ac.kr",
    name: "관리자",
    role: "admin",
    generation: 1,
    field: "교육공학",
    approved: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  president: {
    id: "2",
    username: "president",
    email: "president@yonsei.ac.kr",
    name: "김회장",
    role: "president",
    generation: 12,
    field: "교수설계",
    approved: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  staff: {
    id: "3",
    username: "staff",
    email: "staff@yonsei.ac.kr",
    name: "이운영",
    role: "staff",
    generation: 12,
    field: "에듀테크",
    approved: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  alumni: {
    id: "4",
    username: "alumni",
    email: "alumni@yonsei.ac.kr",
    name: "박졸업",
    role: "alumni",
    generation: 5,
    field: "학습과학",
    approved: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  advisor: {
    id: "5",
    username: "advisor",
    email: "advisor@yonsei.ac.kr",
    name: "최자문",
    role: "advisor",
    generation: 1,
    field: "교육공학",
    approved: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
};

export function useAuth() {
  const { user, isLoading, setUser, setLoading, logout: clearUser } = useAuthStore();
  const router = useRouter();

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        // TODO: Replace with bkend.ai authApi.login()

        // admin 계정: admin / admin123
        if (username === "admin" && password === "admin123") {
          setUser(DEMO_ACCOUNTS.admin);
          return DEMO_ACCOUNTS.admin;
        }

        // 역할별 데모 계정: president/staff/alumni + test123
        if (password === "test123" && DEMO_ACCOUNTS[username]) {
          setUser(DEMO_ACCOUNTS[username]);
          return DEMO_ACCOUNTS[username];
        }

        // 그 외 아무 아이디 + test123 → member
        if (username && password === "test123") {
          const memberUser: User = {
            id: "100",
            username,
            name: "테스트 회원",
            role: "member",
            generation: 3,
            field: "에듀테크",
            approved: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setUser(memberUser);
          return memberUser;
        }

        throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading]
  );

  const logout = useCallback(() => {
    clearUser();
    router.push("/");
  }, [clearUser, router]);

  return { user, isLoading, login, logout };
}
