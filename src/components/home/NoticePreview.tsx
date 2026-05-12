"use client";

import Link from "next/link";
import { usePosts } from "@/features/board/useBoard";
import { formatDate } from "@/lib/utils";
import { Bell, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function NoticePreview() {
  const { posts: notices, isLoading } = usePosts("notice");

  return (
    <section className="border-b py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell size={18} aria-hidden />
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">공지사항</h2>
          </div>
          <Link
            href="/notices"
            className="group inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            더보기
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mt-5 divide-y rounded-2xl border bg-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="space-y-2 px-5 py-4" aria-busy="true" aria-label="공지사항 불러오는 중">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full rounded" />
              ))}
            </div>
          ) : notices.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              아직 공지사항이 없습니다.
            </div>
          ) : (
            notices.slice(0, 3).map((post) => (
              <Link
                key={post.id}
                href={`/notices/${post.id}`}
                className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40"
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
