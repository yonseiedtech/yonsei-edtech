import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "학회보",
  description:
    "연세교육공학회 발행 학회보. 회원 기고, 학술 동향, 활동 리포트를 매거진 형태로 만나보세요.",
};

export default function NewsletterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "학회보", href: "/newsletter" },
        ]}
      />
      {children}
    </>
  );
}
