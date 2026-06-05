"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { commBoardsApi } from "@/lib/bkend";
import type { CommBoard, CommContextType } from "@/types";
import { Button } from "@/components/ui/button";

interface Props {
  contextType: CommContextType;
  contextId: string;
  activityProgressId?: string;
  week?: number;
  ownerId: string;
  ownerName: string;
  /** 수정 모드일 때 기존 보드 */
  board?: CommBoard;
  onClose: () => void;
  onSaved: (board: CommBoard) => void;
}

export default function CommBoardDialog({
  contextType,
  contextId,
  activityProgressId,
  week,
  ownerId,
  ownerName,
  board,
  onClose,
  onSaved,
}: Props) {
  const editing = !!board;
  const [title, setTitle] = useState(board?.title ?? "");
  const [description, setDescription] = useState(board?.description ?? "");
  const [allowGuest, setAllowGuest] = useState(board?.allowGuest ?? false);
  const [allowAnonymous, setAllowAnonymous] = useState(board?.allowAnonymous ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("보드 제목을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      if (editing && board) {
        const updated = await commBoardsApi.update(board.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          allowGuest,
          allowAnonymous,
        });
        toast.success("보드가 수정되었습니다.");
        onSaved(updated);
      } else {
        const created = await commBoardsApi.create({
          contextType,
          contextId,
          activityProgressId,
          week,
          title: title.trim(),
          description: description.trim() || undefined,
          ownerId,
          ownerName,
          allowGuest,
          allowAnonymous,
          status: "open",
          defaultSort: "recent",
        });
        toast.success("보드가 생성되었습니다.");
        onSaved(created);
      }
      onClose();
    } catch (e) {
      console.error("[comm-board/save]", e);
      toast.error(e instanceof Error ? `저장 실패: ${e.message}` : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{editing ? "보드 수정" : "소통 보드 만들기"}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="보드 제목 (예: 오늘 발표 Q&A)"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="설명 (선택)"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={allowGuest} onChange={(e) => setAllowGuest(e.target.checked)} />
          비로그인(게스트) 질문/답변 허용
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={allowAnonymous} onChange={(e) => setAllowAnonymous(e.target.checked)} />
          익명 작성 옵션 노출
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Save size={13} className="mr-1" />}
            {editing ? "수정" : "생성"}
          </Button>
        </div>
      </div>
    </div>
  );
}
