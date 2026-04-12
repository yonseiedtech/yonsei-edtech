"use client";
import { use } from "react";
import ActivityDetail from "@/features/activities/ActivityDetail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ActivityDetail activityId={id} type="project" backHref="/activities/projects" backLabel="프로젝트 목록" />;
}
