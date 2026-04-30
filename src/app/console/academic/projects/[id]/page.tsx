"use client";
import { use } from "react";
import ActivityDetail from "@/features/activities/ActivityDetail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ActivityDetail
      activityId={id}
      type="project"
      backHref="/console/academic/projects"
      backLabel="프로젝트 운영 목록"
    />
  );
}
