"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  useInterviewResponseComments,
  useCreateInterviewComment,
  useUpdateInterviewComment,
  useDeleteInterviewComment,
} from "@/features/board/interview-store";
import { ROLE_LABELS } from "@/types";
import type { UserRole } from "@/types";
import { MessageSquare, Pencil, Trash2, X, Check } from "lucide-react";

interface Props {
  responseId: string;
  postId: string;
}

const STAFF_ROLES: UserRole[] = ["sysadmin", "admin", "president", "staff"];

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const h = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  return `${d.getFullYear()}.${m}.${day} ${h}:${min}`;
}

export default function InterviewResponseComments({ responseId, postId }: Props) {
  const user = useAuthStore((s) => s.user);
  const isStaffPlus = user ? STAFF_ROLES.includes(user.role) : false;
  const { comments, isLoading } = useInterviewResponseComments(responseId);
  const { createComment, isLoading: isCreating } = useCreateInterviewComment();
  const { updateComment, isLoading: isUpdating } = useUpdateInterviewComment();
  const { deleteComment } = useDeleteInterviewComment();

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  async function onSubmit() {
    if (!user) {
      toast.error("로그인 후 이용해주세요.");
      return;
    }
    const content = draft.trim();
    if (!content) return;
    try {
      await createComment({ responseId, postId, content });
      setDraft("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "댓글 작성에 실패했습니다.");
    }
  }

  function startEdit(id: string, content: string) {
    setEditingId(id);
    setEditingText(content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
  }

  async function saveEdit() {
    if (!editingId) return;
    const content = editingText.trim();
    if (!content) {
      toast.error("내용을 입력해주세요.");
      return;
    }
    try {
      await updateComment({ id: editingId, responseId, content });
      cancelEdit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "댓글 수정에 실패했습니다.");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("댓글을 삭제할까요?")) return;
    try {
      await deleteComment({ id, responseId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "댓글 삭제에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MessageSquare size={14} />
        <span>댓글 {comments.length}</span>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">댓글을 불러오는 중…</p>
      )}

      {comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map((c) => {
            const isMine = !!user && c.authorId === user.id;
            const canDelete = isMine || isStaffPlus;
            const canEdit = isMine;
            const isEditing = editingId === c.id;
            const roleLabel =
              c.authorRole && (c.authorRole as UserRole) in ROLE_LABELS
                ? ROLE_LABELS[c.authorRole as UserRole]
                : undefined;
            return (
              <li
                key={c.id}
                className="rounded-lg border bg-muted/30 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.authorName}</span>
                  {roleLabel && (
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      {roleLabel}
                    </span>
                  )}
                  <span>·</span>
                  <span>{formatDate(c.createdAt)}</span>
                  {c.updatedAt && c.updatedAt !== c.createdAt && (
                    <span className="text-[10px]">(수정됨)</span>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    {canEdit && !isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(c.id, c.content)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="수정"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                    {canDelete && !isEditing && (
                      <button
                        type="button"
                        onClick={() => onDelete(c.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={isUpdating}
                      >
                        <X size={14} className="mr-1" />
                        취소
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveEdit}
                        disabled={isUpdating}
                      >
                        <Check size={14} className="mr-1" />
                        {isUpdating ? "저장 중…" : "저장"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-foreground/90">
                    {c.content}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {user ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="댓글을 작성하세요"
            rows={2}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={isCreating || !draft.trim()}
            >
              {isCreating ? "작성 중…" : "댓글 작성"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
          로그인 후 댓글을 작성할 수 있습니다.
        </p>
      )}
    </div>
  );
}
