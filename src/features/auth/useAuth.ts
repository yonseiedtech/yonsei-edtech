"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "./auth-store";
import type { User } from "@/types";

export function useAuth() {
  const { user, isLoading, setUser, setLoading, logout: clearUser } = useAuthStore();
  const router = useRouter();

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        // TODO: Replace with bkend.ai authApi.login()

        // Demo login logic
        if (username === "admin" && password === "admin123") {
          const adminUser: User = {
            id: "1",
            username: "admin",
            email: "admin@yonsei.ac.kr",
            name: "관리자",
            role: "admin",
            generation: 1,
            field: "교육공학",
            approved: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setUser(adminUser);
          return adminUser;
        } else if (username && password === "test123") {
          const memberUser: User = {
            id: "2",
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
