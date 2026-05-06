"use client";

import { useQuery } from "@tanstack/react-query";
import { dataApi } from "@/lib/bkend";
import type { Comment, Post } from "@/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";

interface ActivityFeedProps {
  userId: string;
  posts: Post[];
  limit?: number;
}

export default function ActivityFeed({
  userId,
  posts,
  limit = 5,
}: ActivityFeedProps) {
  const myPostIds = posts
    .filter((p) => p.authorId === userId)
    .map((p) => p.id);

  // 최근 댓글을 가져와서 내 게시글에 달린 것만 필터
  const { data: recentComments = [], isLoading } = useQuery({
    queryKey: ["dashboard-activity", userId],
    queryFn: async () => {
      const res = await dataApi.list<Comment>("comments", {
        sort: "createdAt:desc",
        limit: 50,
      });
      const comments = (res.data as unknown as Comment[]) ?? [];
      // 내 게시글에 달린 댓글 중 내가 쓴 것은 제외
      return comments
        .filter((c) => myPostIds.includes(c.postId) && c.authorId !== userId)
        .slice(0, limit);
    },
    enabled: myPostIds.length > 0,
    retry: false,
    staleTime: 60_000,
  });

  const postMap = new Map(posts.map((p) => [p.id, p]));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (recentComments.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="아직 활동 내역이 없어요"
        description="내 게시글에 댓글이 달리면 여기에 모아 보여드려요."
        compact
        className="bg-transparent"
      />
    );
  }

  return (
    <div className="relative ml-3">
      {/* 세로 타임라인 점선 */}
      <div className="absolute left-3.5 top-2 bottom-2 w-px border-l border-dashed border-muted-foreground/30" />

      {recentComments.map((c, idx) => {
        const post = postMap.get(c.postId);
        const isLast = idx === recentComments.length - 1;
        return (
          <Link
            key={c.id}
            href={`/board/${c.postId}`}
            className="relative flex items-start gap-4 rounded-lg py-3 pr-3 pl-10 transition-colors hover:bg-muted/50"
          >
            {/* 아바타 (타임라인 노드) */}
            <div className="absolute left-0 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-blue-600 dark:border-card dark:bg-blue-950/50 dark:text-blue-300">
              <span className="text-xs font-semibold">
                {(c.authorName ?? "?")[0]}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{c.authorName}</span>
                <span className="text-muted-foreground">님이 </span>
                <span className="font-medium">
                  &lsquo;{post?.title ?? "게시글"}&rsquo;
                </span>
                <span className="text-muted-foreground">
                  에 댓글을 남겼습니다
                </span>
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {c.content}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                {formatDate(c.createdAt)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
