"use client";

/**
 * 모임·행사 후기 (Phase 2-D) — 지난 행사 카드 하단.
 * attending RSVP 회원이 별점(1~5)+한줄 후기를 남긴다 (1인 1건, 수정 가능).
 * 로그인 회원은 모두 읽을 수 있어 다음 행사 참여 결정에 참고.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/auth-store";
import { networkingReviewsApi } from "@/lib/bkend";
import type { NetworkingReview, NetworkingRsvp } from "@/types";
import EmptyState from "@/components/ui/empty-state";

export default function EventReviews({
  eventId,
  myRsvp,
}: {
  eventId: string;
  myRsvp?: NetworkingRsvp;
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const canWrite = !!user && myRsvp?.status === "attending";

  const { data: reviews = [] } = useQuery({
    queryKey: ["networking-reviews", eventId],
    queryFn: async () => (await networkingReviewsApi.listByEvent(eventId)).data as NetworkingReview[],
    enabled: !!user,
    staleTime: 60_000,
  });

  const myReview = useMemo(
    () => reviews.find((r) => r.userId === user?.id),
    [reviews, user?.id],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const avg = reviews.length
    ? Math.round((reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length) * 10) / 10
    : 0;

  function openForm() {
    setRating(myReview?.rating ?? 0);
    setContent(myReview?.content ?? "");
    setFormOpen(true);
  }

  async function submit() {
    if (!user || busy) return;
    if (rating < 1) {
      toast.error("별점을 선택해주세요.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      if (myReview) {
        await networkingReviewsApi.update(myReview.id, {
          rating,
          content: content.trim(),
          updatedAt: now,
        });
      } else {
        // 결정적 id upsert — 탭 중복/재시도로 인한 다중 후기 생성 차단
        await networkingReviewsApi.upsertMine({
          eventId,
          userId: user.id,
          displayName: user.name ?? "회원",
          rating,
          content: content.trim(),
          createdAt: now,
          updatedAt: now,
        });
      }
      toast.success("후기가 저장되었습니다.");
      setFormOpen(false);
      qc.invalidateQueries({ queryKey: ["networking-reviews", eventId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "후기 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mt-3 rounded-xl border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <MessageCircle size={13} />
          행사 후기
          {reviews.length > 0 && (
            <span className="inline-flex items-center gap-0.5 font-normal text-muted-foreground">
              — <Star size={11} className="fill-amber-400 text-amber-400" /> {avg} ({reviews.length}건)
            </span>
          )}
        </p>
        {canWrite && !formOpen && (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={openForm}>
            {myReview ? "내 후기 수정" : "후기 남기기"}
          </Button>
        )}
      </div>

      {formOpen && (
        <div className="mt-2 space-y-2 rounded-lg border bg-card p-3">
          <div className="flex items-center gap-0.5" role="radiogroup" aria-label="별점">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n}점`}
                onClick={() => setRating(n)}
                className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-muted"
              >
                <Star
                  size={24}
                  className={cn(
                    "transition-colors",
                    n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
                  )}
                />
              </button>
            ))}
            <span className="ml-1 min-w-8 text-sm font-semibold text-amber-600 dark:text-amber-400">
              {rating > 0 ? `${rating}점` : ""}
            </span>
          </div>
          <Textarea
            rows={2}
            className="min-h-[48px] text-sm"
            placeholder="한줄 후기 (선택)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-[11px]" disabled={busy} onClick={submit}>
              저장
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setFormOpen(false)}>
              취소
            </Button>
          </div>
        </div>
      )}

      {reviews.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {reviews.slice(0, 6).map((r) => (
            <li key={r.id} className="flex items-start gap-2 text-xs">
              <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-amber-600 dark:text-amber-400">
                <Star size={10} className="fill-current" />
                {r.rating}
              </span>
              <span className="min-w-0">
                <span className="font-medium">{r.displayName}</span>
                {r.content && <span className="text-muted-foreground"> — {r.content}</span>}
              </span>
            </li>
          ))}
          {reviews.length > 6 && (
            <li className="text-[11px] text-muted-foreground">외 {reviews.length - 6}건</li>
          )}
        </ul>
      ) : (
        !formOpen && (
          <EmptyState
            compact
            title="아직 후기가 없습니다"
            description={canWrite ? "첫 후기를 남겨주세요!" : undefined}
          />
        )
      )}
    </div>
  );
}
