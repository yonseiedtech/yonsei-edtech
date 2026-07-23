import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "졸업생 학위논문 | 연세교육공학회",
  description:
    "연세대학교 교육대학원 교육공학전공 졸업생 학위논문 아카이브. 키워드·연도별 검색과 분석 노트 제공.",
  openGraph: {
    title: "졸업생 학위논문 | 연세교육공학회",
    description:
      "연세대학교 교육대학원 교육공학전공 졸업생 학위논문 아카이브. 키워드·연도별 검색과 분석 노트 제공.",
    url: "https://yonsei-edtech.vercel.app/alumni/thesis",
    siteName: "연세교육공학회",
  },
};

export default function AlumniThesisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "졸업생 논문", href: "/alumni/thesis" },
        ]}
      />
      {children}
    </>
  );
}
