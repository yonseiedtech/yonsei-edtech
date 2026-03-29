"use client";
import { Users } from "lucide-react";
import ActivityPage from "@/features/activities/ActivityPage";

export default function StudiesPage() {
  return (
    <ActivityPage
      type="study"
      icon={<Users size={24} />}
      title="스터디"
      subtitle="AI 교육, UX 리서치, 교수설계 등 관심 주제별 소그룹 스터디를 운영합니다."
      color="bg-accent/10 text-accent"
    />
  );
}
