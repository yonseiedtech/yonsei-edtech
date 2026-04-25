import type { Metadata } from "next";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "통합 캘린더",
  description:
    "연세교육공학회 세미나·학술활동·학사일정·강의 시간표를 한 화면에서 확인할 수 있는 통합 캘린더.",
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "캘린더", href: "/calendar" },
        ]}
      />
      {children}
    </>
  );
}
