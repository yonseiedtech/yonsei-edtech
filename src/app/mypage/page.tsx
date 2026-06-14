"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import MyPageView from "@/components/mypage/MyPageView";

function MypageContent() {
  const { user } = useAuthStore();
  if (!user) return null;
  return <MyPageView userId={user.id} />;
}

export default function MypagePage() {
  return (
    <AuthGuard>
      <MypageContent />
    </AuthGuard>
  );
}
