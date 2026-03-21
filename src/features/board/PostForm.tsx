"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, type PostCategory, type Post } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, Send, Save, Eye, PenLine } from "lucide-react";
import { toast } from "sonner";
import { useCreatePost, useUpdatePost } from "./useBoard";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";

interface PostData {
  title: string;
  content: string;
}

const ALL_CATEGORIES: PostCategory[] = [
  "notice",
  "seminar",
  "free",
  "promotion",
];

interface PostFormProps {
  mode?: "create" | "edit";
  initialData?: Post;
  onSubmitSuccess?: () => void;
}

export default function PostForm({ mode = "create", initialData, onSubmitSuccess }: PostFormProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [category, setCategory] = useState<PostCategory>(initialData?.category ?? "free");
  const [showPreview, setShowPreview] = useState(false);
  const { createPost } = useCreatePost();
  const { updatePost } = useUpdatePost();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PostData>({
    defaultValues: initialData
      ? { title: initialData.title, content: initialData.content }
      : undefined,
  });

  const watchTitle = watch("title");
  const watchContent = watch("content");

  // 역할별 카테고리 필터
  const availableCategories = ALL_CATEGORIES.filter((cat) => {
    if (cat === "notice") return isAtLeast(user, "president");
    if (cat === "promotion") return isAtLeast(user, "staff");
    return true;
  });

  async function onSubmit(data: PostData) {
    try {
      if (mode === "edit" && initialData) {
        await updatePost({ id: initialData.id, data: { ...data, category } });
        toast.success("게시글이 수정되었습니다.");
        if (onSubmitSuccess) {
          onSubmitSuccess();
        } else {
          router.push(`/board/${initialData.id}`);
        }
      } else {
        await createPost({ ...data, category });
        toast.success("게시글이 등록되었습니다.");
        router.push("/board");
      }
    } catch {
      toast.error(mode === "edit" ? "게시글 수정에 실패했습니다." : "게시글 등록에 실패했습니다.");
    }
  }

  const isEdit = mode === "edit";

  return (
    <div>
      <button
        onClick={() => router.push(isEdit && initialData ? `/board/${initialData.id}` : "/board")}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        {isEdit ? "돌아가기" : "목록으로"}
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? "글 수정" : "글쓰기"}</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? <PenLine size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
          {showPreview ? "편집" : "미리보기"}
        </Button>
      </div>

      {showPreview ? (
        /* ── 미리보기 ── */
        <div className="mt-6 rounded-2xl border bg-white p-8">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{CATEGORY_LABELS[category]}</Badge>
          </div>
          <h2 className="mt-3 text-xl font-bold">
            {watchTitle || "(제목 없음)"}
          </h2>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{user?.name ?? "작성자"}</span>
            <span>·</span>
            <span>{new Date().toLocaleDateString("ko-KR")}</span>
          </div>
          <hr className="my-4" />
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {watchContent || "(내용 없음)"}
          </div>
        </div>
      ) : (
        /* ── 편집 폼 ── */
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-4 rounded-2xl border bg-white p-8"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => (
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
            {!isAtLeast(user, "staff") && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                공지사항·홍보게시판은 운영진 이상만 작성할 수 있습니다.
              </p>
            )}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(isEdit && initialData ? `/board/${initialData.id}` : "/board")}
            >
              취소
            </Button>
            <Button type="submit">
              {isEdit ? (
                <>
                  <Save size={16} className="mr-1" />
                  수정하기
                </>
              ) : (
                <>
                  <Send size={16} className="mr-1" />
                  등록
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
