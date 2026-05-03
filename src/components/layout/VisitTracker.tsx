"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import { trackVisit, trackUserActivity } from "@/lib/visit-tracker";

export default function VisitTracker() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  useEffect(() => {
    void trackVisit({ userId: user?.id, pathname });
    // Sprint 63: 로그인 회원만 개별 활동 로그 기록 (admin 전용 조회용)
    if (user?.id) {
      void trackUserActivity({
        userId: user.id,
        userName: user.name,
        pathname,
      });
    }
  }, [user?.id, user?.name, pathname]);
  return null;
}
