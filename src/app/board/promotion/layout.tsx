import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "홍보게시판",
  description:
    "연세교육공학회의 학술대회, 세미나, 모집 공고 등 학회 관련 홍보 및 행사 안내입니다.",
};

export default function PromotionBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
