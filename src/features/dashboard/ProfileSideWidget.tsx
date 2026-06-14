"use client";

/**
 * ProfileSideWidget — 대시보드 프로필 요약 카드 하단 보조 위젯 (사이클 111, 사용자 요청)
 *
 * F-패턴 2단 그리드(좌 시간표 · 우 프로필)에서 우측 프로필 카드 아래 생기는
 * 공백을 '알림 · 할 일' 요약으로 채운다. 자주 확인하는 정보를 시선 가까이.
 */

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, ListTodo, ChevronRight } from "lucide-react";
import { notificationsApi, courseTodosApi } from "@/lib/bkend";

export default function ProfileSideWidget({ userId }: { userId: string }) {
  const { data: notifRes } = useQuery({
    queryKey: ["profile-side-notifs", userId],
    queryFn: () => notificationsApi.list(userId),
    staleTime: 60_000,
  });
  const { data: todoRes } = useQuery({
    queryKey: ["profile-side-todos", userId],
    queryFn: () => courseTodosApi.listByUser(userId),
    staleTime: 60_000,
  });

  const notifs = notifRes?.data ?? [];
  const unread = notifs.filter((n) => !n.read);
  const recentUnread = unread.slice(0, 3);
  const openTodos = (todoRes?.data ?? []).filter((t) => !t.completed);

  return (
    <section
      className="rounded-2xl border bg-card p-4 shadow-sm"
      aria-label="알림 · 할 일 요약"
    >
      {/* 알림 헤더 */}
      <Link
        href="/mypage/notifications"
        className="group flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-muted/50"
      >
        <span className="relative inline-flex">
          <Bell size={16} className="text-primary" />
          {unread.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
              {unread.length > 99 ? "99+" : unread.length}
            </span>
          )}
        </span>
        <span className="text-sm font-semibold">알림</span>
        <ChevronRight
          size={14}
          className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </Link>

      {/* 최근 안 읽은 알림 (최대 3) */}
      {recentUnread.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {recentUnread.map((n) => (
            <li key={n.id}>
              <Link
                href={n.link || "/mypage/notifications"}
                className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
              >
                <p className="truncate text-xs font-medium text-foreground">{n.title}</p>
                {n.message && (
                  <p className="truncate text-[11px] text-muted-foreground">{n.message}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 px-2 py-1.5 text-xs text-muted-foreground">
          새로운 알림이 없어요.
        </p>
      )}

      {/* 할 일 */}
      <div className="mt-2 border-t pt-2">
        <Link
          href="/dashboard#my-todos"
          className="group flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-muted/50"
        >
          <ListTodo size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold">할 일</span>
          {openTodos.length > 0 && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {openTodos.length}건 남음
            </span>
          )}
          <ChevronRight
            size={14}
            className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </Link>
        {openTodos.length === 0 && (
          <p className="mt-0.5 px-2 text-[11px] text-muted-foreground">
            남은 할 일이 없어요. 👍
          </p>
        )}
      </div>
    </section>
  );
}
