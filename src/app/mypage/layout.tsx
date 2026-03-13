import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "마이페이지",
  description: "연세교육공학회 회원 마이페이지입니다.",
  robots: { index: false, follow: false },
};

export default function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
