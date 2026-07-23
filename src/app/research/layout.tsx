import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "연구 분석 | 연세교육공학회",
  description:
    "연세대학교 교육대학원 교육공학전공 졸업생 학위논문 키워드·제목·계보 분석. 교육공학 분야 연구 동향을 한눈에 살펴봅니다.",
  openGraph: {
    title: "연구 분석 | 연세교육공학회",
    description:
      "연세대학교 교육공학전공 졸업생 학위논문 키워드·계보 분석으로 교육공학 연구 동향을 살펴봅니다.",
    url: "https://yonsei-edtech.vercel.app/research",
    siteName: "연세교육공학회",
  },
};

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "연구 분석", href: "/research" },
        ]}
      />
      {children}
    </>
  );
}
