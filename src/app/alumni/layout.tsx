import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "졸업생",
  description:
    "연세대학교 교육대학원 교육공학전공 졸업생 정보와 학위논문 아카이브를 제공합니다.",
};

export default function AlumniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
