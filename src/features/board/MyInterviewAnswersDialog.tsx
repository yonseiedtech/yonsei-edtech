"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { InterviewMeta, InterviewResponse } from "@/types";
import { formatDate } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postTitle: string;
  meta: InterviewMeta;
  response: InterviewResponse;
}

export default function MyInterviewAnswersDialog({
  open,
  onOpenChange,
  postTitle,
  meta,
  response,
}: Props) {
  const questionById = useMemo(() => {
    const m = new Map<
      string,
      { order: number; prompt: string; answerType: string; options?: { id: string; label: string }[] }
    >();
    meta.questions.forEach((q) =>
      m.set(q.id, { order: q.order, prompt: q.prompt, answerType: q.answerType, options: q.options }),
    );
    return m;
  }, [meta.questions]);

  function renderChoiceLabel(
    q: { answerType: string; options?: { id: string; label: string }[] },
    selectedOptionId?: string,
  ): string | null {
    if (!selectedOptionId) return null;
    if (q.answerType === "ox") return selectedOptionId === "O" ? "⭕ O" : "❌ X";
    if (q.answerType === "single_choice") {
      const opt = q.options?.find((o) => o.id === selectedOptionId);
      return opt?.label ?? selectedOptionId;
    }
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{postTitle}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className={
                response.status === "submitted"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }
            >
              {response.status === "submitted" ? "제출 완료" : "임시 저장"}
            </Badge>
            <span>
              {response.submittedAt
                ? `제출 ${formatDate(response.submittedAt)}`
                : response.updatedAt
                  ? `저장 ${formatDate(response.updatedAt)}`
                  : ""}
            </span>
            <span>· 답변 {response.answers.length}개</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          {response.answers
            .filter((a) => questionById.has(a.questionId))
            .sort(
              (a, b) =>
                (questionById.get(a.questionId)!.order ?? 0) -
                (questionById.get(b.questionId)!.order ?? 0),
            )
            .map((a) => {
              const q = questionById.get(a.questionId)!;
              const choiceLabel = renderChoiceLabel(q, a.selectedOptionId);
              return (
                <div key={a.questionId} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-semibold text-[#003876]">
                    Q{q.order}. {q.prompt}
                  </p>
                  {choiceLabel && (
                    <p className="mt-1 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-sm font-semibold text-[#003876]">
                      {choiceLabel}
                    </p>
                  )}
                  {a.text && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{a.text}</p>
                  )}
                  {a.imageUrls && a.imageUrls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.imageUrls.map((u) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer">
                          <img
                            src={u}
                            alt=""
                            className="h-24 w-24 rounded-lg border object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {!a.text && !choiceLabel && (!a.imageUrls || a.imageUrls.length === 0) && (
                    <p className="mt-1 text-xs italic text-muted-foreground">(답변 없음)</p>
                  )}
                </div>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
