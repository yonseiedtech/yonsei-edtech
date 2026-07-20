"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronUp, MessageSquare, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { commLikesApi, commQuestionsApi } from "@/lib/bkend";
import type { CommBoard, CommQuestion, User } from "@/types";
import { canDeletePost } from "./comm-helpers";
import { isStaffOrAbove } from "@/lib/permissions";
import AnswerThread from "./AnswerThread";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  board: CommBoard;
  question: CommQuestion;
  user: User | null;
  likedSet: Set<string>;
  onChanged: () => void;
}

export default function QuestionItem({ board, question, user, likedSet, onChanged }: Props) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const liked = likedSet.has(`question__${question.id}`);
  const name = question.anonymous ? "익명" : question.authorName ?? question.guestName ?? "게스트";
  // 채택 권한: 질문 작성자(로그인 본인) 또는 보드 소유자 또는 운영진
  const canAccept =
    !!user && (question.authorId === user.id || user.id === board.ownerId || isStaffOrAbove(user));

  async function handleLike() {
    if (!user) {
      toast.error("좋아요는 로그인 후 가능합니다.");
      return;
    }
    try {
      await commLikesApi.toggle(user.id, "question", question.id);
      onChanged();
    } catch {
      toast.error("좋아요 처리 실패");
    }
  }

  async function handleDelete() {
    if (!confirm("이 질문을 삭제하시겠습니까? (답변도 함께 사라집니다)")) return;
    try {
      await commQuestionsApi.delete(question.id);
      await queryClient.invalidateQueries();
      onChanged();
      toast.success("삭제되었습니다.");
    } catch {
      toast.error("삭제 실패");
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        question.resolved ? "border-emerald-200 bg-emerald-50/40" : "bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            {question.resolved && <CheckCircle2 size={14} className="text-emerald-600" />}
            {/* F1: 익명 아님 && authorId 있을 때만 프로필 링크 */}
            {!question.anonymous && question.authorId ? (
              <Link href={`/profile/${question.authorId}`} className="text-[11px] text-muted-foreground hover:text-primary hover:underline">{name}</Link>
            ) : (
              <span className="text-[11px] text-muted-foreground">{name}</span>
            )}
            {question.resolved && (
              <Badge variant="outline" className="border-emerald-400 text-[9px] text-emerald-700">
                해결됨
              </Badge>
            )}
          </div>
          <p className="whitespace-pre-wrap">{question.body}</p>
        </div>
        {canDeletePost(user, question, board) && (
          <button
            type="button"
            onClick={handleDelete}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={handleLike}
          className={cn("flex items-center gap-1", liked ? "text-primary" : "hover:text-foreground")}
        >
          <ThumbsUp size={13} /> {question.likeCount}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 hover:text-foreground"
        >
          <MessageSquare size={13} /> 답변 {question.answerCount}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {expanded && (
        <AnswerThread
          board={board}
          question={question}
          user={user}
          likedSet={likedSet}
          canAccept={canAccept}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
