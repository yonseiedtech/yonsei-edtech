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
import { CUSTOM_OPTION_ID, type InterviewMeta, type InterviewResponse } from "@/types";
import { formatDate } from "@/lib/utils";

const FILL_BLANK_PATTERN = /\(\s+\)|_{3,}/;

function formatDuration(ms?: number): string {
  if (!ms || ms < 1000) return "";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

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
      {
        order: number;
        prompt: string;
        description?: string;
        answerType: string;
        options?: { id: string; label: string }[];
      }
    >();
    meta.questions.forEach((q) =>
      m.set(q.id, {
        order: q.order,
        prompt: q.prompt,
        description: q.description,
        answerType: q.answerType,
        options: q.options,
      }),
    );
    return m;
  }, [meta.questions]);

  function renderChoiceLabel(
    q: { answerType: string; options?: { id: string; label: string }[] },
    selectedOptionId?: string,
    customOptionText?: string,
  ): string | null {
    if (!selectedOptionId) return null;
    if (q.answerType === "ox") return selectedOptionId === "O" ? "⭕ O" : "❌ X";
    if (q.answerType === "single_choice") {
      if (selectedOptionId === CUSTOM_OPTION_ID) {
        return `💬 (직접 입력) ${customOptionText ?? ""}`;
      }
      const opt = q.options?.find((o) => o.id === selectedOptionId);
      return opt?.label ?? selectedOptionId;
    }
    return null;
  }

  function renderMultiChoiceLabels(
    q: { options?: { id: string; label: string }[] },
    selectedOptionIds?: string[],
    customOptionText?: string,
  ): string[] {
    if (!selectedOptionIds || selectedOptionIds.length === 0) return [];
    return selectedOptionIds.map((id) => {
      if (id === CUSTOM_OPTION_ID) return `💬 ${customOptionText ?? "(직접 입력)"}`;
      const opt = q.options?.find((o) => o.id === id);
      return opt?.label ?? id;
    });
  }

  function renderFillBlankFilled(prompt: string, text?: string) {
    if (!FILL_BLANK_PATTERN.test(prompt)) return null;
    const parts = prompt.split(FILL_BLANK_PATTERN);
    return (
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < parts.length - 1 && (
              <span className="mx-1 inline-block border-b-2 border-[#003876] px-2 font-bold text-[#003876]">
                {text || "____"}
              </span>
            )}
          </span>
        ))}
      </p>
    );
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
            {response.totalElapsedMs && response.totalElapsedMs >= 1000 && (
              <span>· 소요 {formatDuration(response.totalElapsedMs)}</span>
            )}
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
              const choiceLabel = renderChoiceLabel(q, a.selectedOptionId, a.customOptionText);
              const isFillBlank = q.answerType === "fill_blank";
              const fillBlankNode = isFillBlank ? renderFillBlankFilled(q.prompt, a.text) : null;
              const isMultiText = q.answerType === "multi_text";
              const isMultiChoice = q.answerType === "multi_choice";
              const multiTextItems = (a.texts ?? []).filter((t) => t && t.trim());
              const multiChoiceLabels = isMultiChoice
                ? renderMultiChoiceLabels(q, a.selectedOptionIds, a.customOptionText)
                : [];
              const hasContent =
                !!a.text ||
                !!choiceLabel ||
                (a.imageUrls && a.imageUrls.length > 0) ||
                multiTextItems.length > 0 ||
                multiChoiceLabels.length > 0;
              return (
                <div key={a.questionId} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-semibold text-[#003876]">
                    Q{q.order}. {isFillBlank && fillBlankNode ? "" : q.prompt}
                  </p>
                  {q.description && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {q.description}
                    </p>
                  )}
                  {fillBlankNode}
                  {choiceLabel && (
                    <p className="mt-1 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-sm font-semibold text-[#003876]">
                      {choiceLabel}
                    </p>
                  )}
                  {isMultiText && multiTextItems.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {multiTextItems.map((t, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-[#003876]/10 px-2.5 py-1 text-xs font-medium text-[#003876]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {isMultiChoice && multiChoiceLabels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {multiChoiceLabels.map((l, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-blue-50 px-2 py-0.5 text-sm font-semibold text-[#003876]"
                        >
                          ✓ {l}
                        </span>
                      ))}
                    </div>
                  )}
                  {!isFillBlank && !isMultiText && !isMultiChoice && a.text && (
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
                  {!hasContent && (
                    <p className="mt-1 text-xs italic text-muted-foreground">(답변 없음)</p>
                  )}
                  {a.elapsedMs && a.elapsedMs >= 1000 && (
                    <p className="mt-2 text-[11px] text-muted-foreground/80">
                      ⏱ 답변 소요 {formatDuration(a.elapsedMs)}
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
