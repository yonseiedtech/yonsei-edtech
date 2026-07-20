import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "리더보드",
  description:
    "학습·연구·활동 기여도에 따른 연세교육공학회 회원 리더보드를 확인합니다.",
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
