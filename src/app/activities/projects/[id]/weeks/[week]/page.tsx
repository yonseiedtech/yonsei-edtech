"use client";
import { use } from "react";
import { redirect } from "next/navigation";
import ActivityWeekDetailPage from "@/features/activities/ActivityWeekDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string; week: string }>;
}) {
  const { id, week } = use(params);
  const weekNum = Number.parseInt(week, 10);
  if (!Number.isFinite(weekNum) || weekNum < 1) {
    redirect(`/activities/projects/${id}?tab=progress`);
  }
  return (
    <ActivityWeekDetailPage
      activityId={id}
      weekNumber={weekNum}
      type="project"
      typeLabel="프로젝트"
      detailHref={`/activities/projects/${id}`}
      weeksHref={`/activities/projects/${id}/weeks`}
    />
  );
}
