import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "도움말",
  description:
    "연세교육공학회 플랫폼 이용 방법과 자주 묻는 질문을 안내합니다.",
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
