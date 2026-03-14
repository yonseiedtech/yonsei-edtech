import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공지사항",
  description: "연세교육공학회 공지사항 및 안내사항을 확인하세요.",
};

export default function NoticesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
