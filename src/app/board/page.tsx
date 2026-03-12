"use client";

import { useState } from "react";
import Link from "next/link";
import { PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthGuard from "@/features/auth/AuthGuard";
import CategoryTabs from "@/features/board/CategoryTabs";
import PostList from "@/features/board/PostList";
import { usePosts } from "@/features/board/useBoard";
import type { PostCategory } from "@/types";

function BoardContent() {
  const [activeCategory, setActiveCategory] = useState<PostCategory | "all">("all");
  const { posts } = usePosts(activeCategory);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">게시판</h1>
          <Link href="/board/write">
            <Button size="sm">
              <PenSquare size={16} className="mr-1" />
              글쓰기
            </Button>
          </Link>
        </div>

        <div className="mt-6">
          <CategoryTabs active={activeCategory} onChange={setActiveCategory} />
        </div>

        <div className="mt-6">
          <PostList posts={posts} />
        </div>
      </div>
    </div>
  );
}

export default function BoardPage() {
  return (
    <AuthGuard>
      <BoardContent />
    </AuthGuard>
  );
}
