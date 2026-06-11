"use client";

/**
 * 보드 월(Wall) 뷰 — Padlet 스타일 실시간 담벼락 (2026-06-11)
 *
 * 스레드형 상세(/boards/[id])와 달리, 질문(노트)들이 파스텔 카드 마소너리
 * 그리드로 깔리는 수업용 담벼락. onSnapshot 실시간 구독이라 새 노트가
 * 새로고침 없이 바로 나타난다 (발표 중 프로젝터에 띄워두는 용도).
 *
 *  - 비로그인 참여: 보드 allowGuest=true 면 게스트도 노트 작성·답글 가능
 *  - 좋아요: 로그인 회원 전용 (rules), 게스트에겐 비활성 안내
 *  - 채택: 질문 작성자(회원)·보드 소유자·운영진
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  ArrowLeft,
  Link as LinkIcon,
  Lock,
  MessageCircle,
  Monitor,
  QrCode,
  ThumbsUp,
  CheckCircle2,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
import { commBoardsApi, commLikesApi } from "@/lib/bkend";
import { sortQuestions, canManageBoard } from "@/features/comm-board/comm-helpers";
import QuestionComposer from "@/features/comm-board/QuestionComposer";
import AnswerThread from "@/features/comm-board/AnswerThread";
import type { CommBoard, CommQuestion, CommSortMode } from "@/types";

/** 노트 파스텔 팔레트 — 질문 id 해시로 고정 배정 (Padlet 감성) */
const PALETTE = [
  "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/20",
  "border-sky-200 bg-sky-50 dark:border-sky-800/60 dark:bg-sky-950/20",
  "border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-950/20",
  "border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/20",
  "border-violet-200 bg-violet-50 dark:border-violet-800/60 dark:bg-violet-950/20",
  "border-orange-200 bg-orange-50 dark:border-orange-800/60 dark:bg-orange-950/20",
];

