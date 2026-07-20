import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "문의",
  description:
    "연세교육공학회에 문의 사항이 있으면 이 페이지를 통해 연락하세요.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
