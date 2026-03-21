"use client";

import { useState } from "react";
import Link from "next/link";
import { PenSquare, Search, ChevronLeft, ChevronRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/auth-store";
import PostList from "@/features/board/PostList";
import { usePosts } from "@/features/board/useBoard";
import { isAtLeast } from "@/lib/permissions";
import type { PostCategory } from "@/types";

interface Props {
  category: PostCategory;
  title: string;
  description: string;
  icon: React.ReactNode;
  /** 글 작성에 필요한 최소 role. 미지정 시 로그인만 필요. */
  minWriteRole?: "staff" | "president";
}

export default function CategoryBoardPage({ category, title, description, icon, minWriteRole }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { posts, totalPages } = usePosts(category, { page, search });
  const { user } = useAuthStore();

  const canWrite = user && (!minWriteRole || isAtLeast(user, minWriteRole));

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h1 className="text-3xl font-bold">{title}</h1>
          </div>
          {canWrite ? (
            <Link href={`/board/write?category=${category}`}>
              <Button size="sm">
                <PenSquare size={16} className="mr-1" />
                글쓰기
              </Button>
            </Link>
          ) : user ? null : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                <LogIn size={16} className="mr-1" />
                로그인 후 글 작성
              </Button>
            </Link>
          )}
        </div>
        <p className="mt-2 text-muted-foreground">{description}</p>

        <div className="mt-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="제목 또는 작성자 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 w-full max-w-sm"
          />
        </div>

        <div className="mt-6">
          <PostList posts={posts} />
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
