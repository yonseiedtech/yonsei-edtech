"use client";

/**
 * 해커톤 심사 루브릭 채점 폼 — 공용 컴포넌트 (X1, 2026-07-22)
 *
 * 콘솔 심사 탭(JudgingCard 내부)과 외부/졸업생 심사위원 전용 페이지(/hackathon/judge)에서
 * 동일하게 사용한다. 수상 지정·공개·삭제 등 운영 컨트롤은 이 컴포넌트에 포함하지 않는다.
 */

import { useState } from "react";
import { Star, Save, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { hackathonJudgingsApi } from "@/lib/bkend";
import {
  HACKATHON_RUBRIC,
  HACKATHON_RUBRIC_MAX,
  type HackathonJudging,
  type HackathonRubricKey,
} from "@/types";

type ScoreDraft = Record<HackathonRubricKey, number>;

const EMPTY_SCORES: ScoreDraft = {
  problem: 0,
  edtech: 0,
  completeness: 0,
  presentation: 0,
};

interface Props {
  submissionId: string;
  contextId: string;
  judgeId: string;
  judgeName: string;
  /** 이미 저장된 심사 기록 — 있으면 폼에 프리필. key prop 으로 remount 유도 권장. */
  existingJudging?: HackathonJudging;
  onSaved?: () => void;
}

export default function HackathonJudgingScoreForm({
  submissionId,
  contextId,
  judgeId,
  judgeName,
  existingJudging,
  onSaved,
}: Props) {
  const [scores, setScores] = useState<ScoreDraft>(
    existingJudging ? { ...EMPTY_SCORES, ...existingJudging.scores } : EMPTY_SCORES,
  );
  const [comment, setComment] = useState(existingJudging?.comment ?? "");

  const saveScore = useMutation({
    mutationFn: () =>
      hackathonJudgingsApi.upsert(submissionId, judgeId, {
        contextId,
        submissionId,
        judgeId,
        judgeName,
        scores,
        comment: comment.trim(),
      }),
    onSuccess: () => {
      toast.success("심사 점수를 저장했습니다.");
      onSaved?.();
    },
    onError: (e) =>
      toast.error(`저장 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
        <Star size={13} /> 내 심사 점수
      </p>
      <div className="mt-2.5 space-y-2.5">
        {HACKATHON_RUBRIC.map((r) => (
          <div key={r.key}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium">{r.label}</span>
              <span className="text-[11px] text-muted-foreground">{r.hint}</span>
            </div>
            <div className="mt-1 flex gap-1">
              {Array.from({ length: HACKATHON_RUBRIC_MAX + 1 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScores((prev) => ({ ...prev, [r.key]: n }))}
                  aria-pressed={scores[r.key] === n}
                  className={`h-8 w-8 rounded-md border text-xs font-semibold tabular-nums transition-colors ${
                    scores[r.key] === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="심사 코멘트 (선택)"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={() => saveScore.mutate()} disabled={saveScore.isPending}>
          {saveScore.isPending ? (
            <Loader2 size={14} className="mr-1 animate-spin" />
          ) : (
            <Save size={14} className="mr-1" />
          )}
          {existingJudging ? "점수 수정" : "점수 저장"}
        </Button>
      </div>
    </div>
  );
}
