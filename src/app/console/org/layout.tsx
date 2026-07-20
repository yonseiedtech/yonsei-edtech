import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "운영진 설정",
  description: "연세교육공학회 운영진 구성 및 조직도를 관리하는 콘솔 페이지입니다.",
  robots: { index: false, follow: false },
};

export default function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
