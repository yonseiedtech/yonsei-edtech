"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import { CUSTOM_OPTION_ID, type InterviewMeta, type InterviewResponse } from "@/types";
import { useInterviewResponses, useDeleteInterviewResponse } from "./interview-store";

const FILL_BLANK_PATTERN = /\(\s+\)|_{3,}/;

function formatDuration(ms?: number): string {
  if (!ms || ms < 1000) return "";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import InterviewResponseReactions from "./InterviewResponseReactions";
import InterviewResponseComments from "./InterviewResponseComments";

interface Props {
  postId: string;
  meta: InterviewMeta;
}

export default function InterviewResponses({ postId, meta }: Props) {
  const { user } = useAuthStore();
  const isStaffPlus = user ? ["sysadmin", "admin", "president", "staff"].includes(user.role) : false;
  const { responses, isLoading } = useInterviewResponses(postId);
  const deleteResponse = useDeleteInterviewResponse(postId);
  const [pendingDelete, setPendingDelete] = useState<InterviewResponse | null>(null);
  const visibility = meta.responseVisibility ?? "public";
  const isPublic = visibility === "public";
  // staff+ 에게는 draft도 함께 노출하여 미정리 응답을 detail 페이지에서 직접 삭제할 수 있게 한다.
  const visibleResponses = useMemo(() => {
    if (isStaffPlus) return responses;
    const submitted = responses.filter((r) => r.status === "submitted");
    if (isPublic) return submitted;
    if (!user) return [];
    return submitted.filter((r) => r.respondentId === user.id);
  }, [responses, isStaffPlus, isPublic, user]);
  const submittedCount = useMemo(
    () => responses.filter((r) => r.status === "submitted").length,
    [responses],
  );
  const draftCount = useMemo(
    () => responses.filter((r) => r.status !== "submitted").length,
    [responses],
  );
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
      })
    );
    return m;
  }, [meta.questions]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteResponse.mutateAsync(pendingDelete.id);
      toast.success("응답이 삭제되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setPendingDelete(null);
    }
  }

  function renderChoiceLabel(
    q: { answerType: string; options?: { id: string; label: string }[] },
    selectedOptionId?: string,
    customOptionText?: string
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
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">
            {isPublic || isStaffPlus ? "전체 응답" : "내 응답"} ({submittedCount}
            {isStaffPlus && draftCount > 0 ? ` · 임시 ${draftCount}` : ""})
          </h2>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              isPublic
                ? "bg-blue-50 text-blue-700"
                : "bg-blue-50 text-blue-700"
            }`}
            title={isPublic ? "공유 모드" : "인터뷰 모드"}
          >
            {isPublic ? <Globe size={11} /> : <Lock size={11} />}
            {isPublic ? "공유 모드" : "인터뷰 모드"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {isPublic
            ? "로그인한 모든 회원이 응답을 열람·반응·댓글할 수 있습니다"
            : isStaffPlus
              ? "운영진 전용 — 전체 응답 열람"
              : "본인이 제출한 응답만 표시됩니다"}
        </p>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">응답을 불러오는 중...</p>
      ) : visibleResponses.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          {isStaffPlus
            ? "아직 제출된 응답이 없습니다."
            : user
              ? "아직 본인이 제출한 응답이 없습니다. 참여해 보세요!"
              : "로그인 후 인터뷰에 참여해 보세요."}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {visibleResponses.map((r: InterviewResponse) => (
            <article
              key={r.id}
              className={`rounded-2xl border bg-card p-5 ${
                r.status !== "submitted" ? "border-amber-300 bg-amber-50/40" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">
                    {r.respondentName || "(익명/미상)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.submittedAt
                      ? `${formatDate(r.submittedAt)} ${new Date(r.submittedAt).toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Seoul" })} (KST)`
                      : r.updatedAt
                        ? `최종 저장 ${formatDate(r.updatedAt)}`
                        : ""}
                    {r.totalElapsedMs && r.totalElapsedMs > 0
                      ? ` · 소요 ${formatDuration(r.totalElapsedMs)}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.status !== "submitted" && (
                    <Badge
                      variant="outline"
                      className="border-amber-400 text-[10px] text-amber-700"
                    >
                      임시저장
                    </Badge>
                  )}
                  {r.respondentRole && (
                    <Badge variant="secondary" className="text-[10px]">
                      {r.respondentRole}
                    </Badge>
                  )}
                  {isStaffPlus && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(r)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="응답 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-4">
                {r.answers
                  .filter((a) => questionById.has(a.questionId))
                  .sort((a, b) => (questionById.get(a.questionId)!.order ?? 0) - (questionById.get(b.questionId)!.order ?? 0))
                  .map((a) => {
                    const q = questionById.get(a.questionId)!;
                    const choiceLabel = renderChoiceLabel(q, a.selectedOptionId, a.customOptionText);
                    const isFillBlank = q.answerType === "fill_blank";
                    const fillBlankNode = isFillBlank ? renderFillBlankFilled(q.prompt, a.text) : null;
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
                        {q.answerType === "multi_text" && a.texts && a.texts.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {a.texts
                              .filter((t) => t && t.trim())
                              .map((t, i) => (
                                <span
                                  key={i}
                                  className="rounded-full bg-[#003876]/10 px-2.5 py-1 text-xs font-medium text-[#003876]"
                                >
                                  {t}
                                </span>
                              ))}
                          </div>
                        )}
                        {q.answerType === "multi_choice" && (() => {
                          const labels = renderMultiChoiceLabels(q, a.selectedOptionIds, a.customOptionText);
                          if (labels.length === 0) return null;
                          return (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {labels.map((l, i) => (
                                <span
                                  key={i}
                                  className="rounded-md bg-blue-50 px-2 py-0.5 text-sm font-semibold text-[#003876]"
                                >
                                  ✓ {l}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                        {!isFillBlank && q.answerType !== "multi_text" && q.answerType !== "multi_choice" && a.text && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{a.text}</p>
                        )}
                        {a.imageUrls && a.imageUrls.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {a.imageUrls.map((u) => (
                              <a key={u} href={u} target="_blank" rel="noreferrer">
                                <img src={u} alt="" className="h-24 w-24 rounded-lg border object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                        {a.elapsedMs && a.elapsedMs >= 1000 && (
                          <p className="mt-2 text-[11px] text-muted-foreground/80">
                            ⏱ 답변 소요 {formatDuration(a.elapsedMs)}
                          </p>
                        )}

                        {r.status === "submitted" && (
                          <div className="mt-3 space-y-2 border-t border-dashed pt-3">
                            <InterviewResponseReactions
                              responseId={r.id}
                              postId={postId}
                              questionId={a.questionId}
                              size="sm"
                            />
                            <InterviewResponseComments
                              responseId={r.id}
                              postId={postId}
                              questionId={a.questionId}
                              respondentId={r.respondentId}
                              compact
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {r.status === "submitted" && (
                <div className="mt-4 border-t pt-4">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    응답 전체에 대한 반응·댓글
                  </p>
                  <InterviewResponseReactions responseId={r.id} postId={postId} />
                  <div className="mt-3">
                    <InterviewResponseComments
                      responseId={r.id}
                      postId={postId}
                      respondentId={r.respondentId}
                    />
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>인터뷰 응답 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.respondentName} 님의 응답을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
