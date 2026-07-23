import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

export const metadata: Metadata = {
  title: "자료실 | 연세교육공학회",
  description: "연세교육공학회 자료실입니다. 학회 활동에 필요한 자료를 공유합니다.",
  openGraph: {
    title: "자료실 | 연세교육공학회",
    description: "연세교육공학회 자료실입니다. 학회 활동에 필요한 자료를 공유합니다.",
    url: "https://yonsei-edtech.vercel.app/board/resources",
    siteName: "연세교육공학회",
  },
};

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
