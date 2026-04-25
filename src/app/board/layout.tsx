import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "게시판",
  description:
    "연세교육공학회 게시판 - 자유토론, 학습자료, 활동후기를 공유합니다.",
};

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "게시판", href: "/board" },
        ]}
      />
      {children}
    </>
  );
}
