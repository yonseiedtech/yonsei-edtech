import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "협업 네트워크 | 연세교육공학회",
  description:
    "회원 간 공동연구·협업 현황을 그래프로 시각화한 협업 네트워크입니다.",
  openGraph: {
    title: "협업 네트워크 | 연세교육공학회",
    description: "회원 간 공동연구·협업 현황을 그래프로 시각화한 협업 네트워크입니다.",
    url: "https://yonsei-edtech.vercel.app/network",
    siteName: "연세교육공학회",
  },
};

export default function NetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
