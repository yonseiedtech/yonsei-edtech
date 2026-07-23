import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export const metadata: Metadata = {
  title: "홍보게시판 | 연세교육공학회",
  description: "연세교육공학회 홍보게시판입니다. 학회 관련 홍보 및 행사 안내를 확인하세요.",
  openGraph: {
    title: "홍보게시판 | 연세교육공학회",
    description: "연세교육공학회 홍보게시판입니다. 학회 관련 홍보 및 행사 안내를 확인하세요.",
    url: "https://yonsei-edtech.vercel.app/board/promotion",
    siteName: "연세교육공학회",
  },
};

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
