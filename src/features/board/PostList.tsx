import Link from "next/link";
import { CATEGORY_LABELS } from "@/types";
import type { Post } from "@/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Eye, ListChecks, Clock, Target, MessageSquare, Heart, ArrowRight } from "lucide-react";
import { describeInterviewTarget } from "@/lib/interview-target";
import EmptyState from "@/components/ui/empty-state";

interface Props {
  posts: Post[];
  hrefPrefix?: string;
}

export default function PostList({ posts, hrefPrefix = "/board" }: Props) {
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="아직 게시글이 없습니다"
        description="첫 번째 글을 작성해 이야기를 시작해 보세요."
      />
    );
  }

  return (
    <div
      className="divide-y rounded-2xl border bg-card shadow-sm overflow-hidden"
      role="list"
      aria-label="게시글 목록"
    >
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`${hrefPrefix}/${post.id}`}
          role="listitem"
          aria-label={`${post.title} — ${post.authorName}`}
          className={cn(
            "group flex items-center justify-between gap-4 px-5 py-4",
            "transition-colors duration-150",
            "hover:bg-muted/40 dark:hover:bg-muted/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          )}
        >
          {/* ── 좌측: 제목 + 메타 ── */}
          <div className="min-w-0 flex-1">
            {/* 제목 행 */}
            <div className="flex items-center gap-2">
              <CategoryChip category={post.category} />
              <h3 className="truncate text-sm font-semibold text-foreground sm:text-base leading-snug">
                {post.title}
              </h3>
              {/* 댓글 수 — 제목 옆 인라인 (있을 때만) */}
              {(post.commentCount ?? 0) > 0 && (
                <span
                  aria-label={`댓글 ${post.commentCount}개`}
                  className="shrink-0 flex items-center gap-0.5 text-xs text-primary font-medium"
                >
                  <MessageSquare size={11} aria-hidden />
                  {post.commentCount}
                </span>
              )}
            </div>

            {/* 메타 행 */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">{post.authorName}</span>
              <span className="text-muted-foreground/60">{formatDate(post.createdAt)}</span>

              {/* 조회수 */}
              <span className="flex items-center gap-1" aria-label={`조회 ${post.viewCount}회`}>
                <Eye size={11} aria-hidden />
                {post.viewCount}
              </span>

              {/* 공감 reaction (인터뷰 외) */}
              {post.category !== "interview" && (post.reactionCount ?? 0) > 0 && (
                <span
                  className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-medium"
                  aria-label={`공감 ${post.reactionCount}개`}
                  title="공감 (👍 ✨ 💗 📣) 총 합"
                >
                  <Heart size={11} aria-hidden />
                  {post.reactionCount}
                </span>
              )}

              {/* 인터뷰 전용 — 참여자 수 */}
              {post.category === "interview" && (post.responseCount ?? 0) > 0 && (
                <span
                  className="flex items-center gap-1 text-primary font-medium"
                  aria-label={`${post.responseCount}명 참여`}
                  title="제출된 응답 수"
                >
                  <ListChecks size={11} aria-hidden />
                  {post.responseCount}명 참여
                </span>
              )}

              {/* 인터뷰 메타 — 진행상태·마감일·대상 */}
              {post.category === "interview" && post.interview && (
                <InterviewMeta interview={post.interview} />
              )}
            </div>
          </div>

          {/* ── 우측: hover 화살표 ── */}
          <ArrowRight
            size={15}
            aria-hidden
            className="shrink-0 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary/60"
          />
        </Link>
      ))}
    </div>
  );
}

/* ── 서브 컴포넌트 ── */

function CategoryChip({ category }: { category: Post["category"] }) {
  const label = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none",
        category === "notice"
          ? "bg-primary/10 text-primary"
          : category === "seminar"
          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
          : category === "promotion"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
          : category === "paper_review"
          ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
          : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function InterviewMeta({ interview: meta }: { interview: NonNullable<Post["interview"]> }) {
  const now = Date.now();
  const deadlineMs = meta.deadline ? new Date(meta.deadline).getTime() : null;
  const isExpired = deadlineMs != null && deadlineMs < now;
  const isImminent =
    deadlineMs != null && deadlineMs >= now && deadlineMs - now < 1000 * 60 * 60 * 24 * 3;

  return (
    <>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
          isExpired
            ? "bg-muted text-muted-foreground"
            : isImminent
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
        )}
        aria-label={isExpired ? "마감" : isImminent ? "마감 임박" : "진행중"}
      >
        {isExpired ? "● 마감" : isImminent ? "● 마감 임박" : "● 진행중"}
      </span>
      {meta.deadline && (
        <span
          className="flex items-center gap-1"
          title={new Date(meta.deadline).toLocaleString("ko-KR")}
        >
          <Clock size={11} aria-hidden />
          {new Date(meta.deadline).toLocaleDateString("ko-KR")}
        </span>
      )}
      {meta.targetCriteria && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-800 dark:bg-blue-950/30 dark:text-blue-200"
          title={`대상: ${describeInterviewTarget(meta.targetCriteria)}`}
        >
          <Target size={10} aria-hidden />
          {describeInterviewTarget(meta.targetCriteria)}
        </span>
      )}
    </>
  );
}
