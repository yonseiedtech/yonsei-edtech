"use client";

/**
 * Spaced Repetition 위젯 (Sprint 67-AR — 교육공학 이론 보강)
 *
 * 이론 근거: Ebbinghaus 망각곡선 (1885) + Cepeda et al. (2008) 메타분석
 * - 학습 후 1일·7일·14일·30일 간격으로 다시 보면 장기 기억 강화
 * - 본 위젯은 사용자가 N일 전 본인이 작성·참여한 콘텐츠를 다시 안내
 *
 * MVP 데이터 소스: 본인이 작성한 게시글 (postsApi). 향후 분석 노트·세미나 후기 확장 가능.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, RotateCcw, Sparkles } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { postsApi } from "@/lib/bkend";
import type { Post } from "@/types";

interface IntervalGroup {
  /** 표시 라벨 (예: "1주 전 작성") */
  label: string;
  /** 망각곡선 간격 (일) */
  daysAgo: number;
  /** 해당 간격에 해당하는 게시글 (각 그룹 1개씩만 노출) */
  post: Post | null;
}

const REVIEW_INTERVALS: { days: number; label: string }[] = [
  { days: 1, label: "어제 작성" },
  { days: 7, label: "1주 전 작성" },
  { days: 14, label: "2주 전 작성" },
  { days: 30, label: "한 달 전 작성" },
];

/** 두 날짜 사이의 일 수 (음수 가능) — UTC 기준 */
function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

function parseCreatedAt(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (typeof value === "object" && value && "seconds" in (value as Record<string, unknown>)) {
    const seconds = (value as { seconds?: number }).seconds;
    if (typeof seconds === "number") return new Date(seconds * 1000);
  }
  return null;
}

export default function SpacedRepetitionWidget() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    postsApi
      .list({ limit: 50, sort: "createdAt:desc" })
      .then((res) => {
        const all = (res.data ?? []) as Post[];
        // 본인 작성 게시글만 (composite-index 회피 — 클라이언트 필터)
        const mine = all.filter((p) => p.authorId === user.id);
        setPosts(mine);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const groups = useMemo<IntervalGroup[]>(() => {
    if (posts.length === 0) {
      return REVIEW_INTERVALS.map((iv) => ({
        label: iv.label,
        daysAgo: iv.days,
        post: null,
      }));
    }
    const now = new Date();
    return REVIEW_INTERVALS.map((iv) => {
      // 각 간격 ±1일 이내 작성된 게시글 1건 매칭
      const match = posts.find((p) => {
        const created = parseCreatedAt(p.createdAt);
        if (!created) return false;
        const diff = daysBetween(now, created);
        return diff >= iv.days - 1 && diff <= iv.days + 1;
      });
      return { label: iv.label, daysAgo: iv.days, post: match ?? null };
    });
  }, [posts]);

  const hasAnyMatch = groups.some((g) => g.post != null);

  if (!user) return null;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden
          >
            <RotateCcw size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold">다시 보기 추천</h3>
            <p className="text-[11px] text-muted-foreground" title="Ebbinghaus 망각곡선 — 시간 간격을 두고 다시 보면 장기 기억 강화">
              Spaced Repetition · 망각곡선 기반
            </p>
          </div>
        </div>
        <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary sm:inline-flex">
          <Brain size={10} aria-hidden />
          학습이론
        </span>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
          <Sparkles size={14} className="mr-2 animate-pulse" />
          본인 게시글 분석 중…
        </div>
      ) : !hasAnyMatch ? (
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-4 text-center">
          <RotateCcw size={18} className="mx-auto mb-1.5 text-muted-foreground/60" aria-hidden />
          <p className="text-xs font-medium">
            다시 볼 본인 콘텐츠가 아직 충분하지 않습니다.
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            본인이 게시글·후기·분석 노트를 작성하면 시간 간격에 따라 본 위젯에 다시 등장합니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {groups
            .filter((g) => g.post != null)
            .map((g) => (
              <li key={g.daysAgo}>
                <Link
                  href={`/board/${g.post!.id}`}
                  className="group flex items-start gap-2.5 rounded-xl border bg-background p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {g.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                      {g.post!.title}
                    </p>
                  </div>
                  <ArrowRight
                    size={12}
                    className="mt-1 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
        </ul>
      )}

      <p className="mt-3 border-t pt-2.5 text-[10px] leading-relaxed text-muted-foreground/80">
        Ebbinghaus(1885) 망각곡선과 Cepeda et al.(2008) 메타분석에 따르면, 학습 후 1·7·14·30일 간격으로 다시 보면 장기 기억으로 전이됩니다. 본인 작성 게시글을 활용한 자가 학습 보조 도구입니다.
      </p>
    </div>
  );
}
