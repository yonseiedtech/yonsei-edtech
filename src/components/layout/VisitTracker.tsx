"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import { trackVisit } from "@/lib/visit-tracker";

export default function VisitTracker() {
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    void trackVisit(user?.id);
  }, [user?.id]);
  return null;
}
