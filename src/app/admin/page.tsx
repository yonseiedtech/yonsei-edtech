"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import { isPresidentOrAbove } from "@/lib/permissions";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      router.replace(isPresidentOrAbove(user) ? "/admin/members" : "/admin/posts");
    }
  }, [user, router]);

  return null;
}
