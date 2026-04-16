import Link from "next/link";
import { CATEGORY_LABELS } from "@/types";
import type { Post } from "@/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Eye, ListChecks } from "lucide-react";

interface Props {
  posts: Post[];
  hrefPrefix?: string;
}

export default function PostList({ posts, hrefPrefix = "/board" }: Props) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
        게시글이 없습니다.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-xl border bg-white">
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
                  {post.responseCount}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
