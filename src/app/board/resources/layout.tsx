import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "자료실",
  description:
    "연세교육공학회 회원을 위한 발표 자료, 참고 문헌, 학습 리소스를 공유하는 자료 게시판입니다.",
};

export default function ResourcesBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
