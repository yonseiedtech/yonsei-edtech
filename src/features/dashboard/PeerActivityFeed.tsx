"use client";

/**
 * 동료의 최근 활동 피드 — Sprint 55 (미니 소셜)
 *
 * 데이터 소스 (최근 7일):
 *  - posts (category in [free, interview, promotion])
 *  - course_reviews
 *  - seminar_reviews
 *
 * 필터: author 의 notificationPrefs.feedOptIn !== false
 * 본인 활동은 제외 (자기 활동은 MyPage 타임라인에서 봄).
 * Top 10 으로 잘라 표시. 클릭 시 해당 콘텐츠로 이동.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, FileText, GraduationCap, Users } from "lucide-react";
import {
  postsApi,
  courseReviewsApi,
  profilesApi,
} from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { Post, CourseReview, User } from "@/types";
import WidgetCard from "@/components/ui/widget-card";
import EmptyState from "@/components/ui/empty-state";

type FeedKind = "post" | "course_review";

interface FeedItem {
  id: string;
  kind: FeedKind;
  authorId: string;
  authorName: string;
  title: string;
  href: string;
  createdAt: string;
}

const KIND_META: Record<
  FeedKind,
  { label: string; iconClass: string; Icon: typeof FileText; verb: string }
> = {
  post: {
    label: "글",
    iconClass: "bg-blue-100 text-blue-700",
    Icon: FileText,
    verb: "글 작성",
  },
  course_review: {
    label: "강의 후기",
    iconClass: "bg-emerald-100 text-emerald-700",
    Icon: GraduationCap,
    verb: "강의 후기 작성",
  },
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function timeAgo(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = now.getTime() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

const VISIBLE_POST_CATEGORIES = new Set(["free", "interview", "promotion", "press"]);

export default function PeerActivityFeed() {
  const { user } = useAuthStore();
  const myId = user?.id;

  const { data: postsRes } = useQuery({
    queryKey: ["peer-feed", "posts"],
    queryFn: () => postsApi.list({ limit: 30 }),
    staleTime: 5 * 60_000,
    enabled: !!user,
  });
  const { data: courseRevRes } = useQuery({
    queryKey: ["peer-feed", "course-reviews"],
    queryFn: () => courseReviewsApi.list({ limit: 30 }),
    staleTime: 5 * 60_000,
    enabled: !!user,
  });

  // 후보 raw 이벤트 (작성자별 필터링은 author 로드 후)
  const rawItems: FeedItem[] = useMemo(() => {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    const out: FeedItem[] = [];
    const posts = (postsRes?.data ?? []) as Post[];
    for (const p of posts) {
      if (!p.createdAt || new Date(p.createdAt).getTime() < cutoff) continue;
      if (p.category && !VISIBLE_POST_CATEGORIES.has(p.category)) continue;
      if (myId && p.authorId === myId) continue;
      out.push({
        id: `post:${p.id}`,
        kind: "post",
        authorId: p.authorId,
        authorName: p.authorName ?? "",
        title: p.title,
        href: `/board/${p.id}`,
        createdAt: p.createdAt,
      });
    }
    const courseReviews = (courseRevRes?.data ?? []) as CourseReview[];
    for (const r of courseReviews) {
      if (!r.createdAt || new Date(r.createdAt).getTime() < cutoff) continue;
      if (r.anonymous) continue;
      if (myId && r.authorId === myId) continue;
      out.push({
        id: `cr:${r.id}`,
        kind: "course_review",
        authorId: r.authorId,
        authorName: r.authorName ?? "",
        title: r.courseName,
        href: `/courses/${r.courseOfferingId}`,
        createdAt: r.createdAt,
      });
    }
    out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return out.slice(0, 30); // 후속 author 필터링 여유분
  }, [postsRes, courseRevRes, myId]);

  // 작성자별 feedOptIn 조회 (배치)
  const authorIds = useMemo(() => {
    const set = new Set<string>();
    for (const i of rawItems) if (i.authorId) set.add(i.authorId);
    return Array.from(set);
  }, [rawItems]);

  const { data: authorMap = {} } = useQuery({
    queryKey: ["peer-feed", "authors", authorIds.sort().join(",")],
    queryFn: async () => {
      const map: Record<string, { feedOptIn: boolean; name?: string }> = {};
      await Promise.all(
        authorIds.map(async (uid) => {
          try {
            const u = (await profilesApi.get(uid)) as unknown as User;
            const optIn = (u as User & {
              notificationPrefs?: { feedOptIn?: boolean };
            }).notificationPrefs?.feedOptIn;
            map[uid] = { feedOptIn: optIn !== false, name: u?.name };
          } catch {
            map[uid] = { feedOptIn: true };
          }
        }),
      );
      return map;
    },
    enabled: authorIds.length > 0,
    staleTime: 10 * 60_000,
  });

  const items: FeedItem[] = useMemo(() => {
    const filtered: FeedItem[] = [];
    for (const i of rawItems) {
      const a = authorMap[i.authorId];
      if (a && a.feedOptIn === false) continue;
      filtered.push({
        ...i,
        authorName: a?.name ?? i.authorName ?? "회원",
      });
      if (filtered.length >= 10) break;
    }
    return filtered;
  }, [rawItems, authorMap]);

  if (!user) return null;

  if (items.length === 0) {
    return (
      <WidgetCard
        title="동료의 최근 활동"
        icon={MessageSquare}
        actions={<span className="text-xs text-muted-foreground">최근 7일</span>}
      >
        <EmptyState
          icon={Users}
          title="최근 7일간 동료 활동이 없어요"
          description="내가 먼저 글을 쓰거나 강의 후기를 남기면 동료에게도 보입니다."
          compact
          className="mt-4 bg-transparent"
          actions={[
            { label: "자유게시판 가기", href: "/board?category=free", variant: "outline" },
          ]}
        />
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="동료의 최근 활동"
      icon={MessageSquare}
      actions={<span className="text-xs text-muted-foreground">최근 7일</span>}
    >
      <ul className="mt-4 space-y-1">
        {items.map((it) => {
          const meta = KIND_META[it.kind];
          const Icon = meta.Icon;
          return (
            <li key={it.id}>
              <Link
                href={it.href}
                className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconClass}`}
                  aria-hidden="true"
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-semibold">{it.authorName}</span>
                    <span className="text-muted-foreground"> 님이 {meta.verb} </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{it.title}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {timeAgo(it.createdAt)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">
        내 활동을 노출하지 않으려면 마이페이지 → 알림 설정에서 "활동 피드 노출"을 끄세요.
      </p>
    </WidgetCard>
  );
}
