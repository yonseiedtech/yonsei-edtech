import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "자유게시판",
  description:
    "연세교육공학회 회원들이 학습, 연구, 일상을 자유롭게 나누는 커뮤니티 공간입니다.",
};

export default function FreeBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
