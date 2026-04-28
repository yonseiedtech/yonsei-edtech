"use client";

import { use } from "react";
import ActivityWeeksPage from "@/features/activities/ActivityWeeksPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ActivityWeeksPage
      activityId={id}
      detailHref={`/activities/projects/${id}`}
      backHref="/activities/projects"
      backLabel="프로젝트 목록"
      typeLabel="프로젝트"
    />
  );
}
