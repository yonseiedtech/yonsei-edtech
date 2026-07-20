import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "대시보드",
  description: "회원 대시보드",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
