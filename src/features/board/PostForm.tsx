"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, ACTIVE_POST_CATEGORIES, type Post, type PostCategory, type PostPoll, type InterviewMeta } from "@/types";
import PollEditor from "./PollEditor";
import InterviewBuilder from "./InterviewBuilder";
import { cn } from "@/lib/utils";
import { ArrowLeft, Send, Save, Eye, PenLine, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreatePost, useUpdatePost } from "./useBoard";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { canWritePost } from "@/lib/post-permissions";
import { uploadImage } from "@/lib/upload";

interface PostData {
  title: string;
  content: string;
}

interface PostFormProps {
  mode?: "create" | "edit";
  initialData?: Post;
  initialCategory?: PostCategory;
  initialContent?: string;
  /** true이면 카테고리 선택 UI를 숨기고 initialCategory로 고정 */
  lockCategory?: boolean;
  onSubmitSuccess?: () => void;
}

export default function PostForm({ mode = "create", initialData, initialCategory, initialContent, lockCategory = false, onSubmitSuccess }: PostFormProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [category, setCategory] = useState<PostCategory>(initialData?.category ?? initialCategory ?? "free");
  const [showPreview, setShowPreview] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>(initialData?.imageUrls ?? []);
  const [poll, setPoll] = useState<PostPoll | null>(initialData?.poll ?? null);
  const [interview, setInterview] = useState<InterviewMeta>(
    initialData?.interview ?? {
      intro: "",
      responseVisibility: "public",
      questions: [],
    }
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createPost } = useCreatePost();
  const { updatePost } = useUpdatePost();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PostData>({
    defaultValues: initialData
      ? { title: initialData.title, content: initialData.content }
      : { title: "", content: initialContent ?? "" },
  });

  const watchTitle = watch("title");
  const watchContent = watch("content");

  // 역할별 카테고리 필터 (post-permissions 기반)
  const availableCategories = ACTIVE_POST_CATEGORIES.filter((cat) => canWritePost(cat, user?.role));

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        setImageUrls((prev) => [...prev, url]);
        // 내용에 이미지 마크다운 삽입
        const imgTag = `\n![${file.name}](${url})\n`;
        setValue("content", (watch("content") || "") + imgTag);
      }
      toast.success(`${files.length}개 이미지가 업로드되었습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이미지 업로드 실패");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveImage(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
    // 내용에서 해당 이미지 제거
    const content = watch("content") || "";
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const cleaned = content.replace(new RegExp(`\\n?!\\[[^\\]]*\\]\\(${escaped}\\)\\n?`, "g"), "\n");
    setValue("content", cleaned.trim());
  }

  async function onSubmit(data: PostData) {
    const isInterview = category === "interview" && isAtLeast(user, "staff");
    if (isInterview) {
      if (!interview.intro.trim()) {
        toast.error("인터뷰 소개문을 입력하세요.");
        return;
      }
      if (interview.questions.length === 0 || interview.questions.some((q) => !q.prompt.trim())) {
        toast.error("질문을 최소 1개 이상, 빈 질문 없이 작성하세요.");
        return;
      }
      // 인터뷰 글은 본문 대신 소개문을 content로 사용
      if (!data.content?.trim()) data.content = interview.intro;
    }
    const extra = isInterview
      ? { type: "interview" as const, interview }
      : { type: undefined, interview: undefined };
    try {
      if (mode === "edit" && initialData) {
        await updatePost({ id: initialData.id, data: { ...data, category, imageUrls, poll: poll ?? undefined, ...extra } });
        toast.success("게시글이 수정되었습니다.");
        if (onSubmitSuccess) {
          onSubmitSuccess();
        } else {
          router.push(`/board/${initialData.id}`);
        }
      } else {
        const created = await createPost({ ...data, category, imageUrls, poll: poll ?? undefined, ...extra }) as unknown as { id: string };
        toast.success("게시글이 등록되었습니다.");
        if (created?.id) {
          router.push(`/board/${created.id}`);
        } else {
          // fallback: 카테고리별 게시판으로 이동
          const categoryRoutes: Record<string, string> = {
            notice: "/notices",
            free: "/board/free",
            promotion: "/board/promotion",
            seminar: "/board/seminar",
            resources: "/board/resources",
            staff: "/board/staff",
            interview: "/board/interview",
          };
          router.push(categoryRoutes[category] ?? "/board");
        }
      }
    } catch {
      toast.error(mode === "edit" ? "게시글 수정에 실패했습니다." : "게시글 등록에 실패했습니다.");
    }
  }

  const isEdit = mode === "edit";

  /** 미리보기에서 이미지 마크다운을 img 태그로 변환 (XSS 방지) */
  function renderContent(text: string) {
    // HTML 엔티티 이스케이프 후 이미지 마크다운만 변환
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    return escaped.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="my-2 max-w-full rounded-lg" style="max-height:400px" />',
    );
  }

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
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: renderContent(watchContent || "(내용 없음)")
                .replace(/\n/g, "<br />"),
            }}
          />
        </div>
      ) : (
        /* ── 편집 폼 ── */
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-4 rounded-2xl border bg-white p-8"
        >
          {!lockCategory && (
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
                  공지사항·홍보·자료실은 운영진 이상만 작성할 수 있습니다.
                </p>
              )}
            </div>
          )}

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

          {category !== "interview" && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium">내용</label>
              <div className="flex items-center gap-2">
                {uploading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImagePlus size={14} className="mr-1" />
                  이미지 첨부
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
            <Textarea
              {...register("content", { required: "내용을 입력하세요" })}
              placeholder="내용을 입력하세요... (이미지는 ![설명](URL) 형식으로 삽입됩니다)"
              rows={14}
            />
            {errors.content && (
              <p className="mt-1 text-xs text-destructive">{errors.content.message}</p>
            )}
          </div>
          )}

          {/* 온라인 인터뷰 (인터뷰 게시판 + staff 이상) */}
          {category === "interview" && isAtLeast(user, "staff") && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
              <p className="text-sm font-medium text-blue-800">🎙️ 온라인 인터뷰 설정</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                인터뷰 게시판 글은 자동으로 온라인 인터뷰로 발행됩니다. 소개문과 질문을 입력하세요.
              </p>
              <div className="mt-4">
                <InterviewBuilder value={interview} onChange={setInterview} />
              </div>
            </div>
          )}

          {/* 투표 (선택) */}
          <PollEditor value={poll} onChange={setPoll} />

          {/* 첨부된 이미지 목록 */}
          {imageUrls.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                첨부 이미지 ({imageUrls.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url) => (
                  <div key={url} className="group relative">
                    <img
                      src={url}
                      alt=""
                      className="h-20 w-20 rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(url)}
                      className="absolute -right-1 -top-1 hidden rounded-full bg-destructive p-0.5 text-white group-hover:block"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
