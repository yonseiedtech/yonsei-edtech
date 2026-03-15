import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "멤버 소개",
  description: "연세교육공학회 멤버를 소개합니다.",
};

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
