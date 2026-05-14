import { redirect } from "next/navigation";

// 대외 학술대회 관리는 학술활동 콘솔이 정식 위치 — 헤더·레이아웃 중복 방지를 위해 redirect
export default function SettingsExternalRedirect() {
  redirect("/console/academic/external");
}
