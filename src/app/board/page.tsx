"use client";

import { useState } from "react";
import Link from "next/link";
import { PenSquare, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthGuard from "@/features/auth/AuthGuard";
import CategoryTabs from "@/features/board/CategoryTabs";
import PostList from "@/features/board/PostList";
import { usePosts } from "@/features/board/useBoard";
import type { PostCategory } from "@/types";

function BoardContent() {
  const [activeCategory, setActiveCategory] = useState<PostCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { posts, totalPages } = usePosts(activeCategory, { page, search });

  function handleCategoryChange(cat: PostCategory | "all") {
    setActiveCategory(cat);
    setPage(1);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

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
          <CategoryTabs active={activeCategory} onChange={handleCategoryChange} />
        </div>

        <div className="mt-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="제목 또는 작성자 검색..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9 w-full max-w-sm"
          />
        </div>

        <div className="mt-6">
          <PostList posts={posts} />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(p)}
                className="min-w-[36px]"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
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
