import { redirect } from "next/navigation";

/** 북마크 보존용 리다이렉트 — 운영진 설정이 /console/org 독립 페이지로 이동됨 */
export default function Page() {
  redirect("/console/org");
}
