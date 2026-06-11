"use client";

import { useSearchParams } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import PostForm from "@/features/board/PostForm";
import type { PostCategory } from "@/types";
import PageContainer from "@/components/ui/page-container";

function WriteContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") as PostCategory | null;

  return (
    <PageContainer width="default">
      <PostForm initialCategory={category ?? undefined} lockCategory={!!category} />
    </PageContainer>
  );
}

export default function WritePage() {
  return (
    <AuthGuard>
      <WriteContent />
    </AuthGuard>
  );
}
