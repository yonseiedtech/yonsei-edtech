import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * /directory/[id] → /profile/[id] 영구 리다이렉트.
 * 기존 발급된 명함 QR(`/directory/{id}?via=qr`) 호환을 위해 쿼리 보존.
 */
export default async function DirectoryRedirect({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach((vv) => qs.append(k, vv));
    else if (v !== undefined) qs.append(k, v);
  }
  const tail = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/profile/${id}${tail}`);
}
