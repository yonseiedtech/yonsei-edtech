import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export const metadata: Metadata = {
  title: "자유 게시판 | 연세교육공학회",
  description: "회원들의 자유로운 소통 공간입니다.",
  openGraph: {
    title: "자유 게시판 | 연세교육공학회",
    description: "회원들의 자유로운 소통 공간입니다.",
    url: "https://yonsei-edtech.vercel.app/board/free",
    siteName: "연세교육공학회",
  },
};

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
