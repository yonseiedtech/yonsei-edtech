"use client";

import { use } from "react";
import ActivityWeekDetailPage from "@/features/activities/ActivityWeekDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string; week: string }>;
}) {
  const { id, week } = use(params);
  const weekNumber = Number.parseInt(week, 10);
  return (
    <ActivityWeekDetailPage
      activityId={id}
      weekNumber={Number.isFinite(weekNumber) && weekNumber > 0 ? weekNumber : 1}
      weeksHref={`/activities/projects/${id}/weeks`}
      detailHref={`/activities/projects/${id}`}
      typeLabel="프로젝트"
    />
  );
}
