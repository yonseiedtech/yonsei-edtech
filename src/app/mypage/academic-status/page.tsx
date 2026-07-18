"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import AcademicStatusView from "@/features/academic-status/AcademicStatusView";

function AcademicStatusContent() {
  const { user } = useAuthStore();
  if (!user) return null;
  return <AcademicStatusView userId={user.id} />;
}

export default function AcademicStatusPage() {
  return (
    <AuthGuard>
      <AcademicStatusContent />
    </AuthGuard>
  );
}
