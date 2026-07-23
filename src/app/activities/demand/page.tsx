/**
 * 수요 조사 통합 페이지 → 리다이렉트 (2026-07-23)
 * 스터디·세미나 수요 조사가 각 페이지에 인라인으로 통합되었습니다.
 * 기존 북마크(/activities/demand)는 스터디 페이지로 안전하게 이동합니다.
 */
import { redirect } from "next/navigation";

export default function DemandPage() {
  redirect("/activities/studies");
}
