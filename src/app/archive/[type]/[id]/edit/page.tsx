// Phase 3.5 — 편집 경로 통일: 공개 /archive/{type}/[id]/edit 는 콘솔 경로로 redirect.
// 기존 북마크·외부 링크 호환 유지 목적.
import { redirect, notFound } from "next/navigation";

type Params = { type: string; id: string };

const VALID_TYPES = ["concept", "variable", "measurement"] as const;
type ValidType = (typeof VALID_TYPES)[number];

function isValidType(t: string): t is ValidType {
  return (VALID_TYPES as readonly string[]).includes(t);
}

export default async function ArchiveEditRedirectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { type, id } = await params;
  if (!isValidType(type)) {
    notFound();
  }
  redirect(`/console/archive/${type}s/${id}/edit`);
}
