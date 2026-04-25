import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "인지디딤판",
  description:
    "연세교육공학회 인지디딤판 — 신입생 온보딩, 논문 심사 연습 등 학술 활동을 위한 학습 보조 도구 모음.",
};

export default function SteppingstoneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "인지디딤판", href: "/steppingstone" },
        ]}
      />
      {children}
    </>
  );
}
