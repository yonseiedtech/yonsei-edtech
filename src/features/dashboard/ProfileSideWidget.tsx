"use client";

/**
 * ProfileSideWidget — 프로필 요약 카드 하단 보조 위젯 (사이클 113, 사용자 요청)
 *
 * 알림 / 할 일 / 쪽지 3탭 + 각 탭 펼침 리스트(스크롤). 자주 확인하는 개인 현황을
 * 프로필 옆 시선 가까이. 할 일은 마감 D-day로 '다가오는 일정' 역할을 겸한다.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, ListTodo, MessageSquare, ChevronRight } from "lucide-react";
import { notificationsApi, courseTodosApi, messagesApi } from "@/lib/bkend";
import type { AppNotification, CourseTodo, DirectMessage } from "@/types";
import { cn } from "@/lib/utils";

type SideTab = "notif" | "todo" | "message";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return `${Math.floor(d / 7)}주 전`;
}

function ddayLabel(due: string): { label: string; urgent: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `D+${-diff}`, urgent: false };
  if (diff === 0) return { label: "D-day", urgent: true };
  return { label: `D-${diff}`, urgent: diff <= 3 };
}

function Empty({ text }: { text: string }) {
  return <p className="px-2 py-6 text-center text-xs text-muted-foreground">{text}</p>;
}

function NotifList({ items }: { items: AppNotification[] }) {
  if (items.length === 0) return <Empty text="알림이 없어요." />;
  return (
    <ul className="space-y-0.5">
      {items.slice(0, 20).map((n) => (
        <li key={n.id}>
          <Link
            href={n.link || "/mypage/notifications"}
            className={cn(
              "block rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50",
              !n.read && "bg-primary/5",
            )}
          >
            <div className="flex items-center gap-1.5">
              {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />}
              <p className="truncate text-xs font-medium text-foreground">{n.title}</p>
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/70">
                {relTime(n.createdAt)}
              </span>
            </div>
            {n.message && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{n.message}</p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TodoList({ items }: { items: CourseTodo[] }) {
  if (items.length === 0) return <Empty text="남은 할 일이 없어요. 👍" />;
  const sorted = [...items].sort((a, b) =>
    (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"),
  );
  return (
    <ul className="space-y-0.5">
      {sorted.slice(0, 20).map((t) => {
        const dday = t.dueDate ? ddayLabel(t.dueDate) : null;
        return (
          <li key={t.id} className="rounded-lg px-2 py-1.5 hover:bg-muted/50">
            <div className="flex items-start gap-1.5">
              <ListTodo size={12} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="flex-1 text-xs text-foreground">{t.content}</p>
              {dday && (
                <span
                  className={cn(
                    "shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold",
                    dday.urgent
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {dday.label}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MessageList({ items }: { items: DirectMessage[] }) {
  if (items.length === 0) return <Empty text="받은 쪽지가 없어요." />;
  return (
    <ul className="space-y-0.5">
      {items.slice(0, 20).map((m) => (
        <li
          key={m.id}
          className={cn(
            "rounded-lg px-2 py-1.5",
            !m.read && "bg-primary/5",
          )}
        >
          <div className="flex items-center gap-1.5">
            {!m.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />}
            <p className="truncate text-xs font-semibold text-foreground">{m.fromName}</p>
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/70">
              {relTime(m.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{m.content}</p>
        </li>
      ))}
    </ul>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      {label}
      <ChevronRight size={12} />
    </Link>
  );
}

export default function ProfileSideWidget({ userId }: { userId: string }) {
  const [tab, setTab] = useState<SideTab>("notif");

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
  const { data: msgRes } = useQuery({
    queryKey: ["profile-side-messages", userId],
    queryFn: () => messagesApi.listReceived(userId),
    staleTime: 60_000,
  });

  const notifs = notifRes?.data ?? [];
  const openTodos = (todoRes?.data ?? []).filter((t) => !t.completed);
  const messages = msgRes?.data ?? [];

  const TABS = [
    { key: "notif" as const, label: "알림", icon: Bell, count: notifs.filter((n) => !n.read).length },
    { key: "todo" as const, label: "할 일", icon: ListTodo, count: openTodos.length },
    { key: "message" as const, label: "쪽지", icon: MessageSquare, count: messages.filter((m) => !m.read).length },
  ];

  return (
    <section className="rounded-2xl border bg-card shadow-sm" aria-label="알림 · 할 일 · 쪽지">
      <div className="flex border-b" role="tablist" aria-label="개인 현황 탭">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon size={14} />
              {t.label}
              {t.count > 0 && (
                <span className="ml-0.5 rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-tight text-white">
                  {t.count > 99 ? "99+" : t.count}
                </span>
              )}
              {active && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <div className="max-h-72 overflow-y-auto p-2">
        {tab === "notif" && <NotifList items={notifs} />}
        {tab === "todo" && <TodoList items={openTodos} />}
        {tab === "message" && <MessageList items={messages} />}
      </div>

      <div className="border-t px-3 py-2">
        {tab === "notif" && <FooterLink href="/mypage/notifications" label="알림센터 전체 보기" />}
        {tab === "todo" && <FooterLink href="/dashboard#my-todos" label="할 일 전체 보기" />}
        {tab === "message" && <FooterLink href="/mypage/messages" label="쪽지함 전체 보기" />}
      </div>
    </section>
  );
}
