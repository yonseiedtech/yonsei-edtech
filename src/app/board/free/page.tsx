import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export const metadata: Metadata = {
  title: "자유게시판 | 연세교육공학회",
  description: "연세교육공학회 자유게시판입니다. 학회 회원들과 자유롭게 이야기를 나눠보세요.",
  openGraph: {
    title: "자유게시판 | 연세교육공학회",
    description: "연세교육공학회 자유게시판입니다. 학회 회원들과 자유롭게 이야기를 나눠보세요.",
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
