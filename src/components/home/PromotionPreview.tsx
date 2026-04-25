"use client";

import Link from "next/link";
import { usePosts } from "@/features/board/useBoard";
import { formatDate } from "@/lib/utils";
import { Megaphone, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PromotionPreview() {
  const { posts: promotions, isLoading } = usePosts("promotion");

  return (
    <section className="border-b py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone size={20} className="text-emerald-600" />
            <h2 className="text-xl font-bold">홍보게시판</h2>
          </div>
          <Link
            href="/board/promotion"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            더보기 <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-4 rounded-xl border bg-white p-4">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-3" aria-busy="true" aria-label="홍보글 불러오는 중">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ) : promotions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              등록된 홍보글이 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {promotions.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  href={`/board/${post.id}`}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
                >
                  <h3 className="line-clamp-2 font-medium">{post.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {post.content.replace(/<[^>]*>/g, "").slice(0, 120)}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{post.authorName}</span>
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
