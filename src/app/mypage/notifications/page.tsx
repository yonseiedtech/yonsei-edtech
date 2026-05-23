"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  ArrowLeft,
  CheckCheck,
  Check,
  Settings,
  Inbox,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import AuthGuard from "@/features/auth/AuthGuard";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppNotification, NotificationType } from "@/types";

// metadata는 서버 컴포넌트에서만 export 가능하므로 별도 export 제거,
// layout.tsx 에서 title 을 설정하거나 head tag 로 처리한다.

// ── 타입별 아이콘 매핑 ──
const TYPE_ICONS: Record<NotificationType, string> = {
  member_approved: "🎉",
  member_rejected: "📋",
  comment: "💬",
  notice: "📢",
  certificate: "🏆",
  seminar_new: "📅",
  seminar_reminder: "⏰",
  waitlist_promoted: "🎟️",
  newsletter: "📰",
};

const TYPE_LABELS: Record<NotificationType, string> = {
  member_approved: "가입 승인",
  member_rejected: "가입 반려",
  comment: "댓글",
  notice: "공지",
  certificate: "수료증",
  seminar_new: "세미나",
  seminar_reminder: "세미나 알림",
  waitlist_promoted: "대기열",
  newsletter: "학회보",
};

// 필터 탭 정의
type FilterKey = "all" | "unread" | NotificationType;

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "unread", label: "미열기" },
  { key: "seminar_new", label: "세미나" },
  { key: "seminar_reminder", label: "세미나 알림" },
  { key: "notice", label: "공지" },
  { key: "newsletter", label: "학회보" },
  { key: "certificate", label: "수료증" },
  { key: "comment", label: "댓글" },
];

const PAGE_SIZE = 50;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function NotificationRow({
  n,
  onRead,
}: {
  n: AppNotification;
  onRead: (id: string) => void;
}) {
  const icon = TYPE_ICONS[n.type] ?? "🔔";

  const inner = (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50",
        !n.read && "bg-primary/5",
      )}
      onClick={() => { if (!n.read) onRead(n.id); }}
    >
      {/* 미열기 좌측 활성 바 */}
      {!n.read && (
        <span className="absolute inset-y-0 left-0 w-[3px] rounded-r bg-primary" />
      )}

      {/* 아이콘 */}
      <span className="mt-0.5 shrink-0 text-xl leading-none">{icon}</span>

      {/* 본문 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              !n.read ? "font-semibold text-foreground" : "text-foreground/80",
            )}
          >
            {n.title}
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground/60">
            {timeAgo(n.createdAt)}
          </span>
        </div>
        {n.message && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {n.message}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {TYPE_LABELS[n.type] ?? n.type}
          </span>
          {!n.read && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          )}
        </div>
      </div>

      {/* 개별 읽음 버튼 */}
      {!n.read && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRead(n.id);
          }}
          className="mt-0.5 shrink-0 self-start rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
          title="읽음 처리"
          aria-label="읽음 처리"
        >
          <Check size={13} />
        </button>
      )}
    </div>
  );

  if (n.link) {
    return (
      <Link href={n.link} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

function NotificationsContent() {
  const { user } = useAuthStore();
  const userId = user?.id ?? "";
  const qc = useQueryClient();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => notificationsApi.list(userId),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const notifications = (data?.data ?? []) as unknown as AppNotification[];

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // 필터 적용
  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  const visible = filtered.slice(0, visibleCount);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/mypage"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
            aria-label="마이페이지로 돌아가기"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">알림센터</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                읽지 않은 알림 {unreadCount}개
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <CheckCheck size={13} />
              모두 읽음
            </button>
          )}
          <Link
            href="/mypage"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
            title="알림 설정"
            aria-label="알림 설정"
          >
            <Settings size={15} />
          </Link>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setVisibleCount(PAGE_SIZE); }}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === tab.key
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {tab.label}
            {tab.key === "unread" && unreadCount > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 목록 카드 */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-3.5">
                <Skeleton className="mt-0.5 h-6 w-6 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          // 빈 상태
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Inbox size={28} />
            </div>
            <div>
              <p className="font-semibold">
                {filter === "unread" ? "읽지 않은 알림이 없습니다" : "새 알림이 없습니다"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                중요한 소식이 생기면 여기서 알려드릴게요.
              </p>
            </div>
            <Link
              href="/mypage"
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Bell size={14} />
              알림 설정 변경하기
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {visible.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onRead={(id) => markRead.mutate(id)}
              />
            ))}
          </div>
        )}

        {/* 더 보기 */}
        {hasMore && (
          <div className="border-t px-4 py-3">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full rounded-lg py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              더 보기 ({filtered.length - visibleCount}건 남음)
            </button>
          </div>
        )}
      </div>

      {/* 알림 설정 안내 */}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        알림 수신 설정은{" "}
        <Link href="/mypage" className="font-medium text-primary hover:underline">
          마이페이지 → 알림 설정
        </Link>
        에서 변경할 수 있습니다.
      </p>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}
