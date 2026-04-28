"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import { trackVisit } from "@/lib/visit-tracker";

export default function VisitTracker() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  useEffect(() => {
    void trackVisit({ userId: user?.id, pathname });
  }, [user?.id, pathname]);
  return null;
}
