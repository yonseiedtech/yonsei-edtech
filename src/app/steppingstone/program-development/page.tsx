import { redirect } from "next/navigation";

/**
 * 프로그램 설계·개발 가이드는 교육공학 아카이브(`/archive/program-development`)로
 * 이동했습니다. 기존 경로/북마크 보존을 위한 영구 리다이렉트.
 */
export default function ProgramDevelopmentMoved() {
  redirect("/archive/program-development");
}
