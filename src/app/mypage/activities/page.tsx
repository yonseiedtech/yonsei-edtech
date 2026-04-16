"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import MyActivitiesView from "@/components/mypage/MyActivitiesView";

function MyActivitiesContent() {
  const { user } = useAuthStore();
  if (!user) return null;
  return <MyActivitiesView userId={user.id} />;
}

export default function MyActivitiesPage() {
  return (
    <AuthGuard>
      <MyActivitiesContent />
    </AuthGuard>
  );
}
