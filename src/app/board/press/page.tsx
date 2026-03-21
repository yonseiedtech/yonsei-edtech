"use client";

import { FileText } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export default function PressBoardPage() {
  return (
    <CategoryBoardPage
      category="press"
      title="보도자료"
      description="세미나 및 학회 활동 보도자료입니다."
      icon={<FileText size={24} className="text-primary" />}
      minWriteRole="staff"
    />
  );
}
