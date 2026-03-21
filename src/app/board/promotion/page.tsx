"use client";

import { Megaphone } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export default function PromotionBoardPage() {
  return (
    <CategoryBoardPage
      category="promotion"
      title="홍보게시판"
      description="학회 관련 홍보 및 행사 안내입니다."
      icon={<Megaphone size={24} className="text-primary" />}
      minWriteRole="staff"
    />
  );
}
