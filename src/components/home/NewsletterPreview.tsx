"use client";

import Link from "next/link";
import { MOCK_POSTS } from "@/features/board/board-data";
import { formatDate } from "@/lib/utils";
import { Newspaper, ArrowRight } from "lucide-react";

export default function NewsletterPreview() {
  const newsletters = MOCK_POSTS.filter((p) => p.category === "newsletter")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <section className="border-b py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper size={20} className="text-violet-600" />
            <h2 className="text-xl font-bold">학회보</h2>
          </div>
          <Link
            href="/board?category=newsletter"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            더보기 <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-4 divide-y rounded-xl border bg-white">
          {newsletters.map((post) => (
            <Link
              key={post.id}
              href={`/board/${post.id}`}
              className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0">
                <span className="truncate font-medium">{post.title}</span>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {post.content}
                </p>
              </div>
              <span className="shrink-0 pl-4 text-xs text-muted-foreground">
                {formatDate(post.createdAt)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
