import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/types";
import type { Post } from "@/types";

interface Props {
  posts: Post[];
}

export default function MyPostList({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        작성한 게시글이 없습니다.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-xl border bg-card">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/board/${post.id}`}
          className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                {CATEGORY_LABELS[post.category]}
              </span>
              <span className="truncate text-sm font-medium">{post.title}</span>
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDate(post.createdAt)}
          </span>
        </Link>
      ))}
    </div>
  );
}
