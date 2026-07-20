import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "연구 준비도 진단",
  description:
    "교육공학 핵심 개념을 기반으로 연구 준비도를 자가 진단하고 약점 영역을 파악합니다.",
};

export default function DiagnosisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
