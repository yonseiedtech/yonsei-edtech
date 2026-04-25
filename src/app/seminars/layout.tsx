import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "세미나 | 연세교육공학회",
  description: "연세교육공학회 세미나 일정과 참석 신청",
};

export default function SeminarsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "세미나", href: "/seminars" },
        ]}
      />
      {children}
    </>
  );
}
