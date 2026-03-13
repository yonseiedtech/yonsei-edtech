"use client";

import Link from "next/link";
import { MOCK_POSTS } from "@/features/board/board-data";
import { formatDate } from "@/lib/utils";
import { Megaphone, ArrowRight } from "lucide-react";

export default function PromotionPreview() {
  const promotions = MOCK_POSTS.filter((p) => p.category === "promotion")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <section className="border-b py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone size={20} className="text-emerald-600" />
            <h2 className="text-xl font-bold">홍보게시판</h2>
          </div>
          <Link
            href="/board?category=promotion"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            더보기 <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {promotions.map((post) => (
            <Link
              key={post.id}
              href={`/board/${post.id}`}
              className="rounded-xl border bg-white p-5 transition-colors hover:bg-muted/30"
            >
              <h3 className="line-clamp-2 font-medium">{post.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {post.content}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{post.authorName}</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
