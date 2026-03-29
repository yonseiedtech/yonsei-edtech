"use client";
import { Globe } from "lucide-react";
import ActivityPage from "@/features/activities/ActivityPage";

export default function ExternalPage() {
  return (
    <ActivityPage
      type="external"
      icon={<Globe size={24} />}
      title="대외 학술대회"
      subtitle="외부 학술대회 참가, 학회 발표 등 대외 활동을 소개합니다."
      color="bg-primary/10 text-primary"
    />
  );
}
