"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import PostForm from "@/features/board/PostForm";

function WriteContent() {
  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <PostForm />
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
