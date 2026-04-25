import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "멤버 소개",
  description: "연세교육공학회 멤버를 소개합니다.",
};

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "멤버 소개", href: "/members" },
        ]}
      />
      {children}
    </>
  );
}
