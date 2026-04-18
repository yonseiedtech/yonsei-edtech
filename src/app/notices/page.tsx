"use client";

import { useState } from "react";
import Link from "next/link";
import { usePosts } from "@/features/board/useBoard";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import PostList from "@/features/board/PostList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Search, PenSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function NoticesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { posts, totalPages, isLoading } = usePosts("notice", { page, search });
  const { user } = useAuthStore();
  const canWrite = isAtLeast(user, "president");

  return (
    <div className="py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between">
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
          {canWrite && (
            <Link href="/board/write?category=notice">
              <Button size="sm">
                <PenSquare size={16} className="mr-1" />
                공지 작성
              </Button>
            </Link>
          )}
        </div>

        <div className="relative mt-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="공지사항 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 w-full max-w-sm"
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
            <PostList posts={posts} hrefPrefix="/notices" />
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={16} />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)} className="min-w-[36px]">{p}</Button>
            ))}
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
