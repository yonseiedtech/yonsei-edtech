"use client";

import AuthGuard from "@/features/auth/AuthGuard";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
