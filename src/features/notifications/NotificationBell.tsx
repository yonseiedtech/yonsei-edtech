"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications, useMarkRead, useMarkAllRead } from "./useNotifications";
import type { AppNotification } from "@/types";

const TYPE_ICONS: Record<AppNotification["type"], string> = {
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const { notifications, unreadCount, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleClick(n: AppNotification) {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
  }

  if (isLoading) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted",
          open && "bg-muted text-primary",
        )}
        aria-label={`알림 ${unreadCount}개`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">알림</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
              >
                <CheckCheck size={12} />
                모두 읽음
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">알림이 없습니다.</p>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const content = (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-2.5 px-4 py-2.5 transition-colors hover:bg-muted/50",
                      !n.read && "bg-primary/5",
                    )}
                    onClick={() => handleClick(n)}
                  >
                    <span className="mt-0.5 text-base">{TYPE_ICONS[n.type] ?? "🔔"}</span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs leading-snug", !n.read ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{n.message}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground/60">{timeAgo(n.createdAt)}</span>
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </div>
                    </div>
                    {!n.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                        className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/40 hover:text-primary"
                        title="읽음 처리"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
