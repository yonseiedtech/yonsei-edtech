"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bell,
  ArrowLeft,
  CheckCheck,
  Check,
  Settings,
  Inbox,
  Search,
  X,
  Trash2,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminOrSysadmin } from "@/lib/permissions";
import AuthGuard from "@/features/auth/AuthGuard";
import { Skeleton } from "@/components/ui/skeleton";
import PageContainer from "@/components/ui/page-container";
import type { AppNotification, NotificationType } from "@/types";

// ── 타입별 아이콘 매핑 ──
const TYPE_ICONS: Record<NotificationType, string> = {
  member_approved: "🎉",
  member_rejected: "📋",
  comment: "💬",
  notice: "📢",
  certificate: "🏆",
  seminar_new: "📅",
  seminar_reminder: "⏰",
  seminar_review_request: "✍️",
  waitlist_promoted: "🎟️",
  newsletter: "📰",
  class_reminder: "🔔",
  activity_reminder: "📌",
  weekly_digest: "📊",
  flashcard_review_reminder: "🃏",
  admin_nudge: "📣",
};

const TYPE_LABELS: Record<NotificationType, string> = {
  member_approved: "가입 승인",
  member_rejected: "가입 반려",
  comment: "댓글",
  notice: "공지",
  certificate: "수료증",
  seminar_new: "세미나",
  seminar_reminder: "세미나 알림",
  seminar_review_request: "세미나 후기 요청",
  waitlist_promoted: "대기열",
  newsletter: "학회보",
  class_reminder: "수업 알림",
  activity_reminder: "활동 알림",
  weekly_digest: "주간 다이제스트",
  flashcard_review_reminder: "암기카드 복습",
  admin_nudge: "운영진 알림",
};

// 필터 탭 정의
type FilterKey = "all" | "unread" | NotificationType;
type SortKey = "newest" | "unread_first";

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

const PAGE_SIZE = 20;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 text-foreground rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function NotificationRow({
  n,
  onRead,
  searchQuery,
}: {
  n: AppNotification;
  onRead: (id: string) => void;
  searchQuery: string;
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
            {highlightText(n.title, searchQuery)}
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground/60">
            {timeAgo(n.createdAt)}
          </span>
        </div>
        {n.message && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {highlightText(n.message, searchQuery)}
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
  const isAdmin = isAdminOrSysadmin(user ?? null);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 무한 스크롤 sentinel ref
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  // 필터별 일괄 읽음 — 현재 필터+검색에 해당하는 미읽음만 처리
  const markFilteredRead = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => notificationsApi.markRead(id)));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // 오래된 알림 삭제 (30일 이전, 운영진만)
  const deleteOld = useMutation({
    mutationFn: async () => {
      const cutoff = Date.now() - THIRTY_DAYS_MS;
      const old = notifications.filter(
        (n) => new Date(n.createdAt).getTime() < cutoff,
      );
      await Promise.all(old.map((n) => notificationsApi.delete(n.id)));
      return old.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setShowDeleteConfirm(false);
      import("sonner").then(({ toast }) =>
        toast.success(`오래된 알림 ${count}건을 삭제했습니다.`),
      );
    },
  });

  // 필터 + 검색 적용
  const filtered = notifications.filter((n) => {
    const matchFilter =
      filter === "all" ? true : filter === "unread" ? !n.read : n.type === filter;
    if (!matchFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      (n.message ?? "").toLowerCase().includes(q)
    );
  });

  // 정렬
  const sorted =
    sort === "unread_first"
      ? [...filtered].sort((a, b) => {
          if (a.read === b.read) return 0;
          return a.read ? 1 : -1;
        })
      : filtered; // 기본: createdAt desc (서버 정렬 유지)

  const visible = sorted.slice(0, visibleCount);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredUnreadIds = filtered.filter((n) => !n.read).map((n) => n.id);
  const hasMore = visibleCount < sorted.length;

  const oldCount = notifications.filter(
    (n) => Date.now() - new Date(n.createdAt).getTime() > THIRTY_DAYS_MS,
  ).length;

  // 필터 변경 시 visibleCount 리셋
  const handleFilterChange = useCallback((key: FilterKey) => {
    setFilter(key);
    setVisibleCount(PAGE_SIZE);
  }, []);

  // 검색어 변경 시 visibleCount 리셋
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery]);

  // IntersectionObserver 무한 스크롤
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <PageContainer width="narrow">
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
          {filteredUnreadIds.length > 0 && (
            <button
              onClick={() => markFilteredRead.mutate(filteredUnreadIds)}
              disabled={markFilteredRead.isPending}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              title={filter === "all" ? "전체 일괄 읽음" : `${FILTER_TABS.find((t) => t.key === filter)?.label ?? "현재 필터"} 일괄 읽음`}
            >
              <CheckCheck size={13} />
              {filter === "all" ? "모두 읽음" : `${filteredUnreadIds.length}건 읽음`}
            </button>
          )}
          {/* 운영진 전용: 오래된 알림 삭제 */}
          {isAdmin && oldCount > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title={`30일 이전 알림 ${oldCount}건 삭제`}
              aria-label="오래된 알림 삭제"
            >
              <Trash2 size={15} />
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

      {/* 오래된 알림 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            30일 이전 알림 {oldCount}건을 삭제하시겠습니까?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">이 작업은 되돌릴 수 없습니다.</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => deleteOld.mutate()}
              disabled={deleteOld.isPending}
              className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleteOld.isPending ? "삭제 중…" : "삭제"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 검색 + 정렬 */}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="알림 내용 검색…"
            className="w-full rounded-lg border bg-card py-2 pl-8 pr-8 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            aria-label="알림 검색"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
              aria-label="검색어 지우기"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <button
          onClick={() => setSort((s) => (s === "newest" ? "unread_first" : "newest"))}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
            sort === "unread_first"
              ? "border-primary/40 bg-primary/5 text-primary"
              : "bg-card text-muted-foreground hover:bg-muted",
          )}
          title={sort === "newest" ? "미열기 우선 정렬" : "최신순 정렬"}
          aria-label={sort === "newest" ? "미열기 우선 정렬로 변경" : "최신순 정렬로 변경"}
          aria-pressed={sort === "unread_first"}
        >
          {sort === "unread_first" ? <SortAsc size={15} /> : <SortDesc size={15} />}
        </button>
      </div>

      {/* 필터 탭 */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
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

      {/* 검색 결과 안내 */}
      {searchQuery.trim() && (
        <p className="mb-2 text-xs text-muted-foreground">
          &ldquo;{searchQuery}&rdquo; 검색 결과 {filtered.length}건
        </p>
      )}

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
                {searchQuery.trim()
                  ? "검색 결과가 없습니다"
                  : filter === "unread"
                    ? "읽지 않은 알림이 없습니다"
                    : "새 알림이 없습니다"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? "다른 키워드로 검색해보세요."
                  : "중요한 소식이 생기면 여기서 알려드릴게요."}
              </p>
            </div>
            {!searchQuery.trim() && (
              <Link
                href="/mypage"
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Bell size={14} />
                알림 설정 변경하기
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {visible.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onRead={(id) => markRead.mutate(id)}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}

        {/* IntersectionObserver sentinel — 리스트 하단에 부착 */}
        {hasMore && (
          <div ref={sentinelRef} className="border-t px-4 py-4 text-center">
            <span className="text-xs text-muted-foreground">
              더 불러오는 중… ({sorted.length - visibleCount}건 남음)
            </span>
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
    </PageContainer>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}
