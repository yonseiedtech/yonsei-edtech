"use client";

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import CommentList from "@/features/board/CommentList";
import PostReactions from "@/features/board/PostReactions";
import CommentForm from "@/features/board/CommentForm";
import PollViewer from "@/features/board/PollViewer";
import { usePost, useComments, useDeletePost, useDeleteComment, useUpdateComment, useIncrementViewCount } from "@/features/board/useBoard";
import { auth as firebaseAuth } from "@/lib/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CATEGORY_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PostArticleJsonLd } from "@/components/seo/JsonLd";
import InterviewPlayer from "@/features/board/InterviewPlayer";
import InterviewResponses from "@/features/board/InterviewResponses";
import LinkedPaperCard from "@/features/board/LinkedPaperCard";
import { useMyInterviewForPost } from "@/features/board/interview-store";
import { Mic, Target } from "lucide-react";
import { describeInterviewTarget } from "@/lib/interview-target";
import LoginModal from "@/features/auth/LoginModal";

/** 이미지 마크다운을 img 태그로, 나머지는 XSS 방지 후 렌더링 */
function renderPostContent(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="my-3 max-w-full rounded-lg" style="max-height:600px" />',
    )
    .replace(/\n/g, "<br />");
}

function PostDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const { post, isLoading } = usePost(id);
  const { comments } = useComments(id);
  const { deletePost } = useDeletePost();
  const { deleteComment } = useDeleteComment();
  const { updateComment } = useUpdateComment();
  const incrementView = useIncrementViewCount();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInterviewPlayer, setShowInterviewPlayer] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { response: myInterviewResp } = useMyInterviewForPost(id, user?.id);
  const viewCounted = useRef(false);
  const queryClient = useQueryClient();

  // 내 투표 내역 조회
  const { data: myVoteData } = useQuery({
    queryKey: ["post-vote", id, user?.id ?? "guest"],
    queryFn: async () => {
      if (!user) return null;
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) return null;
      const res = await fetch(`/api/posts/${id}/vote`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as { optionIds: string[] } | null;
    },
    enabled: !!post?.poll && !!user,
  });

  async function handleVote(optionIds: string[]) {
    if (!user) { toast.error("로그인이 필요합니다."); return; }
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) { toast.error("인증이 필요합니다."); return; }
    const res = await fetch(`/api/posts/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ optionIds }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(json.error ?? "투표 실패"); return; }
    toast.success("투표되었습니다.");
    queryClient.invalidateQueries({ queryKey: ["posts", id] });
    queryClient.invalidateQueries({ queryKey: ["post-vote", id, user.id] });
  }

  // 조회수 증가 (최초 1회만)
  useEffect(() => {
    if (post && !viewCounted.current) {
      viewCounted.current = true;
      incrementView.mutate(id);
    }
  }, [post, id, incrementView]);

  if (isLoading) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <Skeleton className="mb-6 h-5 w-20" />
          <div className="rounded-2xl border bg-card p-8">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-3 h-8 w-3/4" />
            <Skeleton className="mt-3 h-4 w-48" />
            <div className="mt-6 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
  const isAdmin = user ? ["sysadmin", "admin", "president", "staff"].includes(user.role) : false;

  async function handleDelete() {
    const cat = post!.category;
    await deletePost(post!.id);
    toast.success("게시글이 삭제되었습니다.");
    const routes: Record<string, string> = {
      notice: "/notices",
      free: "/board/free",
      promotion: "/board/promotion",
      seminar: "/board/seminar",
      resources: "/board/resources",
      staff: "/board/staff",
      interview: "/board/interview",
      paper_review: "/board/paper-review",
      press: "/newsletter",
    };
    router.push(routes[cat] ?? "/board");
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
      <PostArticleJsonLd post={post} />
      <div className="mx-auto max-w-6xl px-4">
        <button
          onClick={() => {
            const routes: Record<string, string> = {
              notice: "/notices",
              free: "/board/free",
              promotion: "/board/promotion",
              seminar: "/board/seminar",
              resources: "/board/resources",
              staff: "/board/staff",
              interview: "/board/interview",
              paper_review: "/board/paper-review",
              press: "/newsletter",
            };
            router.push(routes[post.category] ?? "/board");
          }}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          목록으로
        </button>

        <article className="rounded-2xl border bg-card p-8">
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

          {post.linkedPaper && (
            <LinkedPaperCard
              paper={post.linkedPaper}
              authorIsMe={isAuthor}
              onLoginRequired={() => setShowLoginModal(true)}
            />
          )}

          {post.type === "interview" && post.interview ? (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50 p-6">
              <div className="flex items-center gap-2 text-[#003876]">
                <Mic size={18} />
                <span className="text-sm font-bold">온라인 인터뷰</span>
                <Badge variant="outline" className="border-blue-300 bg-card text-[#003876] text-[10px]">
                  {post.interview.questions.length}문항
                </Badge>
                {post.interview.deadline && (
                  <Badge variant="outline" className="border-amber-300 bg-card text-amber-700 text-[10px]">
                    마감 {new Date(post.interview.deadline).toLocaleDateString("ko-KR")}
                  </Badge>
                )}
                {/* Sprint 67-AF: 대상자 표시 */}
                {post.interview.targetCriteria && (
                  <Badge
                    variant="outline"
                    className="border-blue-300 bg-card text-[#003876] text-[10px] gap-1"
                    title={describeInterviewTarget(post.interview.targetCriteria)}
                  >
                    <Target size={9} />
                    대상: {describeInterviewTarget(post.interview.targetCriteria)}
                  </Badge>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
                {post.interview.intro}
              </p>
              <div className="mt-4">
                {(() => {
                  const isExpired = post.interview.deadline
                    ? new Date(post.interview.deadline).getTime() < Date.now()
                    : false;
                  if (!user) {
                    return (
                      <Button onClick={() => setShowLoginModal(true)}>
                        <LogIn size={14} className="mr-1" />
                        로그인 후 참여하기
                      </Button>
                    );
                  }
                  if (isExpired) {
                    return (
                      <Button disabled variant="outline">
                        마감된 인터뷰입니다
                      </Button>
                    );
                  }
                  return (
                    <Button onClick={() => setShowInterviewPlayer(true)}>
                      <Mic size={14} className="mr-1" />
                      {myInterviewResp?.status === "submitted"
                        ? "내 답변 수정하기"
                        : myInterviewResp?.status === "draft"
                          ? "이어서 참여하기"
                          : "참여하기"}
                    </Button>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div
              className="mt-6 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderPostContent(post.content) }}
            />
          )}

          {post.poll && (
            <div className="mt-6">
              <PollViewer
                poll={post.poll}
                myVote={myVoteData?.optionIds}
                canVote={!!user}
                onSubmit={handleVote}
              />
            </div>
          )}
        </article>

        {post.type === "interview" && post.interview && (
          <InterviewResponses
            postId={id}
            meta={post.interview}
          />
        )}

        {showInterviewPlayer && post.type === "interview" && post.interview && (
          <InterviewPlayer
            post={post}
            existing={myInterviewResp}
            onClose={() => setShowInterviewPlayer(false)}
            onSubmitted={() => {
              setShowInterviewPlayer(false);
              toast.success("응답이 제출되었습니다!");
            }}
          />
        )}

        {/* Sprint 67-AO: 게시글 공감 reaction (인터뷰 외 모든 카테고리) */}
        {post.type !== "interview" && (
          <section className="mt-8">
            <PostReactions postId={post.id} />
          </section>
        )}

        {post.type !== "interview" && (
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
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowLoginModal(true)}
                >
                  <LogIn size={14} className="mr-1" />
                  로그인 후 댓글 작성
                </Button>
              </div>
            )}
          </section>
        )}

        <LoginModal
          open={showLoginModal}
          onOpenChange={setShowLoginModal}
          returnUrl={`/board/${id}`}
          title="로그인 후 이어서 진행하기"
          description={
            post.type === "interview"
              ? "로그인하면 이 페이지를 떠나지 않고 인터뷰에 참여할 수 있습니다."
              : "로그인하면 이 페이지를 떠나지 않고 활동을 이어갈 수 있습니다."
          }
          onLoggedIn={() => {
            // 인터뷰 게시글이라면 로그인 직후 바로 참여 모달 노출
            if (post.type === "interview" && post.interview) {
              const isExpired = post.interview.deadline
                ? new Date(post.interview.deadline).getTime() < Date.now()
                : false;
              if (!isExpired) setShowInterviewPlayer(true);
            }
          }}
        />

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
