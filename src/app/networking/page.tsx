/**
 * /networking → /gatherings 영구 리디렉트 (v9-M1, 2026-07-21)
 * 북마크·구링크 인입 시 흰 404 방지.
 */
import { redirect } from "next/navigation";

export default function NetworkingRedirectPage() {
  redirect("/gatherings");
}
