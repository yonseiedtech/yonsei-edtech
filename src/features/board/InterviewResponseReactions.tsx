"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  useInterviewResponseReactions,
  useToggleInterviewReaction,
} from "@/features/board/interview-store";
import { INTERVIEW_REACTION_EMOJIS, INTERVIEW_REACTION_LABELS } from "@/types";
import type { InterviewReactionType } from "@/types";

interface Props {
  responseId: string;
  postId: string;
}

const TYPES: InterviewReactionType[] = ["like", "cool"];

export default function InterviewResponseReactions({ responseId, postId }: Props) {
  const user = useAuthStore((s) => s.user);
  const { reactions, isLoading } = useInterviewResponseReactions(responseId);
  const { toggle, isLoading: isToggling } = useToggleInterviewReaction();

  const counts = useMemo(() => {
    const c: Record<InterviewReactionType, number> = { like: 0, cool: 0 };
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
      await toggle({ responseId, postId, type, existing: myReaction });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "반응 처리에 실패했습니다.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TYPES.map((type) => {
        const isMine = myReaction?.type === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggle(type)}
            disabled={isToggling || isLoading}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
              isMine
                ? "border-violet-400 bg-violet-50 text-violet-800"
                : "border-input bg-white text-muted-foreground hover:bg-muted"
            } ${isToggling || isLoading ? "opacity-60" : ""}`}
            aria-pressed={isMine}
            title={INTERVIEW_REACTION_LABELS[type]}
          >
            <span>{INTERVIEW_REACTION_EMOJIS[type]}</span>
            <span className="font-medium">{INTERVIEW_REACTION_LABELS[type]}</span>
            <span className="ml-0.5 tabular-nums">{counts[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
