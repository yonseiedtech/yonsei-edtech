"use client";

import { useState, useMemo } from "react";
import { usePosts } from "@/features/board/useBoard";
import PostList from "@/features/board/PostList";
import { Input } from "@/components/ui/input";
import { Bell, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function NoticesPage() {
  const { posts, isLoading } = usePosts("notice");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q),
    );
  }, [posts, search]);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">공지사항</h1>
            <p className="text-sm text-muted-foreground">
              연세교육공학회의 주요 소식과 안내를 확인하세요.
            </p>
          </div>
        </div>

        <div className="relative mt-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="공지사항 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <PostList posts={filtered} hrefPrefix="/notices" />
          )}
        </div>
      </div>
    </div>
  );
}
