"use client";

import { BookOpen } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export default function SeminarBoardPage() {
  return (
    <CategoryBoardPage
      category="seminar"
      title="세미나 자료"
      description="세미나 발표 자료와 관련 자료를 공유합니다."
      icon={<BookOpen size={24} className="text-primary" />}
    />
  );
}
