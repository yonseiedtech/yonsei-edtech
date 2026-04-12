"use client";

import { useMemo, useState } from "react";
import { BarChart3, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PostPoll } from "@/types";

interface Props {
  poll: PostPoll;
  myVote?: string[];           // 이미 투표한 옵션 id 배열
  canVote: boolean;            // 로그인 + 미마감 + 중복 아님
  onSubmit?: (optionIds: string[]) => Promise<void> | void;
}

export default function PollViewer({ poll, myVote, canVote, onSubmit }: Props) {
  const [selected, setSelected] = useState<string[]>(myVote ?? []);
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const deadlinePassed = poll.deadline ? now >= new Date(poll.deadline) : false;
  const hideResults =
    (!deadlinePassed && poll.hideResultsBeforeDeadline) ||
    (deadlinePassed && poll.hideResultsAfterDeadline);
  const voted = (myVote?.length ?? 0) > 0;
  const showResults = !hideResults && (voted || deadlinePassed);

  const total = useMemo(
    () => poll.options.reduce((sum, o) => sum + (o.voteCount ?? 0), 0),
    [poll.options],
  );

  function toggle(id: string) {
    if (!canVote || deadlinePassed) return;
    if (poll.multi) {
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    } else {
      setSelected([id]);
    }
  }

  async function handleSubmit() {
    if (!onSubmit || selected.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(selected);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-blue-50/30 p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 size={14} className="text-blue-600" />
          {poll.question || "투표"}
        </h4>
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          {poll.multi && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">복수선택</span>}
          {poll.anonymous && <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">익명</span>}
          {poll.deadline && (
            <span className={cn("rounded px-1.5 py-0.5", deadlinePassed ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
              {deadlinePassed ? "마감" : `~${new Date(poll.deadline).toLocaleString("ko-KR")}`}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          const mine = myVote?.includes(opt.id);
          const pct = total > 0 ? Math.round(((opt.voteCount ?? 0) / total) * 100) : 0;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              disabled={!canVote || deadlinePassed || voted}
              className={cn(
                "relative w-full overflow-hidden rounded-lg border bg-white p-2 text-left text-sm transition-colors",
                isSelected && "border-primary",
                mine && "ring-2 ring-primary/40",
                (!canVote || deadlinePassed || voted) && "cursor-default",
              )}
            >
              {showResults && (
                <div
                  className="absolute inset-y-0 left-0 bg-blue-100"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  {isSelected && <Check size={12} className="text-primary" />}
                  {opt.label}
                </span>
                {showResults && (
                  <span className="text-xs text-muted-foreground">
                    {opt.voteCount ?? 0}표 ({pct}%)
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {hideResults && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock size={12} />
          {deadlinePassed ? "비공개 투표입니다." : "결과는 마감 후 공개됩니다."}
        </p>
      )}

      {canVote && !deadlinePassed && !voted && (
        <Button type="button" size="sm" onClick={handleSubmit} disabled={selected.length === 0 || submitting}>
          {submitting ? "전송 중..." : "투표하기"}
        </Button>
      )}
      {voted && !deadlinePassed && poll.editableUntil && new Date() < new Date(poll.editableUntil) && (
        <p className="text-xs text-muted-foreground">
          {new Date(poll.editableUntil).toLocaleString("ko-KR")}까지 투표를 수정할 수 있습니다.
        </p>
      )}
      <p className="text-xs text-muted-foreground">총 {total}표</p>
    </div>
  );
}
