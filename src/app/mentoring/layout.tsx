import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "멘토링 | 연세교육공학회",
  description:
    "선배 연구자와 재학생을 연결하는 연세교육공학회 멘토링 프로그램입니다.",
  openGraph: {
    title: "멘토링 | 연세교육공학회",
    description: "선배 연구자와 재학생을 연결하는 연세교육공학회 멘토링 프로그램입니다.",
    url: "https://yonsei-edtech.vercel.app/mentoring",
    siteName: "연세교육공학회",
  },
};

export default function MentoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
