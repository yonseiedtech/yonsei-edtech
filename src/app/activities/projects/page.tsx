"use client";
import { FolderKanban } from "lucide-react";
import ActivityPage from "@/features/activities/ActivityPage";

export default function ProjectsPage() {
  return (
    <ActivityPage
      type="project"
      icon={<FolderKanban size={24} />}
      title="팀 프로젝트"
      subtitle="실제 교육 현장의 문제를 기술로 해결하는 프로토타입을 개발합니다."
      color="bg-secondary/10 text-secondary"
    />
  );
}
