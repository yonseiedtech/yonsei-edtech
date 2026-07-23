import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "소통 보드 | 연세교육공학회",
  description: "연세교육공학회 소통 보드입니다. 실시간으로 의견을 나누고 공유할 수 있습니다.",
  openGraph: {
    title: "소통 보드 | 연세교육공학회",
    description: "연세교육공학회 소통 보드입니다. 실시간으로 의견을 나누고 공유할 수 있습니다.",
    siteName: "연세교육공학회",
  },
};

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
