"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "./auth-store";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/types";

interface Props {
  children: React.ReactNode;
  /** 접근 허용 역할 목록. 생략하면 로그인만 확인 */
  allowedRoles?: UserRole[];
  /** 레거시 호환용: true면 admin만 허용 */
  requireAdmin?: boolean;
}

export default function AuthGuard({ children, allowedRoles, requireAdmin }: Props) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  const roles = requireAdmin ? ["admin" as UserRole] : allowedRoles;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("returnUrl", window.location.pathname);
      }
      router.push("/login");
      return;
    }

    if (roles && !hasPermission(user, roles)) {
      router.push("/");
    }
  }, [user, isLoading, roles, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;
  if (roles && !hasPermission(user, roles)) return null;

  return <>{children}</>;
}
