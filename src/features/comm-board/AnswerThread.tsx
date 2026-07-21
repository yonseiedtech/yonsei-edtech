"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Send, ThumbsUp, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { commAnswersApi, commLikesApi, commQuestionsApi } from "@/lib/bkend";
import { notifyCommAnswerAccepted } from "@/features/notifications/notify";
import { auth as firebaseAuth } from "@/lib/firebase";
import type { CommAnswer, CommBoard, CommQuestion, User } from "@/types";
import { canDeletePost } from "./comm-helpers";
import { getGuestNickname, setGuestNickname } from "./guest-name";
import KudosInlineButton from "@/features/kudos/KudosInlineButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  board: CommBoard;
  question: CommQuestion;
  user: User | null;
  likedSet: Set<string>;
  /** 질문 작성자(로그인)인지 — 채택 권한 판단 */
  canAccept: boolean;
  onChanged: () => void;
  /** 입장 게이트에서 설정한 게스트 닉네임 — 변경 시 즉시 반영 (QA P1) */
  guestNickname?: string;
  /**
   * 부모가 보드 단위로 일괄 구독한 답변 (QA P2: 질문당 N+1 쿼리 해소).
   * 전달되면 내부 쿼리를 건너뛰고 이 값을 사용 — 월(WallBoard) 전용 모드.
   */
  preloadedAnswers?: CommAnswer[];
}

