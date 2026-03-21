"use client";

import { MessageSquare } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export default function FreeBoardPage() {
  return (
    <CategoryBoardPage
      category="free"
      title="자유게시판"
      description="자유롭게 이야기를 나눠보세요."
      icon={<MessageSquare size={24} className="text-primary" />}
    />
  );
}
