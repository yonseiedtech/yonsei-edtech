import Link from "next/link";
import { CATEGORY_LABELS } from "@/types";
import type { Post } from "@/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Eye, ListChecks, Clock, Target } from "lucide-react";
import { describeInterviewTarget } from "@/lib/interview-target";

interface Props {
  posts: Post[];
  hrefPrefix?: string;
}

export default function PostList({ posts, hrefPrefix = "/board" }: Props) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        게시글이 없습니다.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-xl border bg-card">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`${hrefPrefix}/${post.id}`}
          className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "shrink-0 rounded px-2 py-0.5 text-xs font-medium",
                  post.category === "notice"
                    ? "bg-primary/10 text-primary"
                    : post.category === "seminar"
                    ? "bg-secondary/15 text-amber-700"
                    : post.category === "promotion"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {CATEGORY_LABELS[post.category as keyof typeof CATEGORY_LABELS] ?? post.category}
              </span>
              <h3 className="truncate font-medium">{post.title}</h3>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{post.authorName}</span>
              <span>{formatDate(post.createdAt)}</span>
              <span className="flex items-center gap-1">
                <Eye size={12} />
                {post.viewCount}
              </span>
              {post.category === "interview" && (post.responseCount ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-primary" title="제출된 응답 수">
                  <ListChecks size={12} />
                  {post.responseCount}명 참여
                </span>
              )}
              {/* Sprint 67-AG: 인터뷰 메타 — 마감일·진행상태·대상 */}
              {post.category === "interview" && post.interview && (() => {
                const meta = post.interview;
                const now = Date.now();
                const deadlineMs = meta.deadline ? new Date(meta.deadline).getTime() : null;
                const isExpired = deadlineMs != null && deadlineMs < now;
                const isImminent =
                  deadlineMs != null && deadlineMs >= now && deadlineMs - now < 1000 * 60 * 60 * 24 * 3;
                return (
                  <>
                    {/* 진행 상태 */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        isExpired
                          ? "bg-muted text-muted-foreground"
                          : isImminent
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
                      )}
                    >
                      {isExpired ? "● 마감" : isImminent ? "● 마감 임박" : "● 진행중"}
                    </span>
                    {meta.deadline && (
                      <span
                        className="flex items-center gap-1"
                        title={new Date(meta.deadline).toLocaleString("ko-KR")}
                      >
                        <Clock size={11} />
                        {new Date(meta.deadline).toLocaleDateString("ko-KR")}
                      </span>
                    )}
                    {meta.targetCriteria && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-800 dark:bg-blue-950/30 dark:text-blue-200"
                        title={`대상: ${describeInterviewTarget(meta.targetCriteria)}`}
                      >
                        <Target size={10} />
                        {describeInterviewTarget(meta.targetCriteria)}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
