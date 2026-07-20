import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "실험실",
  description:
    "연세교육공학회 회원들이 운영하는 연구 실험실 목록과 연구 주제를 소개합니다.",
};

export default function LabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
