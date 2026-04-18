"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import PostForm from "@/features/board/PostForm";
import { usePost } from "@/features/board/useBoard";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import { toast } from "sonner";

function EditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const { post, isLoading } = usePost(id);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">게시글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const canEdit = user?.id === post.authorId || isStaffOrAbove(user);
  if (!canEdit) {
    toast.error("수정 권한이 없습니다.");
    router.push(`/board/${id}`);
    return null;
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <PostForm
          mode="edit"
          initialData={post}
          onSubmitSuccess={() => router.push(`/board/${id}`)}
        />
      </div>
    </div>
  );
}

export default function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AuthGuard>
      <EditContent params={params} />
    </AuthGuard>
  );
}
