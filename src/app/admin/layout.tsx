import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자",
  description: "연세교육공학회 관리자 페이지입니다.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
