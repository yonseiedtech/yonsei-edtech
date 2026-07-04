"use client";

/**
 * "지난 방문 이후 새 글 N" 뱃지 (RT-1, 2026-07-04)
 *
 * lastVisitAt(users 필드, 대시보드 방문 시 갱신) 이전 시점을 기준으로
 * 새 게시글 수를 서버 집계 API 에서 받아 게시판 재방문을 유도한다.
 * 첫 방문(기준 없음)·새 글 0건이면 렌더하지 않는다.
 */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, ArrowRight } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function NewPostsBadge({ prevVisit }: { prevVisit?: string | null }) {
  const { data: count = 0 } = useQuery({
    queryKey: ["new-posts-since", prevVisit ?? "none"],
    enabled: !!prevVisit,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return 0;
      const res = await fetch(`/api/posts/new-count?since=${encodeURIComponent(prevVisit!)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return 0;
      return ((await res.json()) as { count: number }).count;
    },
  });

  if (!prevVisit || count <= 0) return null;
  return (
    <Link
      href="/board"
      className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm transition-colors hover:bg-primary/10"
    >
      <span className="flex items-center gap-2 font-medium text-foreground/90">
        <MessageSquare size={15} className="text-primary" />
        지난 방문 이후 새 글 <span className="font-bold text-primary">{count > 99 ? "99+" : count}건</span>이 올라왔어요
      </span>
      <ArrowRight size={15} className="shrink-0 text-primary" />
    </Link>
  );
}
