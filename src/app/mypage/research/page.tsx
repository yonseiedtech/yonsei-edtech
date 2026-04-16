"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import MyResearchView from "@/components/mypage/MyResearchView";

function MyResearchContent() {
  const { user } = useAuthStore();
  if (!user) return null;
  return <MyResearchView userId={user.id} />;
}

export default function MyResearchPage() {
  return (
    <AuthGuard>
      <MyResearchContent />
    </AuthGuard>
  );
}
