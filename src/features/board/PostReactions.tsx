"use client";

/**
 * 게시글 공감 reaction UI (Sprint 67-AO)
 *
 * 모든 카테고리 게시글에 적용. 한 회원이 한 게시글에 4종 reaction 동시 가능.
 * 클릭 시 toggle — 있으면 제거, 없으면 추가.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  POST_REACTION_EMOJIS,
  POST_REACTION_LABELS,
  POST_REACTION_TYPES,
  type PostReaction,
  type PostReactionType,
} from "@/types";
import { postReactionsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { Loader2 } from "lucide-react";

interface Props {
  postId: string;
}

export default function PostReactions({ postId }: Props) {
  const { user } = useAuthStore();
  const [reactions, setReactions] = useState<PostReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingType, setTogglingType] = useState<PostReactionType | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await postReactionsApi.listByPost(postId);
        if (!cancelled) setReactions(res?.data ?? []);
      } catch (e) {
        console.error("[PostReactions]", e);
        if (!cancelled) setReactions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const counts = useMemo(() => {
    const map: Record<PostReactionType, number> = {
      thumbs_up: 0,
      sparkle: 0,
      heart: 0,
      applaud: 0,
    };
    for (const r of reactions) {
      if (map[r.type] != null) map[r.type] += 1;
    }
    return map;
  }, [reactions]);

  const myReactions = useMemo(() => {
    if (!user) return new Set<PostReactionType>();
    return new Set(
      reactions.filter((r) => r.userId === user.id).map((r) => r.type),
    );
  }, [reactions, user]);

  async function handleToggle(type: PostReactionType) {
    if (!user) {
      toast.error("로그인 후 공감할 수 있습니다.");
      return;
    }
    setTogglingType(type);
    try {
      const added = await postReactionsApi.toggle(user.id, postId, type);
      // 낙관적 갱신
      if (added) {
        setReactions((prev) => [
          ...prev,
          {
            id: `${user.id}_${postId}_${type}`,
            userId: user.id,
            postId,
            type,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setReactions((prev) =>
          prev.filter(
            (r) => !(r.userId === user.id && r.type === type),
          ),
        );
      }
    } catch (e) {
      toast.error(
        `공감 처리 실패: ${e instanceof Error ? e.message : "권한 또는 네트워크 오류"}`,
      );
    } finally {
      setTogglingType(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-y py-3">
      {POST_REACTION_TYPES.map((type) => {
        const count = counts[type];
        const mine = myReactions.has(type);
        const isToggling = togglingType === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => handleToggle(type)}
            disabled={isToggling || loading}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              mine
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            } ${isToggling || loading ? "opacity-50" : ""}`}
            title={POST_REACTION_LABELS[type]}
            aria-pressed={mine}
          >
            <span className="text-base">{POST_REACTION_EMOJIS[type]}</span>
            <span>{POST_REACTION_LABELS[type]}</span>
            {count > 0 && (
              <span
                className={`font-mono tabular-nums ${mine ? "text-primary" : ""}`}
              >
                {count}
              </span>
            )}
            {isToggling && <Loader2 className="ml-0.5 h-3 w-3 animate-spin" />}
          </button>
        );
      })}
    </div>
  );
}
