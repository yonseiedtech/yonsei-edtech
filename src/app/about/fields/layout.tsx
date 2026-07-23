import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "연구 분야 | 연세교육공학회",
  description: "교육공학 핵심 연구 분야를 탐색하세요.",
  openGraph: {
    title: "연구 분야 | 연세교육공학회",
    description: "교육공학 핵심 연구 분야를 탐색하세요.",
    url: "https://yonsei-edtech.vercel.app/about/fields",
    siteName: "연세교육공학회",
  },
};

export default function FieldsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
