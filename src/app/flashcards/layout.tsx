import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "암기카드",
  description:
    "교육공학 핵심 개념과 연구 진단 문항을 스페이스드 리피티션 방식으로 복습하는 암기카드입니다.",
};

export default function FlashcardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
