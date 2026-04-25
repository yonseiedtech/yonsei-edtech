"use client";

import Link from "next/link";
import { usePosts } from "@/features/board/useBoard";
import { formatDate } from "@/lib/utils";
import { Bell, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function NoticePreview() {
  const { posts: notices, isLoading } = usePosts("notice");

  return (
    <section className="border-b py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            <h2 className="text-xl font-bold">공지사항</h2>
          </div>
          <Link
            href="/notices"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            더보기 <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-4 divide-y rounded-xl border bg-white">
          {isLoading ? (
            <div className="space-y-2 px-5 py-3" aria-busy="true" aria-label="공지사항 불러오는 중">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full rounded" />
              ))}
            </div>
          ) : notices.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              공지사항이 없습니다.
            </div>
          ) : (
            notices.slice(0, 3).map((post) => (
              <Link
                key={post.id}
                href={`/notices/${post.id}`}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/30"
              >
                <span className="truncate font-medium">{post.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(post.createdAt)}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
