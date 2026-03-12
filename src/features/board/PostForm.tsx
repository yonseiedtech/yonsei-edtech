"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABELS, type PostCategory } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { useCreatePost } from "./useBoard";

interface PostData {
  title: string;
  content: string;
}

const categories: PostCategory[] = ["notice", "seminar", "free"];

export default function PostForm() {
  const router = useRouter();
  const [category, setCategory] = useState<PostCategory>("free");
  const { createPost } = useCreatePost();
  const { register, handleSubmit, formState: { errors } } = useForm<PostData>();

  async function onSubmit(data: PostData) {
    try {
      await createPost({ ...data, category });
      toast.success("게시글이 등록되었습니다.");
      router.push("/board");
    } catch (err) {
      toast.error("게시글 등록에 실패했습니다.");
    }
  }

  return (
    <div>
      <button
        onClick={() => router.push("/board")}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        목록으로
      </button>

      <h1 className="text-2xl font-bold">글쓰기</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4 rounded-2xl border bg-white p-8"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium">카테고리</label>
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  category === cat
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">제목</label>
          <Input
            {...register("title", { required: "제목을 입력하세요" })}
            placeholder="제목을 입력하세요"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">내용</label>
          <Textarea
            {...register("content", { required: "내용을 입력하세요" })}
            placeholder="내용을 입력하세요..."
            rows={12}
          />
          {errors.content && (
            <p className="mt-1 text-xs text-destructive">{errors.content.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/board")}>
            취소
          </Button>
          <Button type="submit">
            <Send size={16} className="mr-1" />
            등록
          </Button>
        </div>
      </form>
    </div>
  );
}
