"use client";

import Link from "next/link";
import { MOCK_POSTS } from "@/features/board/board-data";
import { formatDate } from "@/lib/utils";
import { Bell, ArrowRight } from "lucide-react";

export default function NoticePreview() {
  const notices = MOCK_POSTS.filter((p) => p.category === "notice")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

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
          {notices.map((post) => (
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
          ))}
          {notices.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              공지사항이 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
