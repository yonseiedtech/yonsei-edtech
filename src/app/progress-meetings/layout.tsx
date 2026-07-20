import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "진행상황 회의",
  description:
    "연구 진행 상황을 공유하고 피드백을 받는 정기 회의 일정과 기록입니다.",
};

export default function ProgressMeetingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
