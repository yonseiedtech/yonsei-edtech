"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";

/**
 * 로그인된 사용자가 루트("/")로 진입하면 /dashboard 로 즉시 리다이렉트.
 * 로그인 상태가 아직 확인되지 않은 동안에는 아무것도 하지 않는다(홈 콘텐츠 표시).
 */
export default function HomeRedirectGate() {
  const router = useRouter();
  const { user, initialized } = useAuthStore();

  useEffect(() => {
    if (initialized && user) {
      router.replace("/dashboard");
    }
  }, [initialized, user, router]);

  return null;
}
