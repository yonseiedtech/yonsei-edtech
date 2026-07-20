import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "모임·일정 조율",
  description:
    "연세교육공학회 모임 일정을 확인하고 참여 가능 여부를 투표로 조율합니다.",
};

export default function GatheringsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
