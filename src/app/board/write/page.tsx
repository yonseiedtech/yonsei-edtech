"use client";

import { useSearchParams } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import PostForm from "@/features/board/PostForm";
import type { PostCategory } from "@/types";

function WriteContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") as PostCategory | null;

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <PostForm initialCategory={category ?? undefined} />
      </div>
    </div>
  );
}

export default function WritePage() {
  return (
    <AuthGuard>
      <WriteContent />
    </AuthGuard>
  );
}
