"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  useInterviewResponseReactions,
  useToggleInterviewReaction,
} from "@/features/board/interview-store";
import {
  INTERVIEW_REACTION_EMOJIS,
  INTERVIEW_REACTION_LABELS,
  INTERVIEW_REACTION_TYPES,
} from "@/types";
import type { InterviewReactionType } from "@/types";

interface Props {
  responseId: string;
  postId: string;
  /** 특정 질문 답변에 대한 반응일 때 지정. 없으면 응답 전체 반응. */
  questionId?: string;
  size?: "sm" | "md";
}

export default function InterviewResponseReactions({
  responseId,
  postId,
  questionId,
  size = "md",
}: Props) {
  const user = useAuthStore((s) => s.user);
  const { reactions, isLoading } = useInterviewResponseReactions(responseId, questionId);
  const { toggle, isLoading: isToggling } = useToggleInterviewReaction();

  const counts = useMemo(() => {
    const c: Record<InterviewReactionType, number> = {
      like: 0,
      cool: 0,
      empathize: 0,
      cheer: 0,
    };
    for (const r of reactions) c[r.type] = (c[r.type] ?? 0) + 1;
    return c;
  }, [reactions]);

  const myReaction = useMemo(
    () => (user ? reactions.find((r) => r.userId === user.id) : undefined),
    [reactions, user]
  );

  async function onToggle(type: InterviewReactionType) {
    if (!user) {
      toast.error("로그인 후 이용해주세요.");
      return;
    }
    try {
      await toggle({ responseId, postId, questionId, type, existing: myReaction });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "반응 처리에 실패했습니다.");
    }
  }

  const sizeCls = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {INTERVIEW_REACTION_TYPES.map((type) => {
        const isMine = myReaction?.type === type;
        const count = counts[type] ?? 0;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggle(type)}
            disabled={isToggling || isLoading}
            className={`inline-flex items-center gap-1 rounded-full border transition ${sizeCls} ${
              isMine
                ? "border-blue-400 bg-blue-50 text-blue-800"
                : "border-input bg-white text-muted-foreground hover:bg-muted"
            } ${isToggling || isLoading ? "opacity-60" : ""}`}
            aria-pressed={isMine}
            title={INTERVIEW_REACTION_LABELS[type]}
          >
            <span>{INTERVIEW_REACTION_EMOJIS[type]}</span>
            <span className="font-medium">{INTERVIEW_REACTION_LABELS[type]}</span>
            {count > 0 && <span className="ml-0.5 tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
