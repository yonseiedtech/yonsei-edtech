import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "강의 소개",
  description:
    "연세대학교 교육대학원 교육공학전공 개설 강의 안내, 학기별 수강편람, 종합시험 정보 및 수강생 후기.",
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "강의 소개", href: "/courses" },
        ]}
      />
      {children}
    </>
  );
}
