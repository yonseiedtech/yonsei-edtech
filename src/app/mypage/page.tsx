"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import MyPageView from "@/components/mypage/MyPageView";
import RouteDebugBoundary from "@/components/debug/RouteDebugBoundary";

// 사이클 97 진단(임시): eb.filter 위치 노출용 RouteDebugBoundary. 원인 확정 후 제거.
function MypageContent() {
  const { user } = useAuthStore();
  if (!user) return null;
  return (
    <RouteDebugBoundary label="마이페이지">
      <MyPageView userId={user.id} />
    </RouteDebugBoundary>
  );
}

export default function MypagePage() {
  return (
    <AuthGuard>
      <MypageContent />
    </AuthGuard>
  );
}
