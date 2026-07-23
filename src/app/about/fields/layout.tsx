import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "연구 분야 | 연세교육공학회",
  description:
    "연세교육공학회가 탐구하고 실천하는 교수설계, 테크놀로지 활용, 학습분석 등 주요 연구 분야를 소개합니다.",
  openGraph: {
    title: "연구 분야 | 연세교육공학회",
    description:
      "연세교육공학회가 탐구하고 실천하는 교수설계, 테크놀로지 활용, 학습분석 등 주요 연구 분야를 소개합니다.",
    url: "https://yonsei-edtech.vercel.app/about/fields",
    siteName: "연세교육공학회",
  },
};

export default function FieldsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
