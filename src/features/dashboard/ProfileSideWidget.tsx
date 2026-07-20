"use client";

/**
 * ProfileSideWidget — 프로필 요약 카드 하단 보조 위젯 (사이클 113, 사용자 요청)
 *
 * 알림 / 할 일 / 쪽지 3탭 + 각 탭 펼침 리스트(스크롤). 자주 확인하는 개인 현황을
 * 프로필 옆 시선 가까이. 할 일은 마감 D-day로 '다가오는 일정' 역할을 겸한다.
 *
 * 2026-07-13: 항목별 읽음/완료 처리 + 일괄 처리(모두 읽음·모두 완료) 추가.
 * 반복 알림(수업 리마인더 등)이 쌓여도 한 번에 정리할 수 있게 한다.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Bell,
  ListTodo,
  MessageSquare,
  ChevronRight,
  Check,
  CheckCheck,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { notificationsApi, courseTodosApi, messagesApi } from "@/lib/bkend";
import type { AppNotification, CourseTodo, DirectMessage } from "@/types";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";

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
  return <EmptyState compact title={text} className="bg-transparent" />;
}

/** 행 우측 액션 아이콘 버튼 (읽음·완료·삭제) */
function RowAction({
  label,
  onClick,
  icon: Icon,
  tone = "muted",
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Check;
  tone?: "muted" | "primary";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "shrink-0 rounded-md p-1 transition-colors disabled:opacity-40",
        tone === "primary"
          ? "text-primary hover:bg-primary/10"
          : "text-muted-foreground/60 hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon size={13} />
    </button>
  );
}

