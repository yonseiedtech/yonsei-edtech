"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Lock, Monitor, Pencil, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";
import { commBoardsApi, commQuestionsApi, commLikesApi } from "@/lib/bkend";
import type { CommBoard, CommQuestion, CommSortMode, User } from "@/types";
import { COMM_SORT_LABELS } from "@/types";
import { sortQuestions, canManageBoard } from "./comm-helpers";
import QuestionComposer from "./QuestionComposer";
import QuestionItem from "./QuestionItem";
import CommBoardDialog from "./CommBoardDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  boardId: string;
  user: User | null;
}

export default function CommBoardDetail({ boardId, user }: Props) {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<CommSortMode>("recent");
  const [editOpen, setEditOpen] = useState(false);

  const { data: board, isLoading, isError } = useQuery({
    queryKey: ["comm-board", boardId],
    queryFn: () => commBoardsApi.get(boardId),
    retry: false,
  });

  useEffect(() => {
    if (board?.defaultSort) setSort(board.defaultSort);
  }, [board?.defaultSort]);

  const { data: questions = [] } = useQuery({
    queryKey: ["comm-questions", boardId],
    enabled: !!board,
    queryFn: async () => {
      const res = await commQuestionsApi.listByBoard(boardId);
      return res.data as CommQuestion[];
    },
  });

  const { data: likedSet = new Set<string>() } = useQuery({
    queryKey: ["comm-likes", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: () => commLikesApi.listMineSet(user!.id),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["comm-questions", boardId] });
    queryClient.invalidateQueries({ queryKey: ["comm-likes", user?.id ?? "anon"] });
  }

  async function handleToggleStatus() {
    if (!board) return;
    try {
      await commBoardsApi.update(board.id, { status: board.status === "open" ? "closed" : "open" });
      queryClient.invalidateQueries({ queryKey: ["comm-board", boardId] });
      toast.success(board.status === "open" ? "보드를 닫았습니다." : "보드를 다시 열었습니다.");
    } catch {
      toast.error("상태 변경 실패");
    }
  }

  async function handleDeleteBoard() {
    if (!board) return;
    if (!confirm("보드를 삭제하시겠습니까? 모든 질문/답변이 사라집니다.")) return;
    try {
      await commBoardsApi.delete(board.id);
      toast.success("보드가 삭제되었습니다.");
      window.history.back();
    } catch {
      toast.error("삭제 실패");
    }
  }

  if (isLoading) {
    return (<div className="mx-auto max-w-2xl space-y-3 p-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-20 w-full" /></div>);
  }
  if (isError || !board) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground" role="alert">
        보드를 찾을 수 없습니다.
      </div>
    );
  }

  const sorted = sortQuestions(questions, sort);
  const manage = canManageBoard(user, board);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <button onClick={() => window.history.back()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={13} /> 뒤로
      </button>

      <div className="space-y-2 rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              {board.status === "closed" && <Lock size={16} className="text-muted-foreground" />}
              {board.title}
            </h1>
            {board.description && <p className="mt-1 text-sm text-muted-foreground">{board.description}</p>}
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{board.ownerName}</span>
              {board.allowGuest && <Badge variant="outline" className="text-[9px]">게스트 허용</Badge>}
            </div>
          </div>
          <Link
            href={`/boards/${board.id}/present`}
            className="flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent"
          >
            <Monitor size={13} /> 발표 보기
          </Link>
        </div>

        {manage && (
          <div className="flex flex-wrap gap-1.5 border-t pt-2">
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" onClick={() => setEditOpen(true)}>
              <Pencil size={11} /> 수정
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" onClick={handleToggleStatus}>
              {board.status === "open" ? <Lock size={11} /> : <Unlock size={11} />}
              {board.status === "open" ? "닫기" : "열기"}
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px] text-destructive" onClick={handleDeleteBoard}>
              <Trash2 size={11} /> 삭제
            </Button>
          </div>
        )}
      </div>

      <QuestionComposer board={board} user={user} onCreated={refresh} />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">질문 {questions.length}개</span>
        <div className="flex gap-1">
          {(["recent", "popular"] as CommSortMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSort(m)}
              className={`rounded px-2 py-0.5 text-[11px] ${sort === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              {COMM_SORT_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded border border-dashed bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
          아직 질문이 없습니다. 첫 질문을 남겨보세요.
        </p>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((q) => (
            <QuestionItem key={q.id} board={board} question={q} user={user} likedSet={likedSet} onChanged={refresh} />
          ))}
        </div>
      )}

      {editOpen && user && (
        <CommBoardDialog
          contextType={board.contextType}
          contextId={board.contextId}
          activityProgressId={board.activityProgressId}
          week={board.week}
          ownerId={board.ownerId}
          ownerName={board.ownerName}
          board={board}
          onClose={() => setEditOpen(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["comm-board", boardId] })}
        />
      )}
    </div>
  );
}
