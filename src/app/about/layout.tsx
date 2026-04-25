import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "학회 소개",
  description:
    "연세대학교 교육대학원 교육공학전공 학술 커뮤니티 연세교육공학회의 비전, 연혁, 인사말, 조직도를 소개합니다.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "학회 소개", href: "/about" },
        ]}
      />
      {children}
    </>
  );
}
