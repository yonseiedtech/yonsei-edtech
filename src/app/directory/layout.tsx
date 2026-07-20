import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원 디렉토리",
  description:
    "연세교육공학회 회원 정보와 연구 프로필을 검색할 수 있는 회원 디렉토리입니다.",
};

export default function DirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
