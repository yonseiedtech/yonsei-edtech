"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import { BookOpen } from "lucide-react";

function StaffAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center gap-3">
          <BookOpen size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">운영진</h1>
        </div>
        <div className="pt-2">{children}</div>
      </div>
    </div>
  );
}

export default function StaffAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <StaffAdminShell>{children}</StaffAdminShell>
    </AuthGuard>
  );
}
