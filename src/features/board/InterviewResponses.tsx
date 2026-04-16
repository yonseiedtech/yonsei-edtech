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
import type { InterviewMeta, InterviewResponse } from "@/types";
import { useInterviewResponses, useDeleteInterviewResponse } from "./interview-store";
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
  const isStaffPlus = user ? ["admin", "president", "staff"].includes(user.role) : false;
  const { responses, isLoading } = useInterviewResponses(postId);
  const deleteResponse = useDeleteInterviewResponse(postId);
  const [pendingDelete, setPendingDelete] = useState<InterviewResponse | null>(null);
  const visibility = meta.responseVisibility ?? "public";
  const isPublic = visibility === "public";
  const submitted = useMemo(() => {
    const all = responses.filter((r) => r.status === "submitted");
    if (isStaffPlus) return all;
    if (isPublic) return all;
    if (!user) return [];
    return all.filter((r) => r.respondentId === user.id);
  }, [responses, isStaffPlus, isPublic, user]);
  const questionById = useMemo(() => {
    const m = new Map<
      string,
      { order: number; prompt: string; answerType: string; options?: { id: string; label: string }[] }
    >();
    meta.questions.forEach((q) =>
      m.set(q.id, { order: q.order, prompt: q.prompt, answerType: q.answerType, options: q.options })
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
    selectedOptionId?: string
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
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">
            {isPublic || isStaffPlus ? "전체 응답" : "내 응답"} ({submitted.length})
          </h2>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              isPublic
                ? "bg-blue-50 text-blue-700"
                : "bg-violet-50 text-violet-700"
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
      ) : submitted.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          {isStaffPlus
            ? "아직 제출된 응답이 없습니다."
            : user
              ? "아직 본인이 제출한 응답이 없습니다. 참여해 보세요!"
              : "로그인 후 인터뷰에 참여해 보세요."}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {submitted.map((r: InterviewResponse) => (
            <article key={r.id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{r.respondentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.submittedAt
                      ? `${formatDate(r.submittedAt)} ${new Date(r.submittedAt).toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
                    const choiceLabel = renderChoiceLabel(q, a.selectedOptionId);
                    return (
                      <div key={a.questionId} className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-semibold text-[#003876]">Q{q.order}. {q.prompt}</p>
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
                                <img src={u} alt="" className="h-24 w-24 rounded-lg border object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="mt-4 border-t pt-4">
                <InterviewResponseReactions responseId={r.id} postId={postId} />
              </div>
              <div className="mt-3">
                <InterviewResponseComments responseId={r.id} postId={postId} />
              </div>
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