export default function AnswerThread({
  board,
  question,
  user,
  likedSet,
  canAccept,
  onChanged,
  guestNickname,
  preloadedAnswers,
}: Props) {
  const queryClient = useQueryClient();
  const { data: queriedAnswers = [], isLoading: queryLoading } = useQuery({
    queryKey: ["comm-answers", question.id],
    // preloadedAnswers 모드(월 뷰)에서는 개별 쿼리를 건너뜀 — 보드 단위 onSnapshot 이 대체
    enabled: preloadedAnswers === undefined,
    queryFn: async () => {
      const res = await commAnswersApi.listByQuestion(question.id);
      return (res.data as CommAnswer[]).sort((a, b) =>
        (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
      );
    },
  });
  const answers = preloadedAnswers ?? queriedAnswers;
  const isLoading = preloadedAnswers === undefined && queryLoading;

  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  // 게스트 닉네임: 입장 게이트 prop 우선, 없으면 localStorage — 게이트 설정/변경 즉시 반영
  useEffect(() => {
    if (!user) setGuestName(guestNickname || getGuestNickname());
  }, [user, guestNickname]);
  const [saving, setSaving] = useState(false);
  // 답변 인라인 수정 (회원 작성자/보드 소유자/운영진)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const isGuest = !user;
  const disabled = board.status === "closed" || (isGuest && !board.allowGuest);

  async function handleAdd() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await commAnswersApi.create({
        questionId: question.id,
        boardId: board.id,
        authorId: user?.id,
        authorName: user?.name,
        guestName: isGuest && guestName.trim() ? guestName.trim() : undefined,
        anonymous: false,
        body: body.trim(),
      });
      // 게스트가 이름을 적었으면 닉네임으로 기억
      if (isGuest && guestName.trim()) setGuestNickname(guestName);
      setBody("");
      // 사이클 4: 질문 작성자 알림을 서버 경로로 — 게스트 답변도 인앱+push 도달 (실패 비차단)
      if (question.authorId && question.authorId !== user?.id) {
        const answererName = user?.name ?? (guestName.trim() || "게스트");
        void (async () => {
          try {
            const token = user ? await firebaseAuth.currentUser?.getIdToken() : undefined;
            await fetch("/api/comm/notify-answer", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ questionId: question.id, answererName }),
            });
          } catch {
            // 알림 실패는 답변 등록을 막지 않음
          }
        })();
      }
      await queryClient.invalidateQueries({ queryKey: ["comm-answers", question.id] });
      onChanged();
      toast.success("답변이 등록되었습니다.");
    } catch (e) {
      console.error("[comm-answer/create]", e);
      toast.error("답변 등록 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleLike(a: CommAnswer) {
    if (!user) {
      toast.error("좋아요는 로그인 후 가능합니다.");
      return;
    }
    try {
      await commLikesApi.toggle(user.id, "answer", a.id);
      await queryClient.invalidateQueries({ queryKey: ["comm-answers", question.id] });
      onChanged();
    } catch {
      toast.error("좋아요 처리 실패");
    }
  }

  async function handleAccept(a: CommAnswer) {
    try {
      const newAccepted = question.resolvedAnswerId === a.id ? null : a.id;
      await commQuestionsApi.setResolved(question.id, newAccepted !== null, newAccepted);
      // Sprint UX-6: 채택 시 답변 작성자(회원)에게 인앱 알림 — 본인 채택은 제외
      if (newAccepted && a.authorId && a.authorId !== user?.id) {
        void notifyCommAnswerAccepted(
          a.authorId,
          board.id,
          question.body.length > 30 ? `${question.body.slice(0, 30)}…` : question.body,
        );
      }
      onChanged();
      toast.success(newAccepted ? "답변을 채택했습니다." : "채택을 해제했습니다.");
    } catch {
      toast.error("채택 처리 실패");
    }
  }

  async function handleEditSave(a: CommAnswer) {
    if (!editText.trim()) {
      toast.error("내용을 입력하세요.");
      return;
    }
    try {
      await commAnswersApi.update(a.id, { body: editText.trim() });
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ["comm-answers", question.id] });
      onChanged();
      toast.success("답변이 수정되었습니다.");
    } catch {
      toast.error("수정 실패 — 권한을 확인하세요.");
    }
  }

  async function handleDelete(a: CommAnswer) {
    if (!confirm("이 답변을 삭제하시겠습니까?")) return;
    try {
      await commAnswersApi.delete({ id: a.id, questionId: a.questionId });
      await queryClient.invalidateQueries({ queryKey: ["comm-answers", question.id] });
      onChanged();
      toast.success("삭제되었습니다.");
    } catch {
      toast.error("삭제 실패");
    }
  }

  return (
    <div className="mt-2 space-y-2 border-l-2 border-muted pl-3">
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        answers.map((a) => {
          const accepted = question.resolvedAnswerId === a.id;
          const liked = likedSet.has(`answer__${a.id}`);
          const name = a.anonymous ? "익명" : a.authorName ?? a.guestName ?? "게스트";
          return (
            <div
              key={a.id}
              className={cn(
                "rounded border px-2.5 py-1.5 text-xs",
                accepted ? "border-success/30 bg-success/5" : "bg-card",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {/* F1: 익명 아님 && authorId 있을 때만 프로필 링크 */}
                  {!a.anonymous && a.authorId ? (
                    <Link href={`/profile/${a.authorId}`} className="hover:text-primary hover:underline">{name}</Link>
                  ) : (
                    name
                  )}
                  {accepted && (
                    <Badge variant="outline" className="border-success/40 text-[9px] text-success">
                      채택됨
                    </Badge>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLike(a)}
                    className={cn(
                      "flex items-center gap-0.5 rounded px-1 text-[10px]",
                      liked ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ThumbsUp size={11} /> {a.likeCount}
                  </button>
                  {canAccept && (
                    <button
                      type="button"
                      onClick={() => handleAccept(a)}
                      title={accepted ? "채택 해제" : "채택"}
                      className={cn(
                        "rounded p-0.5",
                        accepted ? "text-success" : "text-muted-foreground hover:text-success",
                      )}
                    >
                      <Check size={12} />
                    </button>
                  )}
                  {canDeletePost(user, a, board) && (
                    <>
                      <button
                        type="button"
                        title="답변 수정"
                        onClick={() => {
                          setEditingId(a.id);
                          setEditText(a.body);
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a)}
                        className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={11} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {editingId === a.id ? (
                <div className="mt-1.5 space-y-1.5">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                    >
                      <X size={10} /> 취소
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditSave(a)}
                      className="flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground hover:bg-primary/90"
                    >
                      <Check size={10} /> 저장
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap">{a.body}</p>
              )}

              {/* v11-H2: 멘토링 답변 채택 시 질문자 → 멘토 감사 응원 (주 1회·양성 전용) */}
              {accepted &&
                board.contextType === "mentoring" &&
                user &&
                question.authorId === user.id &&
                a.authorId &&
                a.authorId !== user.id && (
                  <div className="mt-1.5 flex items-center gap-1.5 border-t border-success/20 pt-1.5">
                    <span className="text-[10px] text-muted-foreground">도움이 되었다면</span>
                    <KudosInlineButton
                      me={user}
                      target={{ id: a.authorId, name: a.authorName ?? "멘토" }}
                      context="mentoring"
                      label="멘토에게 응원"
                    />
                  </div>
                )}
            </div>
          );
        })
      )}

      {!disabled && (
        <div className="space-y-1.5">
          {isGuest && (
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="이름 (선택)"
              className="w-full rounded-md border bg-background px-2 py-1 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          )}
          <div className="flex gap-1.5">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={1}
              placeholder="답변 작성…"
              className="flex-1 rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <Button size="sm" className="h-auto px-2" onClick={handleAdd} disabled={saving || !body.trim()}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
