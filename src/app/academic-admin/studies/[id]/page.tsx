"use client";
import { use } from "react";
import ActivityDetail from "@/features/activities/ActivityDetail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ActivityDetail activityId={id} type="study" backHref="/academic-admin/studies" backLabel="스터디 운영 목록" />;
}
