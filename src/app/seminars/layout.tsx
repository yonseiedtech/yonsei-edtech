import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "세미나 | 연세교육공학회",
  description: "연세교육공학회 세미나 일정과 참석 신청",
};

export default function SeminarsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
