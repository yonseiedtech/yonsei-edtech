"use client";

import { useState } from "react";
import Link from "next/link";
import { usePosts } from "@/features/board/useBoard";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import PostList from "@/features/board/PostList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import {
  Bell,
  Search,
  PenSquare,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Inbox,
} from "lucide-react";

export default function NoticesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { posts, totalPages, isLoading, error } = usePosts("notice", {
    page,
    search,
  });
  const { user } = useAuthStore();
  const canWrite = isAtLeast(user, "president");

  const writeAction = canWrite ? (
    <Link href="/board/write?category=notice">
      <Button size="sm" className="shrink-0">
        <PenSquare size={15} className="mr-1.5" aria-hidden />
        공지 작성
      </Button>
    </Link>
  ) : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-4xl px-4">
        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={Bell}
          title="공지사항"
          description="연세교육공학회의 주요 소식과 안내를 확인하세요."
          actions={writeAction}
        />

        <Separator className="mt-6" />

        {/* ── 검색 툴바 ── */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="제목, 작성자 검색…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 text-sm"
              aria-label="공지사항 검색"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                aria-label="검색어 지우기"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* 총 건수 표시 (로딩 완료 후) */}
          {!isLoading && !error && (
            <p className="shrink-0 text-xs text-muted-foreground" aria-live="polite">
              {search
                ? `"${search}" 검색 결과 ${posts.length + (page - 1) * 10}건`
                : `총 ${totalPages > 1 ? `${page} / ${totalPages} 페이지` : `${posts.length}건`}`}
            </p>
          )}
        </div>

        {/* ── 본문 ── */}
        <div className="mt-5">
          {isLoading ? (
            <NoticeListSkeleton />
          ) : error ? (
            <EmptyState
              icon={AlertCircle}
              title="공지사항을 불러오는 중 오류가 발생했습니다"
              description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
              actionLabel="다시 시도"
              onAction={() => window.location.reload()}
            />
          ) : posts.length === 0 && search ? (
            <EmptyState
              icon={Inbox}
              title={`"${search}"에 대한 공지사항이 없습니다`}
              description="다른 키워드로 검색하거나 검색을 초기화해 보세요."
              actionLabel="검색 초기화"
              onAction={() => {
                setSearch("");
                setPage(1);
              }}
            />
          ) : (
            <PostList posts={posts} hrefPrefix="/notices" />
          )}
        </div>

        {/* ── 페이지네이션 ── */}
        {totalPages > 1 && (
          <nav
            aria-label="공지사항 페이지 이동"
            className="mt-8 flex items-center justify-center gap-2"
          >
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="이전 페이지"
            >
              <ChevronLeft size={16} aria-hidden />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(p)}
                aria-label={`${p} 페이지`}
                aria-current={p === page ? "page" : undefined}
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
              aria-label="다음 페이지"
            >
              <ChevronRight size={16} aria-hidden />
            </Button>
          </nav>
        )}
      </div>
    </div>
  );
}

/* ── 스켈레톤 — PostList 카드 형태와 일치 ── */
function NoticeListSkeleton() {
  return (
    <div
      className="divide-y rounded-2xl border bg-card shadow-sm overflow-hidden"
      aria-busy="true"
      aria-label="공지사항 불러오는 중"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-2/5" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
          <Skeleton className="h-4 w-4 shrink-0 rounded" />
        </div>
      ))}
    </div>
  );
}
