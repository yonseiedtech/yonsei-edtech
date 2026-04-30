"use client";
import { use } from "react";
import ActivityDetail from "@/features/activities/ActivityDetail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ActivityDetail
      activityId={id}
      type="external"
      backHref="/console/academic/external"
      backLabel="대외 학술대회 운영 목록"
    />
  );
}
