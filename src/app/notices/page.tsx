"use client";

import { usePosts } from "@/features/board/useBoard";
import PostList from "@/features/board/PostList";
import { Bell } from "lucide-react";

export default function NoticesPage() {
  const { posts } = usePosts("notice");

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center gap-2">
          <Bell size={24} className="text-primary" />
          <h1 className="text-3xl font-bold">공지사항</h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          연세교육공학회의 주요 소식과 안내를 확인하세요.
        </p>
        <div className="mt-8">
          <PostList posts={posts} hrefPrefix="/notices" />
        </div>
      </div>
    </div>
  );
}
