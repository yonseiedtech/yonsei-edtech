"use client";

/**
 * 최근 게시판 글 위젯 (사이클 80) — 대시보드 소통 강화
 * 공지 외 커뮤니티 게시판(자유·논문리뷰·인터뷰·세미나 토론·소식)의 최근 글을 모아
 * 회원이 대시보드에서 바로 소통 흐름을 보고 참여하도록 한다.
 */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare, ArrowRight } from "lucide-react";
import { postsApi } from "@/lib/bkend";
import { CATEGORY_LABELS, type Post, type PostCategory } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";

// 대시보드에서 강조할 '소통' 카테고리 (공지는 별도 위젯이라 제외)
const COMMUNITY_CATEGORIES: PostCategory[] = ["free", "paper_review", "interview", "seminar", "update"];

const CATEGORY_CHIP: Partial<Record<PostCategory, string>> = {
  free: "bg-info/10 text-info border-info/20",
  paper_review: "bg-cat-5/10 text-cat-5 border-cat-5/20",
  interview: "bg-warning/10 text-warning border-warning/20",
  seminar: "bg-success/10 text-success border-success/20",
  update: "bg-destructive/10 text-destructive border-destructive/20",
};

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = Math.floor(diff / 86400000);
  if (day <= 0) return "오늘";
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export default function RecentPostsWidget() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["dashboard-recent-posts"],
    queryFn: async () => (await postsApi.listReadable({ limit: 20 })).data as Post[],
    staleTime: 3 * 60_000,
  });

  const recent = posts
    .filter((p) => COMMUNITY_CATEGORIES.includes(p.category))
    .slice(0, 6);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessagesSquare size={18} className="text-primary" />
          <h2 className="font-bold">최근 게시판 글</h2>
        </div>
        <Link
          href="/board"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          전체 보기 <ArrowRight size={12} />
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <EmptyState
          compact
          title="아직 게시글이 없습니다"
          description="첫 글로 대화를 시작해 보세요."
          actionLabel="게시판 바로가기"
          actionHref="/board"
          className="mt-4"
        />
      ) : (
        <ul className="mt-4 space-y-1">
          {recent.map((p) => (
            <li key={p.id}>
              <Link
                href={`/board/${p.id}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                    CATEGORY_CHIP[p.category] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {CATEGORY_LABELS[p.category]}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeDate(p.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
