import type { Metadata } from "next";
import ActivityDetail from "@/features/activities/ActivityDetail";

export const metadata: Metadata = {
  title: "대외 학술대회 | 연세교육공학회",
  description: "연세교육공학회 대외 학술대회 활동 상세 페이지입니다.",
  openGraph: {
    title: "대외 학술대회 | 연세교육공학회",
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
      type="external"
      backHref="/activities/external"
      backLabel="대외 학술대회 목록"
    />
  );
}
