"use client";

import { useState } from "react";
import { User, Trash2, Pencil, Check, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import type { Comment } from "@/types";

interface Props {
  comments: Comment[];
  currentUserId?: string;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, content: string) => void;
}

export default function CommentList({ comments, currentUserId, isAdmin, onDelete, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditContent(comment.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  function saveEdit(id: string) {
    if (!editContent.trim()) return;
    onUpdate?.(id, editContent.trim());
    setEditingId(null);
    setEditContent("");
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User size={14} />
              </div>
              <span className="text-sm font-medium">{comment.authorName}</span>
              <span
                className="text-xs text-muted-foreground"
                title={new Date(comment.createdAt).toLocaleString("ko-KR")}
              >
                {/* Sprint 67-AN: 일자 + HH:MM:SS 시각 함께 표시 */}
                {formatDate(comment.createdAt)}{" "}
                <span className="font-mono tabular-nums">
                  {new Date(comment.createdAt).toLocaleTimeString("ko-KR", {
                    hour12: false,
                  })}
                </span>
              </span>
            </div>
            {(currentUserId === comment.authorId || isAdmin) && editingId !== comment.id && (
              <div className="flex items-center gap-1">
                {onUpdate && currentUserId === comment.authorId && (
                  <button
                    onClick={() => startEdit(comment)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Pencil size={12} />
                    수정
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => setDeleteTargetId(comment.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={12} />
                    삭제
                  </button>
                )}
              </div>
            )}
          </div>
          {editingId === comment.id ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={3}
              />
              <div className="mt-2 flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  <X size={14} className="mr-1" />
                  취소
                </Button>
                <Button size="sm" onClick={() => saveEdit(comment.id)}>
                  <Check size={14} className="mr-1" />
                  저장
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm">{comment.content}</p>
          )}
        </div>
      ))}
      {comments.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          아직 댓글이 없습니다.
        </p>
      )}

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>댓글 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTargetId && onDelete) {
                  onDelete(deleteTargetId);
                  setDeleteTargetId(null);
                }
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
