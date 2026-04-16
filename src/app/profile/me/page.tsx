"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";

export default function MyProfileRedirect() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading || !initialized) return;
    if (!user?.id) {
      router.replace("/login?next=/profile/me");
      return;
    }
    router.replace(`/profile/${user.id}`);
  }, [user, initialized, isLoading, router]);

  return (
    <div className="py-20 text-center text-sm text-muted-foreground">
      개인 페이지로 이동 중…
    </div>
  );
}
