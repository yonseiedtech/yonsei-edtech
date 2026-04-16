"use client";

import { Mic } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export default function InterviewBoardPage() {
  return (
    <CategoryBoardPage
      category="interview"
      title="인터뷰 게시판"
      description="운영진이 개설한 온라인 인터뷰에 참여해보세요."
      icon={<Mic size={24} className="text-primary" />}
      minWriteRole="staff"
    />
  );
}
