"use client";

import { FolderOpen } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export default function ResourcesBoardPage() {
  return (
    <CategoryBoardPage
      category="resources"
      title="자료실"
      description="학회 활동에 필요한 자료를 공유합니다. (회원 전용)"
      icon={<FolderOpen size={24} className="text-primary" />}
    />
  );
}
