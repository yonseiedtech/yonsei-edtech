import type { Metadata } from "next";
import ActivityDetail from "@/features/activities/ActivityDetail";

export const metadata: Metadata = {
  title: "스터디 | 연세교육공학회",
  description: "연세교육공학회 스터디 활동 상세 페이지입니다.",
  openGraph: {
    title: "스터디 | 연세교육공학회",
    siteName: "연세교육공학회",
  },
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ActivityDetail
      activityId={id}
      type="study"
      backHref="/activities/studies"
      backLabel="스터디 목록"
    />
  );
}
