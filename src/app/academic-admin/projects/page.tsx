// v8-H4 정리: /console/academic/* 단일 정본으로 수렴. 이 라우트는 리다이렉트 스텁이다.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/console/academic/projects");
}
