"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import AuthGuard from "@/features/auth/AuthGuard";
import { Skeleton } from "@/components/ui/skeleton";

const StudioEditor = dynamic(() => import("@/features/studio/StudioEditor"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-4 h-[480px] w-full rounded-2xl" />
    </div>
  ),
});

export default function StudioEditorPage() {
  const params = useParams<{ id: string }>();
  return (
    <AuthGuard>
      <StudioEditor docId={params.id} />
    </AuthGuard>
  );
}
