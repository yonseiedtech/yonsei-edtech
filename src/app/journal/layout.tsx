import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "연구 저널",
  description:
    "개인 연구 아이디어, 독서 노트, 학습 기록을 관리하는 연구 저널입니다.",
};

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