function NotifList({
  items,
  onRead,
  onDelete,
  busy,
}: {
  items: AppNotification[];
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  if (items.length === 0) return <Empty text="알림이 없어요." />;
  return (
    <ul className="space-y-0.5">
      {items.slice(0, 20).map((n) => (
        <li key={n.id} className="group/row relative">
          <Link
            href={n.link || "/mypage/notifications"}
            onClick={() => {
              if (!n.read) onRead(n.id);
            }}
            className={cn(
              "block rounded-lg py-1.5 pl-2 pr-14 transition-colors hover:bg-muted/50",
              !n.read && "bg-primary/5",
            )}
          >
            <div className="flex items-center gap-1.5">
              {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />}
              <p className="truncate text-xs font-medium text-foreground">{n.title}</p>
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/70">
                {relTime(n.createdAt)}
              </span>
            </div>
            {n.message && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{n.message}</p>
            )}
          </Link>
          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
            {!n.read && (
              <RowAction label="읽음 처리" icon={Check} tone="primary" disabled={busy} onClick={() => onRead(n.id)} />
            )}
            <RowAction label="알림 삭제" icon={X} disabled={busy} onClick={() => onDelete(n.id)} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TodoList({
  items,
  onComplete,
  busy,
}: {
  items: CourseTodo[];
  onComplete: (id: string) => void;
  busy: boolean;
}) {
  if (items.length === 0) return <Empty text="남은 할 일이 없어요. 👍" />;
  const sorted = [...items].sort((a, b) =>
    (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"),
  );
  return (
    <ul className="space-y-0.5">
      {sorted.slice(0, 20).map((t) => {
        const dday = t.dueDate ? ddayLabel(t.dueDate) : null;
        return (
          <li key={t.id} className="group/row flex items-start gap-1.5 rounded-lg px-2 py-1.5 hover:bg-muted/50">
            <button
              type="button"
              aria-label="완료 처리"
              title="완료 처리"
              disabled={busy}
              onClick={() => onComplete(t.id)}
              className="mt-0.5 shrink-0 rounded-full border border-success/40 p-0.5 text-transparent transition-colors hover:bg-success hover:text-white disabled:opacity-40"
            >
              <Check size={9} />
            </button>
            <p className="flex-1 text-xs text-foreground">{t.content}</p>
            {dday && (
              <span
                className={cn(
                  "shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold",
                  dday.urgent
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {dday.label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MessageList({
  items,
  onRead,
  onDelete,
  busy,
}: {
  items: DirectMessage[];
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  if (items.length === 0) return <Empty text="받은 쪽지가 없어요." />;
  return (
    <ul className="space-y-0.5">
      {items.slice(0, 20).map((m) => (
        <li
          key={m.id}
          className={cn(
            "group/row relative rounded-lg py-1.5 pl-2 pr-14",
            !m.read && "bg-primary/5",
          )}
        >
          <div className="flex items-center gap-1.5">
            {!m.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />}
            <p className="truncate text-xs font-semibold text-foreground">{m.fromName}</p>
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/70">
              {relTime(m.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{m.content}</p>
          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
            {!m.read && (
              <RowAction label="읽음 처리" icon={Check} tone="primary" disabled={busy} onClick={() => onRead(m.id)} />
            )}
            <RowAction label="쪽지 삭제" icon={X} disabled={busy} onClick={() => onDelete(m.id)} />
          </div>
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
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

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

  const invalidate = (key: string) => qc.invalidateQueries({ queryKey: [key, userId] });

  /** 액션 래퍼 — busy 가드 + 에러 토스트 + 관련 쿼리 무효화 */
  async function run(fn: () => Promise<unknown>, key: string, failMsg: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await invalidate(key);
    } catch (err) {
      console.error("[ProfileSideWidget]", failMsg, err);
      toast.error(failMsg);
    } finally {
      setBusy(false);
    }
  }

  // ── 알림 ──
  const readNotif = (id: string) =>
    run(() => notificationsApi.markRead(id), "profile-side-notifs", "읽음 처리에 실패했어요.");
  const deleteNotif = (id: string) =>
    run(() => notificationsApi.delete(id), "profile-side-notifs", "알림 삭제에 실패했어요.");
  const readAllNotif = () =>
    run(async () => {
      await notificationsApi.markAllRead(userId);
      toast.success("알림을 모두 읽음 처리했어요.");
    }, "profile-side-notifs", "일괄 읽음 처리에 실패했어요.");

  // ── 쪽지 ──
  const readMsg = (id: string) =>
    run(() => messagesApi.markRead(id), "profile-side-messages", "읽음 처리에 실패했어요.");
  const deleteMsg = (id: string) =>
    run(() => messagesApi.delete(id), "profile-side-messages", "쪽지 삭제에 실패했어요.");
  const readAllMsg = () =>
    run(async () => {
      const unread = messages.filter((m) => !m.read);
      await Promise.all(unread.map((m) => messagesApi.markRead(m.id)));
      toast.success("쪽지를 모두 읽음 처리했어요.");
    }, "profile-side-messages", "일괄 읽음 처리에 실패했어요.");

  // ── 할 일 ──
  const completeTodo = (id: string) =>
    run(() => courseTodosApi.update(id, { completed: true }), "profile-side-todos", "완료 처리에 실패했어요.");
  const completeAllTodos = () => {
    if (openTodos.length === 0) return;
    if (!confirm(`남은 할 일 ${openTodos.length}건을 모두 완료 처리할까요?`)) return;
    run(async () => {
      await Promise.all(openTodos.map((t) => courseTodosApi.update(t.id, { completed: true })));
      toast.success("할 일을 모두 완료 처리했어요.");
    }, "profile-side-todos", "일괄 완료 처리에 실패했어요.");
  };

  const unreadNotifCount = notifs.filter((n) => !n.read).length;
  const unreadMsgCount = messages.filter((m) => !m.read).length;

  const TABS = [
    { key: "notif" as const, label: "알림", icon: Bell, count: unreadNotifCount },
    { key: "todo" as const, label: "할 일", icon: ListTodo, count: openTodos.length },
    { key: "message" as const, label: "쪽지", icon: MessageSquare, count: unreadMsgCount },
  ];

  // 탭별 일괄 처리 버튼 노출 여부·라벨
  const bulk =
    tab === "notif"
      ? unreadNotifCount > 0
        ? { label: "모두 읽음", onClick: readAllNotif }
        : null
      : tab === "message"
        ? unreadMsgCount > 0
          ? { label: "모두 읽음", onClick: readAllMsg }
          : null
        : openTodos.length > 0
          ? { label: "모두 완료", onClick: completeAllTodos }
          : null;

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
                <span className="ml-0.5 rounded-full bg-destructive px-1 text-[9px] font-bold leading-tight text-white">
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

      {bulk && (
        <div className="flex justify-end border-b bg-muted/20 px-2 py-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={bulk.onClick}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={13} />}
            {bulk.label}
          </button>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto p-2">
        {tab === "notif" && (
          <NotifList items={notifs} onRead={readNotif} onDelete={deleteNotif} busy={busy} />
        )}
        {tab === "todo" && <TodoList items={openTodos} onComplete={completeTodo} busy={busy} />}
        {tab === "message" && (
          <MessageList items={messages} onRead={readMsg} onDelete={deleteMsg} busy={busy} />
        )}
      </div>

      <div className="border-t px-3 py-2">
        {tab === "notif" && <FooterLink href="/mypage/notifications" label="알림센터 전체 보기" />}
        {tab === "todo" && <FooterLink href="/dashboard#my-todos" label="할 일 전체 보기" />}
        {tab === "message" && <FooterLink href="/mypage/messages" label="쪽지함 전체 보기" />}
      </div>
    </section>
  );
}
