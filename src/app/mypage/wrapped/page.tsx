"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import SemesterWrappedView from "@/features/mypage/SemesterWrappedView";

function WrappedContent() {
  const { user } = useAuthStore();
  if (!user) return null;
  return <SemesterWrappedView userId={user.id} />;
}

export default function MyWrappedPage() {
  return (
    <AuthGuard>
      <WrappedContent />
    </AuthGuard>
  );
}
