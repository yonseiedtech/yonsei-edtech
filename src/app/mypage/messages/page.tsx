"use client";

/**
 * 쪽지함 (/mypage/messages) — 사이클 113, 사용자 요청
 * 받은/보낸 쪽지 + 새 쪽지(회원 검색) + 읽음·삭제.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquarePlus, Search, Trash2, Send, Inbox, SendHorizonal } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { messagesApi, profilesApi } from "@/lib/bkend";
import type { DirectMessage, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageContainer from "@/components/ui/page-container";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessagesInner({ user }: { user: User }) {
  const qc = useQueryClient();
  const [box, setBox] = useState<"received" | "sent">("received");
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recipient, setRecipient] = useState<User | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const { data: receivedRes, isLoading: loadingR } = useQuery({
    queryKey: ["messages-received", user.id],
    queryFn: () => messagesApi.listReceived(user.id),
    staleTime: 30_000,
  });
  const { data: sentRes, isLoading: loadingS } = useQuery({
    queryKey: ["messages-sent", user.id],
    queryFn: () => messagesApi.listSent(user.id),
    staleTime: 30_000,
  });
  const { data: membersRes } = useQuery({
    queryKey: ["members-for-message"],
    queryFn: () => profilesApi.list({ limit: 500 }),
    enabled: composeOpen,
    staleTime: 5 * 60_000,
  });

  const received = receivedRes?.data ?? [];
  const sent = sentRes?.data ?? [];
  const list = box === "received" ? received : sent;
  const loading = box === "received" ? loadingR : loadingS;

  const candidates = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    return (membersRes?.data ?? [])
      .filter((m) => m.id !== user.id && m.name?.includes(q))
      .slice(0, 8);
  }, [membersRes, search, user.id]);

  async function handleSend() {
    if (!recipient || !content.trim()) return;
    setSending(true);
    try {
      await messagesApi.create({
        fromId: user.id,
        fromName: user.name,
        toId: recipient.id,
        toName: recipient.name,
        content: content.trim(),
        read: false,
        createdAt: new Date().toISOString(),
      });
      toast.success(`${recipient.name}님에게 쪽지를 보냈습니다.`);
      setComposeOpen(false);
      setRecipient(null);
      setContent("");
      setSearch("");
      qc.invalidateQueries({ queryKey: ["messages-sent", user.id] });
    } catch {
      toast.error("쪽지 전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  async function handleRead(m: DirectMessage) {
    if (m.read) return;
    try {
      await messagesApi.markRead(m.id);
      qc.invalidateQueries({ queryKey: ["messages-received", user.id] });
      qc.invalidateQueries({ queryKey: ["profile-side-messages", user.id] });
    } catch {
      /* noop */
    }
  }

  async function handleDelete(id: string) {
    try {
      await messagesApi.delete(id);
      qc.invalidateQueries({ queryKey: ["messages-received", user.id] });
      qc.invalidateQueries({ queryKey: ["messages-sent", user.id] });
      qc.invalidateQueries({ queryKey: ["profile-side-messages", user.id] });
      toast.success("쪽지를 삭제했습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  return (
    <PageContainer width="narrow">
      <Link href="/mypage">
        <Button variant="ghost" size="sm" className="mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" />
          마이페이지
        </Button>
      </Link>

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">쪽지함</h1>
        <Button size="sm" onClick={() => setComposeOpen(true)}>
          <MessageSquarePlus className="mr-1 h-4 w-4" />
          새 쪽지
        </Button>
      </div>

      {/* 받은/보낸 탭 */}
      <div className="mb-4 flex gap-1 border-b">
        {([
          { key: "received" as const, label: "받은 쪽지", icon: Inbox, n: received.length },
          { key: "sent" as const, label: "보낸 쪽지", icon: SendHorizonal, n: sent.length },
        ]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setBox(t.key)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              box === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon size={15} />
            {t.label} ({t.n})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
          {box === "received" ? "받은 쪽지가 없습니다." : "보낸 쪽지가 없습니다."}
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((m) => (
            <li
              key={m.id}
              onClick={() => box === "received" && handleRead(m)}
              className={cn(
                "rounded-2xl border bg-card p-4",
                box === "received" && !m.read && "border-primary/40 bg-primary/5",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {box === "received" && !m.read && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                    )}
                    <p className="truncate text-sm font-semibold">
                      {box === "received" ? m.fromName : `${m.toName ?? "회원"} 님에게`}
                    </p>
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                      {fmt(m.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{m.content}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(m.id);
                  }}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-rose-500"
                  aria-label="쪽지 삭제"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 새 쪽지 다이얼로그 */}
      <Dialog open={composeOpen} onOpenChange={(o) => !sending && setComposeOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>새 쪽지</DialogTitle>
          </DialogHeader>

          {recipient ? (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <span>
                받는 사람: <span className="font-semibold">{recipient.name}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setRecipient(null)}>
                변경
              </Button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="받는 회원 이름 검색"
                  className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              {candidates.length > 0 && (
                <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setRecipient(c)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        {c.name}
                        {c.generation ? (
                          <span className="ml-1 text-xs text-muted-foreground">{c.generation}기</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="쪽지 내용을 입력하세요"
            rows={5}
            className="w-full resize-none rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={sending}>
              취소
            </Button>
            <Button onClick={handleSend} disabled={sending || !recipient || !content.trim()}>
              <Send className="mr-1 h-4 w-4" />
              {sending ? "보내는 중…" : "보내기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  return (
    <AuthGuard>
      {user ? <MessagesInner user={user} /> : null}
    </AuthGuard>
  );
}
