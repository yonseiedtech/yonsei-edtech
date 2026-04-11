"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import CommentList from "@/features/board/CommentList";
import CommentForm from "@/features/board/CommentForm";
import { usePost, useComments, useDeletePost, useDeleteComment, useUpdateComment } from "@/features/board/useBoard";
import { CATEGORY_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Trash2, Edit, LogIn } from "lucide-react";
import { toast } from "sonner";
import ShareButton from "@/components/ShareButton";

function PostDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const { post } = usePost(id);
  const { comments } = useComments(id);
  const { deletePost } = useDeletePost();
  const { deleteComment } = useDeleteComment();
  const { updateComment } = useUpdateComment();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!post) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold">게시글을 찾을 수 없습니다</h2>
          <Link href="/board">
            <Button variant="outline" className="mt-4">
              목록으로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === post.authorId;
  const isAdmin = user ? ["admin", "president", "staff"].includes(user.role) : false;

  async function handleDelete() {
    await deletePost(post!.id);
    toast.success("게시글이 삭제되었습니다.");
    router.push("/board");
  }

  async function handleDeleteComment(commentId: string) {
    await deleteComment({ commentId, postId: id });
    toast.success("댓글이 삭제되었습니다.");
  }

  async function handleUpdateComment(commentId: string, content: string) {
    await updateComment({ commentId, postId: id, data: { content } });
    toast.success("댓글이 수정되었습니다.");
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          목록으로
        </button>

        <article className="rounded-2xl border bg-white p-8">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{CATEGORY_LABELS[post.category]}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold">{post.title}</h1>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{post.authorName}</span>
              <span>{formatDate(post.createdAt)}</span>
              <span>조회 {post.viewCount}</span>
            </div>
            <ShareButton title={post.title} />
          </div>

          {(isAuthor || isAdmin) && (
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/board/${id}/edit`)}
              >
                <Edit size={14} className="mr-1" />
                수정
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 size={14} className="mr-1" />
                삭제
              </Button>
            </div>
          )}

          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
            {post.content}
          </div>
        </article>

        <section className="mt-8">
          <h2 className="text-lg font-bold">
            댓글 <span className="text-primary">{comments.length}</span>
          </h2>

          <div className="mt-4">
            <CommentList
              comments={comments}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              onDelete={handleDeleteComment}
              onUpdate={handleUpdateComment}
            />
          </div>

          {user ? (
            <CommentForm postId={id} />
          ) : (
            <div className="mt-4 rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">댓글을 작성하려면 로그인이 필요합니다.</p>
              <Link href="/login">
                <Button variant="outline" size="sm" className="mt-2">
                  <LogIn size={14} className="mr-1" />
                  로그인 후 댓글 작성
                </Button>
              </Link>
            </div>
          )}
        </section>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                정말 이 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <PostDetailContent params={params} />;
}
