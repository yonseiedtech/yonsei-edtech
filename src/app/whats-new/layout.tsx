import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "새로운 소식",
  description:
    "연세교육공학회의 최신 소식과 플랫폼 업데이트를 확인할 수 있습니다.",
};

export default function WhatsNewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
