"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import AdminMemberTab from "@/features/admin/AdminMemberTab";

export default function ConsoleMembersPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <AdminMemberTab />
    </AuthGuard>
  );
}
