import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "세미나 | 연세교육공학회",
  description: "연세교육공학회 세미나 일정과 참석 신청. 교육공학 최신 연구와 현장 사례를 나누는 정기 세미나에 참여하세요.",
  openGraph: {
    title: "세미나 | 연세교육공학회",
    description: "연세교육공학회 세미나 일정과 참석 신청. 교육공학 최신 연구와 현장 사례를 나누는 정기 세미나에 참여하세요.",
    url: "https://yonsei-edtech.vercel.app/seminars",
    siteName: "연세교육공학회",
  },
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
