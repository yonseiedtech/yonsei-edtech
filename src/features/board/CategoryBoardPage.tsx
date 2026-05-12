"use client";

import { useState } from "react";
import Link from "next/link";
import { PenSquare, Search, ChevronLeft, ChevronRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { posts, totalPages, isLoading } = usePosts(category, { page, search });
  const { user } = useAuthStore();

  const canWrite = user && (!minWriteRole || isAtLeast(user, minWriteRole));

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4">

        {/* ── 페이지 헤더 (steppingstone 패턴) ── */}
        <header className="mb-8 sm:mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            {/* 아이콘 + 제목 */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-sky-400/15 text-primary shadow-sm">
                {icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  {description}
                </p>
              </div>
            </div>

            {/* 글쓰기 CTA */}
            <div className="sm:shrink-0">
              {canWrite ? (
                <Link href={`/board/write?category=${category}`}>
                  <Button
                    size="sm"
                    className="w-full gap-1.5 sm:w-auto"
                    aria-label={`${title}에 새 글 작성`}
                  >
                    <PenSquare size={15} aria-hidden />
                    글쓰기
                  </Button>
                </Link>
              ) : !user ? (
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 sm:w-auto"
                    aria-label="로그인 후 글 작성하기"
                  >
                    <LogIn size={15} aria-hidden />
                    로그인 후 글 작성
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          {/* ── 검색 바 ── */}
          <div className="mt-5 relative max-w-sm">
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="제목 또는 작성자 검색..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 focus-visible:ring-2"
              aria-label="게시글 검색"
            />
          </div>
        </header>

        {/* ── 게시글 목록 ── */}
        <section aria-label="게시글 목록" aria-busy={isLoading}>
          {isLoading ? (
            <PostListSkeleton />
          ) : (
            <PostList posts={posts} />
          )}
        </section>

        {/* ── 페이지네이션 ── */}
        {!isLoading && totalPages > 1 && (
          <nav
            aria-label="페이지 이동"
            className="mt-8 flex items-center justify-center gap-1.5"
          >
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="이전 페이지"
              className="h-9 w-9 p-0"
            >
              <ChevronLeft size={16} aria-hidden />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(p)}
                aria-label={`${p}페이지`}
                aria-current={p === page ? "page" : undefined}
                className="h-9 min-w-[36px] px-2.5 text-sm"
              >
                {p}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="다음 페이지"
              className="h-9 w-9 p-0"
            >
              <ChevronRight size={16} aria-hidden />
            </Button>
          </nav>
        )}
      </div>
    </div>
  );
}

/* ── 로딩 스켈레톤 ── */
function PostListSkeleton() {
  return (
    <div
      className="divide-y rounded-2xl border bg-card shadow-sm overflow-hidden"
      aria-label="게시글 불러오는 중"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-48 sm:w-72" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
