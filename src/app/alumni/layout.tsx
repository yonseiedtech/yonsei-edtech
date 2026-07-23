import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "졸업생 | 연세교육공학회",
  description:
    "연세대학교 교육대학원 교육공학전공 졸업생 정보와 학위논문 아카이브를 제공합니다.",
  openGraph: {
    title: "졸업생 | 연세교육공학회",
    description:
      "연세대학교 교육대학원 교육공학전공 졸업생 정보와 학위논문 아카이브를 제공합니다.",
    url: "https://yonsei-edtech.vercel.app/alumni",
    siteName: "연세교육공학회",
  },
};

export default function AlumniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
