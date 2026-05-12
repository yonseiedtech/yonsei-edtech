"use client";

import { useState } from "react";
import Link from "next/link";
import { Mic, Search, PenSquare, ChevronLeft, ChevronRight, X, AlertCircle, Inbox, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import PostList from "@/features/board/PostList";
import { usePosts } from "@/features/board/useBoard";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";

export default function InterviewBoardPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { posts, totalPages, isLoading, error } = usePosts("interview", { page, search });
  const { user } = useAuthStore();

  const canWrite = user && isAtLeast(user, "staff");

  const writeAction = canWrite ? (
    <Link href="/board/write?category=interview">
      <Button size="sm" className="shrink-0 gap-1.5" aria-label="새 인터뷰 글 작성">
        <PenSquare size={15} aria-hidden />
        인터뷰 등록
      </Button>
    </Link>
  ) : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-4xl px-4">

        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={Mic}
          title="인터뷰 게시판"
          description="선배·졸업생의 경험과 통찰을 만나고, 암묵지를 공유합니다."
          actions={writeAction}
        />

        <Separator className="mt-6" />

        {/* ── 맥락 배너 — Cognitive Apprenticeship 채널 안내 ── */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-slate-50 p-4 shadow-sm dark:border-sky-800 dark:from-sky-950/30 dark:to-slate-950/40">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
            aria-hidden="true"
          >
            <GraduationCap size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">
              암묵지 채널 — Cognitive Apprenticeship
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              선배·졸업생의 경험이 담긴 인터뷰는 대화와 관찰로만 전달될 수 있는 지식을 텍스트로 기록합니다.
              각 인터뷰는 운영진이 대상 학기·계층을 설정하여 개설하며,
              해당 조건의 회원이 응답을 제출합니다.
            </p>
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
            aria-hidden="true"
          >
            <Users size={18} />
          </div>
        </div>

        {/* ── 검색 툴바 ── */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="제목, 작성자 검색…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 text-sm focus-visible:ring-2"
              aria-label="인터뷰 게시글 검색"
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

          {/* 결과 건수 (로딩 완료 후) */}
          {!isLoading && !error && (
            <p
              className="shrink-0 text-xs text-muted-foreground"
              aria-live="polite"
              aria-atomic="true"
            >
              {search
                ? `"${search}" 검색 결과 ${posts.length + (page - 1) * 10}건`
                : totalPages > 1
                ? `${page} / ${totalPages} 페이지`
                : `총 ${posts.length}건`}
            </p>
          )}
        </div>

        {/* ── 게시글 목록 ── */}
        <section
          aria-label="인터뷰 게시글 목록"
          aria-busy={isLoading}
          className="mt-5"
        >
          {isLoading ? (
            <InterviewListSkeleton />
          ) : error ? (
            <EmptyState
              icon={AlertCircle}
              title="인터뷰 게시글을 불러오는 중 오류가 발생했습니다"
              description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
              actionLabel="다시 시도"
              onAction={() => window.location.reload()}
            />
          ) : posts.length === 0 && search ? (
            <EmptyState
              icon={Inbox}
              title={`"${search}"에 대한 인터뷰가 없습니다`}
              description="다른 키워드로 검색하거나 검색을 초기화해 보세요."
              actionLabel="검색 초기화"
              onAction={() => {
                setSearch("");
                setPage(1);
              }}
            />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={Mic}
              title="아직 등록된 인터뷰가 없습니다"
              description="운영진이 인터뷰를 개설하면 여기에 표시됩니다. 선배·졸업생의 경험을 기다려주세요."
            />
          ) : (
            <PostList posts={posts} />
          )}
        </section>

        {/* ── 페이지네이션 ── */}
        {!isLoading && totalPages > 1 && (
          <nav
            aria-label="인터뷰 게시판 페이지 이동"
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

/* ── 로딩 스켈레톤 — PostList 카드 형태와 일치 ── */
function InterviewListSkeleton() {
  return (
    <div
      className="divide-y rounded-2xl border bg-card shadow-sm overflow-hidden"
      aria-busy="true"
      aria-label="인터뷰 게시글 불러오는 중"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            {/* 제목 행: 카테고리 칩 + 제목 */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-2/5" />
            </div>
            {/* 메타 행: 작성자 + 날짜 + 조회수 + 진행상태 배지 + 대상 배지 */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-4 w-4 shrink-0 rounded" />
        </div>
      ))}
    </div>
  );
}
