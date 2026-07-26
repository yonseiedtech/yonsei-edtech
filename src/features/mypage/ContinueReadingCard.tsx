"use client";

/**
 * 마이페이지 "이어읽기" 위젯 (v16 H3)
 *
 * 러닝 가이드 진행 데이터(guideProgressApi.listMine)를 조회해,
 * 읽던 가이드를 진행 순으로 노출 → 재방문 리텐션 훅.
 *
 * 제약: DB/rules 무변경(읽기 전용). 브랜드 시맨틱 토큰만. 진행 없으면 렌더 안 함.
 */

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { guidesApi, guideProgressApi } from "@/features/learning-guides/api";

interface ReadingItem {
  slug: string;
  title: string;
  coverEmoji?: string;
  readCount: number;
  updatedAt: string;
}

export default function ContinueReadingCard() {
  const { data: items = [] } = useQuery({
    queryKey: ["mypage", "continue-reading"],
    queryFn: async (): Promise<ReadingItem[]> => {
      const [progress, guidesRes] = await Promise.all([
        guideProgressApi.listMine(),
        guidesApi.list(),
      ]);
      const guideById = new Map((guidesRes.data ?? []).map((g) => [g.id, g]));
      return progress
        .filter((p) => (p.readPageIds?.length ?? 0) > 0 && guideById.has(p.guideId))
        .map((p) => {
          const g = guideById.get(p.guideId)!;
          return {
            slug: g.slug,
            title: g.title,
            coverEmoji: g.coverEmoji,
            readCount: p.readPageIds.length,
            updatedAt: p.updatedAt,
          };
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 3);
    },
    retry: false,
  });

  // 진행 중인 가이드가 없으면 위젯 숨김 (마이페이지 밀도 관리)
  if (items.length === 0) return null;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden />
            이어읽기
          </CardTitle>
          <Link
            href="/learning-guides"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            서재 <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`/learning-guides/${it.slug}`}
            className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
          >
            <span className="text-lg" aria-hidden>
              {it.coverEmoji ?? "📖"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {it.title}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {it.readCount}개 페이지 읽음
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
              이어읽기 <ArrowRight className="h-3 w-3" aria-hidden />
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
