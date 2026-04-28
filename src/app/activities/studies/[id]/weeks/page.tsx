"use client";

import { use } from "react";
import ActivityWeeksPage from "@/features/activities/ActivityWeeksPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ActivityWeeksPage
      activityId={id}
      detailHref={`/activities/studies/${id}`}
      backHref="/activities/studies"
      backLabel="스터디 목록"
      typeLabel="스터디"
    />
  );
}
