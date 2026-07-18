"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { commQuestionsApi } from "@/lib/bkend";
import type { CommBoard, CommQuestion, User } from "@/types";
import { Button } from "@/components/ui/button";
import { getGuestNickname, setGuestNickname } from "./guest-name";

interface Props {
  board: CommBoard;
  user: User | null;
  onCreated: () => void;
  /** 생성된 질문 객체를 전달 — 멘토 알림 등 후속 트리거용 (선택) */
  onQuestionCreated?: (question: CommQuestion) => void;
  /** 수업 발표 보드 — 질문을 태깅할 발표자 (board.presenters 중 하나, undefined=공통) */
  presenter?: string;
  /** 입장 게이트에서 설정한 게스트 닉네임 — 변경 시 즉시 반영 (QA P1) */
  guestNickname?: string;
}

/** 질문/답변 공용으로 쓰는 게스트 이름·익명 로직을 포함한 질문 작성기 */
export default function QuestionComposer({ board, user, onCreated, onQuestionCreated, presenter, guestNickname }: Props) {
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  // 게스트 닉네임: 입장 게이트 prop 우선, 없으면 localStorage — 게이트 설정/변경 즉시 반영
  const [guestName, setGuestName] = useState("");
  useEffect(() => {
    if (!user) setGuestName(guestNickname || getGuestNickname());
  }, [user, guestNickname]);
  const [saving, setSaving] = useState(false);

  const isGuest = !user;
  const disabled = board.status === "closed" || (isGuest && !board.allowGuest);

  async function handleSubmit() {
    if (!body.trim()) {
      toast.error("질문 내용을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      const created = await commQuestionsApi.create({
        boardId: board.id,
        contextId: board.contextId,
        authorId: user?.id,
        authorName: user && !anonymous ? user.name : undefined,
        guestName: isGuest && guestName.trim() ? guestName.trim() : undefined,
        anonymous: board.allowAnonymous ? anonymous : false,
        presenter: presenter || undefined,
        body: body.trim(),
      });
      // 게스트가 이름을 적었으면 닉네임으로 기억 (다음 작성·답글 기본값)
      if (isGuest && guestName.trim()) setGuestNickname(guestName);
      setBody("");
      setAnonymous(false);
      onCreated();
      onQuestionCreated?.(created);
      toast.success("질문이 등록되었습니다.");
    } catch (e) {
      console.error("[comm-question/create]", e);
      toast.error("등록 실패 — 권한 또는 보드 상태를 확인하세요.");
    } finally {
      setSaving(false);
    }
  }

  if (disabled) {
    return (
      <p className="rounded border border-dashed bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
        {board.status === "closed" ? "닫힌 보드입니다 (읽기 전용)." : "이 보드는 로그인 사용자만 질문할 수 있습니다."}
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
      {presenter && (
        <p className="text-[11px] font-medium text-primary">→ {presenter} 발표자에게 질문</p>
      )}
      {isGuest && (
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="이름 (선택, 비우면 익명)"
          className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="질문을 입력하세요"
        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="flex items-center justify-between">
        {user && board.allowAnonymous ? (
          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            익명으로 게시
          </label>
        ) : (
          <span />
        )}
        <Button size="sm" onClick={handleSubmit} disabled={saving || !body.trim()}>
          {saving ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Send size={13} className="mr-1" />}
          질문 등록
        </Button>
      </div>
    </div>
  );
}
