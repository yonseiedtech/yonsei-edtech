import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "활동 소개",
  description: "연세교육공학회의 세미나, 프로젝트, 스터디 활동을 소개합니다.",
};

export default function ActivitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
