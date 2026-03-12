"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateComment } from "./useBoard";

interface Props {
  postId: string;
}

export default function CommentForm({ postId }: Props) {
  const [content, setContent] = useState("");
  const { createComment } = useCreateComment();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await createComment({ postId, content });
      setContent("");
      toast.success("댓글이 등록되었습니다.");
    } catch {
      toast.error("댓글 등록에 실패했습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="댓글을 입력하세요..."
        rows={3}
        required
      />
      <div className="mt-2 flex justify-end">
        <Button type="submit" size="sm">
          댓글 등록
        </Button>
      </div>
    </form>
  );
}