function paletteOf(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % 997;
  return PALETTE[h % PALETTE.length];
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function authorLabel(q: CommQuestion): string {
  if (q.anonymous) return "익명";
  return q.authorName ?? q.guestName ?? "게스트";
}

export default function BoardWallPage() {
  const params = useParams();
  const boardId = String(params.boardId);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // 보드 메타
  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ["comm-board", boardId],
    queryFn: async () => (await commBoardsApi.get(boardId)) as CommBoard,
  });

  // 질문 실시간 구독 — 새 노트가 새로고침 없이 등장
  const [questions, setQuestions] = useState<CommQuestion[]>([]);
  const [qLoading, setQLoading] = useState(true);
  useEffect(() => {
    const qy = query(collection(db, "comm_questions"), where("boardId", "==", boardId));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        setQuestions(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommQuestion, "id">) })),
        );
        setQLoading(false);
      },
      (err) => {
        console.error("[board-wall]", err);
        setQLoading(false);
      },
    );
    return () => unsub();
  }, [boardId]);

  // 내 좋아요 집합 (로그인 회원)
  const { data: likedSet = new Set<string>() } = useQuery({
    queryKey: ["comm-likes-mine", user?.id ?? "guest"],
    enabled: !!user,
    queryFn: () => commLikesApi.listMineSet(user!.id),
  });

  const [sort, setSort] = useState<CommSortMode>("recent");
  useEffect(() => {
    if (board?.defaultSort) setSort(board.defaultSort);
  }, [board?.defaultSort]);

  const sorted = useMemo(() => sortQuestions(questions, sort), [questions, sort]);

  // 새 노트 등장 애니메이션 — 직전 스냅샷에 없던 id 추적
  const prevIdsRef = useRef<Set<string>>(new Set());
  const newIds = useMemo(() => {
    const prev = prevIdsRef.current;
    const fresh = new Set(questions.filter((q) => !prev.has(q.id)).map((q) => q.id));
    prevIdsRef.current = new Set(questions.map((q) => q.id));
    // 첫 로드 전체를 '새 노트'로 취급하지 않음
    return prev.size === 0 ? new Set<string>() : fresh;
  }, [questions]);

  const [openReplies, setOpenReplies] = useState<Set<string>>(new Set());
  function toggleReplies(id: string) {
    setOpenReplies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleLike(q: CommQuestion) {
    if (!user) {
      toast.error("좋아요는 로그인 회원만 가능합니다. 질문·답글은 그대로 참여하실 수 있어요!");
      return;
    }
    try {
      await commLikesApi.toggle(user.id, "question", q.id);
      await queryClient.invalidateQueries({ queryKey: ["comm-likes-mine", user.id] });
      // likeCount 자체는 onSnapshot 으로 실시간 반영
    } catch {
      toast.error("좋아요 처리에 실패했습니다.");
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/boards/${boardId}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => toast.success("공유 링크가 복사되었습니다."))
      .catch(() => toast.error("복사에 실패했습니다."));
  }

  if (boardLoading || !board) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/[0.04] to-background">
      <div className="mx-auto max-w-5xl p-4">
        {/* ── 헤더 (sticky — 수업 중 화면 고정) ── */}
        <div className="sticky top-0 z-20 -mx-4 border-b bg-background/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <Link
              href={`/boards/${boardId}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={13} />
              <List size={13} />
              <span className="hidden sm:inline">스레드 보기</span>
            </Link>
            <h1 className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-bold sm:text-base">
              {board.status === "closed" && <Lock size={14} className="shrink-0 text-muted-foreground" />}
              <span className="truncate">{board.title}</span>
              {board.allowGuest && (
                <Badge variant="outline" className="shrink-0 text-[9px]">게스트 참여 가능</Badge>
              )}
            </h1>
            <div className="flex shrink-0 items-center gap-1.5">
              {/* 정렬 토글 */}
              <div className="flex rounded-lg border bg-muted/40 p-0.5 text-[11px]">
                {(["recent", "popular"] as CommSortMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSort(m)}
                    className={cn(
                      "rounded-md px-2 py-1 font-medium transition-colors",
                      sort === m ? "bg-background shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    {m === "recent" ? "최신" : "인기"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] hover:bg-accent"
              >
                <LinkIcon size={12} />
                <span className="hidden sm:inline">링크 복사</span>
              </button>
              <Link
                href={`/boards/${boardId}/present`}
                className="flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] hover:bg-accent"
              >
                <QrCode size={12} />
                <span className="hidden sm:inline">발표 QR</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── 안내 + 작성 ── */}
        {board.description && (
          <p className="mt-4 text-sm text-muted-foreground">{board.description}</p>
        )}
        {!user && board.allowGuest && board.status === "open" && (
          <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            로그인 없이 참여 중입니다 — 이름은 선택 입력이며, 익명으로도 남길 수 있어요.
          </p>
        )}
        <div className="mt-3">
          <QuestionComposer board={board} user={user} onCreated={() => { /* onSnapshot 실시간 반영 */ }} />
        </div>

        {/* ── 담벼락 ── */}
        <div className="mt-5 pb-16">
          {qLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed py-16 text-center">
              <MessageCircle size={28} className="mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                아직 노트가 없습니다 — 첫 질문을 남겨보세요!
              </p>
            </div>
          ) : (
            <div className="columns-1 gap-3 space-y-3 sm:columns-2 lg:columns-3">
              {sorted.map((q) => {
                const liked = likedSet.has(`question__${q.id}`);
                const resolved = q.resolved && !!q.resolvedAnswerId;
                const repliesOpen = openReplies.has(q.id);
                return (
                  <div
                    key={q.id}
                    className={cn(
                      "break-inside-avoid rounded-2xl border-2 p-3.5 shadow-sm transition-shadow hover:shadow-md",
                      paletteOf(q.id),
                      newIds.has(q.id) && "animate-in zoom-in-95 fade-in duration-500",
                    )}
                  >
                    {/* 작성자 · 시간 */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-foreground/70">
                        {authorLabel(q)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(q.createdAt)}</span>
                    </div>

                    {/* 본문 */}
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{q.body}</p>

                    {resolved && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                        <CheckCircle2 size={10} /> 해결됨
                      </span>
                    )}

                    {/* 액션 */}
                    <div className="mt-2.5 flex items-center gap-2 border-t border-foreground/5 pt-2">
                      <button
                        type="button"
                        onClick={() => handleLike(q)}
                        title={user ? "좋아요" : "좋아요는 로그인 회원 전용"}
                        className={cn(
                          "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors",
                          liked ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
                          !user && "opacity-60",
                        )}
                      >
                        <ThumbsUp size={12} />
                        {q.likeCount}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleReplies(q.id)}
                        className={cn(
                          "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors",
                          repliesOpen ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <MessageCircle size={12} />
                        답글 {q.answerCount}
                      </button>
                    </div>

                    {/* 답글 스레드 (기존 AnswerThread 재사용 — 게스트 답글 지원) */}
                    {repliesOpen && (
                      <div className="mt-1">
                        <AnswerThread
                          board={board}
                          question={q}
                          user={user}
                          likedSet={likedSet}
                          canAccept={
                            !!user && (q.authorId === user.id || canManageBoard(user, board))
                          }
                          onChanged={() => { /* onSnapshot 실시간 반영 */ }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 하단 라이브 표시 ── */}
        <div className="fixed bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-md backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          실시간 · 노트 {questions.length}
          <Monitor size={11} className="ml-1" />
        </div>
      </div>
    </div>
  );
}
