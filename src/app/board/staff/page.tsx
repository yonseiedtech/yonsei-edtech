"use client";

import { Shield } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export default function StaffBoardPage() {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <CategoryBoardPage
        category="staff"
        title="운영진 게시판"
        description="운영진 전용 내부 소통 공간입니다."
        icon={<Shield size={24} className="text-primary" />}
      />
    </AuthGuard>
  );
}
