"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, ACTIVE_POST_CATEGORIES, type Post, type PostCategory, type PostPoll, type InterviewMeta, type PostLinkedPaper } from "@/types";
import PollEditor from "./PollEditor";
import InterviewBuilder from "./InterviewBuilder";
import LinkedPaperPicker from "./LinkedPaperPicker";
import { cn } from "@/lib/utils";
import { ArrowLeft, Send, Save, Eye, PenLine, ImagePlus, X, Loader2, BookOpenCheck, Plus } from "lucide-react";
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
  // Sprint 76e: 투표 첨부 영역 선택적 노출 (이미 첨부된 글이면 자동으로 펼침)
  const [pollSectionOpen, setPollSectionOpen] = useState<boolean>(!!initialData?.poll);
  const [interview, setInterview] = useState<InterviewMeta>(
    initialData?.interview ?? {
      intro: "",
      responseVisibility: "public",
      questions: [],
    }
  );
  const [linkedPaper, setLinkedPaper] = useState<PostLinkedPaper | null>(initialData?.linkedPaper ?? null);
  const [showPaperPicker, setShowPaperPicker] = useState(false);
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
    if (category === "resources" && imageUrls.length === 0) {
      toast.error("자료실 게시물은 첨부 파일이 1개 이상 필요합니다.");
      return;
    }
    if (category === "paper_review" && !linkedPaper) {
      toast.error("교육공학 논문 리뷰 게시판은 리뷰할 논문을 첨부해야 합니다.");
      return;
    }
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
    const paperPayload = category === "paper_review" && linkedPaper ? { linkedPaper } : { linkedPaper: undefined };
    try {
      if (mode === "edit" && initialData) {
        await updatePost({ id: initialData.id, data: { ...data, category, imageUrls, poll: poll ?? undefined, ...extra, ...paperPayload } });
        toast.success("게시글이 수정되었습니다.");
        if (onSubmitSuccess) {
          onSubmitSuccess();
        } else {
          router.push(`/board/${initialData.id}`);
        }
      } else {
        const created = await createPost({ ...data, category, imageUrls, poll: poll ?? undefined, ...extra, ...paperPayload }) as unknown as { id: string };
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
            paper_review: "/board/paper-review",
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
                    disabled={isEdit}
                    onClick={() => !isEdit && setCategory(cat)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      category === cat
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground",
                      isEdit && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              {isEdit ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  ⓘ 카테고리는 변경할 수 없습니다. 다른 카테고리에 작성하려면 새 글로 등록해 주세요.
                </p>
              ) : (
                !isAtLeast(user, "staff") && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    공지사항·홍보·자료실은 운영진 이상만 작성할 수 있습니다.
                  </p>
                )
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

          {/* 교육공학 논문 리뷰 — 첨부 논문 */}
          {category === "paper_review" && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
              <div className="flex items-center gap-2">
                <BookOpenCheck size={16} className="text-violet-700" />
                <p className="text-sm font-medium text-violet-800">리뷰할 논문 첨부</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                내 논문 읽기에 저장한 논문에서 가져오거나 메타데이터를 직접 입력하세요. 다른 회원이 이 글에서 논문을 자기 읽기 목록에 저장할 수 있습니다.
              </p>
              {linkedPaper ? (
                <div className="mt-3 rounded-lg border bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={linkedPaper.paperType === "thesis" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-blue-300 bg-blue-50 text-blue-700"}
                        >
                          {linkedPaper.paperType === "thesis"
                            ? linkedPaper.thesisLevel === "doctoral"
                              ? "박사논문"
                              : "석사논문"
                            : "학술논문"}
                        </Badge>
                        <span className="text-sm font-semibold">{linkedPaper.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[linkedPaper.authors, linkedPaper.year, linkedPaper.venue].filter(Boolean).join(" · ")}
                      </div>
                      {(linkedPaper.doi || linkedPaper.url) && (
                        <div className="text-xs text-muted-foreground">
                          {linkedPaper.doi && <span className="mr-2">DOI: {linkedPaper.doi}</span>}
                          {linkedPaper.url && (
                            <a href={linkedPaper.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              원문 링크
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowPaperPicker(true)}>
                        변경
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setLinkedPaper(null)}>
                        <X size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setShowPaperPicker(true)}>
                  <BookOpenCheck size={14} className="mr-1.5" />
                  논문 첨부하기
                </Button>
              )}
              <LinkedPaperPicker
                open={showPaperPicker}
                onOpenChange={setShowPaperPicker}
                userId={user?.id}
                onSelect={setLinkedPaper}
              />
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

          {/* 투표 (선택) — Sprint 76e: 사용자가 명시적으로 첨부할 때만 노출 */}
          {pollSectionOpen ? (
            <PollEditor
              value={poll}
              onChange={(v) => {
                setPoll(v);
                if (v === null) setPollSectionOpen(false);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setPollSectionOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/10 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-foreground"
            >
              <Plus size={14} />
              투표 첨부 (선택)
            </button>
          )}

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
