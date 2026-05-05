"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// PaperEditPage는 client-only 큰 컴포넌트라 dynamic + ssr:false (Vercel SSG 호환)
const PaperEditPage = dynamic(
  () => import("@/features/research/PaperEditPage"),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-muted-foreground">
        <Loader2 size={20} className="mx-auto animate-spin" />
        <p className="mt-2 text-sm">논문 편집 페이지 불러오는 중…</p>
      </div>
    ),
  },
);

export default function Page() {
  const params = useParams<{ id: string }>();
  if (!params?.id) return null;
  return <PaperEditPage paperId={params.id} />;
}
