import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "공지사항",
  description: "연세교육공학회 공지사항 및 안내사항을 확인하세요.",
};

export default function NoticesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "공지사항", href: "/notices" },
        ]}
      />
      {children}
    </>
  );
}
