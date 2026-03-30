"use client";
import { use } from "react";
import ActivityDetail from "@/features/activities/ActivityDetail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ActivityDetail activityId={id} type="study" backHref="/activities/studies" backLabel="스터디 목록" />;
}
