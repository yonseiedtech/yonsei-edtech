"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Send, ThumbsUp, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { commAnswersApi, commLikesApi, commQuestionsApi } from "@/lib/bkend";
import type { CommAnswer, CommBoard, CommQuestion, User } from "@/types";
import { canDeletePost } from "./comm-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  board: CommBoard;
  question: CommQuestion;
  user: User | null;
  likedSet: Set<string>;
  /** 질문 작성자(로그인)인지 — 채택 권한 판단 */
  canAccept: boolean;
  onChanged: () => void;
}

export default function AnswerThread({
  board,
  question,
  user,
  likedSet,
  canAccept,
  onChanged,
}: Props) {
  const queryClient = useQueryClient();
  const { data: answers = [], isLoading } = useQuery({
    queryKey: ["comm-answers", question.id],
    queryFn: async () => {
      const res = await commAnswersApi.listByQuestion(question.id);
      return (res.data as CommAnswer[]).sort((a, b) =>
        (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
      );
    },
  });

  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [saving, setSaving] = useState(false);
  const isGuest = !user;
  const disabled = board.status === "closed" || (isGuest && !board.allowGuest);

  async function handleAdd() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await commAnswersApi.create({
        questionId: question.id,
        boardId: board.id,
        authorId: user?.id,
        authorName: user?.name,
        guestName: isGuest && guestName.trim() ? guestName.trim() : undefined,
        anonymous: false,
        body: body.trim(),
      });
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["comm-answers", question.id] });
      onChanged();
      toast.success("답변이 등록되었습니다.");
    } catch (e) {
      console.error("[comm-answer/create]", e);
      toast.error("답변 등록 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleLike(a: CommAnswer) {
    if (!user) {
      toast.error("좋아요는 로그인 후 가능합니다.");
      return;
    }
    try {
      await commLikesApi.toggle(user.id, "answer", a.id);
      await queryClient.invalidateQueries({ queryKey: ["comm-answers", question.id] });
      onChanged();
    } catch {
      toast.error("좋아요 처리 실패");
    }
  }

  async function handleAccept(a: CommAnswer) {
    try {
      const newAccepted = question.resolvedAnswerId === a.id ? null : a.id;
      await commQuestionsApi.setResolved(question.id, newAccepted !== null, newAccepted);
      onChanged();
      toast.success(newAccepted ? "답변을 채택했습니다." : "채택을 해제했습니다.");
    } catch {
      toast.error("채택 처리 실패");
    }
  }

  async function handleDelete(a: CommAnswer) {
    if (!confirm("이 답변을 삭제하시겠습니까?")) return;
    try {
      await commAnswersApi.delete({ id: a.id, questionId: a.questionId });
      await queryClient.invalidateQueries({ queryKey: ["comm-answers", question.id] });
      onChanged();
      toast.success("삭제되었습니다.");
    } catch {
      toast.error("삭제 실패");
    }
  }

  return (
    <div className="mt-2 space-y-2 border-l-2 border-muted pl-3">
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        answers.map((a) => {
          const accepted = question.resolvedAnswerId === a.id;
          const liked = likedSet.has(`answer__${a.id}`);
          const name = a.anonymous ? "익명" : a.authorName ?? a.guestName ?? "게스트";
          return (
            <div
              key={a.id}
              className={cn(
                "rounded border px-2.5 py-1.5 text-xs",
                accepted ? "border-emerald-300 bg-emerald-50" : "bg-card",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {name}
                  {accepted && (
                    <Badge variant="outline" className="border-emerald-400 text-[9px] text-emerald-700">
                      채택됨
                    </Badge>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLike(a)}
                    className={cn(
                      "flex items-center gap-0.5 rounded px-1 text-[10px]",
                      liked ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ThumbsUp size={11} /> {a.likeCount}
                  </button>
                  {canAccept && (
                    <button
                      type="button"
                      onClick={() => handleAccept(a)}
                      title={accepted ? "채택 해제" : "채택"}
                      className={cn(
                        "rounded p-0.5",
                        accepted ? "text-emerald-600" : "text-muted-foreground hover:text-emerald-600",
                      )}
                    >
                      <Check size={12} />
                    </button>
                  )}
                  {canDeletePost(user, a, board) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(a)}
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{a.body}</p>
            </div>
          );
        })
      )}

      {!disabled && (
        <div className="space-y-1.5">
          {isGuest && (
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="이름 (선택)"
              className="w-full rounded-md border bg-background px-2 py-1 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          )}
          <div className="flex gap-1.5">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={1}
              placeholder="답변 작성…"
              className="flex-1 rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <Button size="sm" className="h-auto px-2" onClick={handleAdd} disabled={saving || !body.trim()}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
