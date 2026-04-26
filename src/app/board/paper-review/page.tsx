"use client";

import { BookOpenCheck } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export default function PaperReviewBoardPage() {
  return (
    <CategoryBoardPage
      category="paper_review"
      title="교육공학 논문 리뷰"
      description="회원이 읽은 교육공학 논문의 리뷰·요약을 공유합니다. 본인의 '내 논문 읽기'에서 가져와 작성하거나, 다른 회원의 글에서 메타데이터를 내 논문 읽기에 저장할 수 있습니다."
      icon={<BookOpenCheck size={24} className="text-primary" />}
    />
  );
}
