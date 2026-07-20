import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "보드",
  description:
    "연세교육공학회 커뮤니티 게시판으로 다양한 주제의 소통 공간입니다.",
};

export default function BoardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
