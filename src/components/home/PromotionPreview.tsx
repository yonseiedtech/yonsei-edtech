"use client";

import Link from "next/link";
import { usePosts } from "@/features/board/useBoard";
import { formatDate } from "@/lib/utils";
import { Megaphone, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PromotionPreview() {
  const { posts: promotions, isLoading } = usePosts("promotion");

  return (
    <section className="border-b py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Megaphone size={18} aria-hidden />
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">홍보게시판</h2>
          </div>
          <Link
            href="/board/promotion"
            className="group inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            더보기
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mt-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-3" aria-busy="true" aria-label="홍보글 불러오는 중">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : promotions.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              아직 등록된 홍보글이 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {promotions.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  href={`/board/${post.id}`}
                  className="group rounded-2xl border bg-background p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <h3 className="line-clamp-2 font-bold tracking-tight transition-colors group-hover:text-primary">{post.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {post.content.replace(/<[^>]*>/g, "").slice(0, 120)}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{post.authorName}</span>
                    <span aria-hidden>·</span>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
