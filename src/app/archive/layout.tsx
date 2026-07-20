import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "교육공학 아카이브",
  description:
    "교육공학 개념·연구방법·논문·용어 등을 분류별로 탐색할 수 있는 교육공학 지식 아카이브입니다.",
};

export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
