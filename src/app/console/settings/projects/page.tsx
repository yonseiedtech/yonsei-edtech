import { redirect } from "next/navigation";

// 프로젝트 관리는 학술활동 콘솔이 정식 위치 — 헤더·레이아웃 중복 방지를 위해 redirect
export default function SettingsProjectsRedirect() {
  redirect("/console/academic/projects");
}
