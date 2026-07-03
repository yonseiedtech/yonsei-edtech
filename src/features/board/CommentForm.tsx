"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { profilesApi } from "@/lib/bkend";
import { pendingMentionQuery } from "@/lib/mentions";
import { useAuthStore } from "@/features/auth/auth-store";
import { useCreateComment } from "./useBoard";

interface Props {
  postId: string;
}

/**
 * 댓글 폼 — Phase 3: `@이름` 멘션 자동완성.
 * `@` 뒤 글자를 입력하면 회원 이름 후보가 뜨고, 선택하면 본문에 삽입된다.
 * 저장 시 멘션된 회원에게 알림 발송(useCreateComment 내부).
 */
export default function CommentForm({ postId }: Props) {
  const { user } = useAuthStore();
  const [content, setContent] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { createComment } = useCreateComment();

  // 멘션 후보 회원 — @ 를 처음 입력할 때만 로드 (5분 캐시)
  const { data: membersRes } = useQuery({
    queryKey: ["members-for-mention"],
    queryFn: () => profilesApi.list({ "filter[approved]": "true", limit: 500 }),
    enabled: mentionQuery !== null,
    staleTime: 5 * 60_000,
  });

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const members = (membersRes?.data ?? []) as unknown as { id: string; name?: string }[];
    return members
      .filter((m) => m.name && m.id !== user?.id && (mentionQuery === "" || m.name.includes(mentionQuery)))
      .slice(0, 6);
  }, [membersRes, mentionQuery, user?.id]);

  function syncMentionState(value: string, caret: number) {
    const q = pendingMentionQuery(value.slice(0, caret));
    setMentionQuery(q);
    if (q === null) setActiveIdx(0);
  }

  // 키보드 내비 (Batch-3): ↑↓ 이동, Enter/Tab 선택, Escape 닫기 — 보편 계약
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // QA-v2: 한글 IME 조합 중 Enter/방향키가 멘션을 오삽입하지 않도록
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (mentionQuery === null || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const pick = suggestions[Math.min(activeIdx, suggestions.length - 1)];
      if (pick?.name) insertMention(pick.name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMentionQuery(null);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    syncMentionState(e.target.value, e.target.selectionStart ?? e.target.value.length);
  }

  function insertMention(name: string) {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? content.length;
    const before = content.slice(0, caret).replace(/@([가-힣a-zA-Z0-9]{0,10})$/, `@${name} `);
    const after = content.slice(caret);
    setContent(before + after);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await createComment({ postId, content });
      setContent("");
      setMentionQuery(null);
      toast.success("댓글이 등록되었습니다.");
    } catch {
      toast.error("댓글 등록에 실패했습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative mt-4">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onClick={(e) => syncMentionState(content, e.currentTarget.selectionStart ?? 0)}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => {
          if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key) && mentionQuery !== null) return;
          syncMentionState(content, e.currentTarget.selectionStart ?? 0);
        }}
        onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
        placeholder="댓글을 입력하세요... (@이름 으로 회원을 멘션할 수 있어요)"
        rows={3}
        required
      />

      {/* @멘션 자동완성 드롭다운 */}
      {mentionQuery !== null && suggestions.length > 0 && (
        <ul
          className="absolute left-2 z-20 mt-1 w-56 overflow-hidden rounded-xl border bg-popover shadow-md"
          role="listbox"
          aria-label="멘션할 회원"
        >
          <li className="border-b px-3 py-1 text-[10px] text-muted-foreground">↑↓ 이동 · Enter 선택 · Esc 닫기</li>
          {suggestions.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m.name!);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors " +
                  (i === activeIdx ? "bg-accent" : "hover:bg-accent")
                }
              >
                <AtSign size={13} className="shrink-0 text-primary" />
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex justify-end">
        <Button type="submit" size="sm">
          댓글 등록
        </Button>
      </div>
    </form>
  );
}
