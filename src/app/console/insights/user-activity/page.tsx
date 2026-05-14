"use client";

import UserActivityLogView from "@/features/insights/UserActivityLogView";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Eye } from "lucide-react";

export default function UserActivityLogPage() {
  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Eye}
        title="회원 활동 로그"
        description="개별 회원의 페이지 접속 이력을 관리자만 조회합니다."
      />
      <UserActivityLogView />
    </div>
  );
}
